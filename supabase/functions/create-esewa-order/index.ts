// ════════════════════════════════════════════════════════════════
// create-esewa-order
//
// Called by the app when a signed-in tutor taps "Upgrade to Pro".
// Requires a valid Firebase ID token (Authorization: Bearer <token>).
//
// The client sends ONLY the plan identifier ("monthly" | "3month").
// The price is looked up SERVER-SIDE (PRODUCTS) so a tampered client
// cannot pay Rs 1 for a Rs 249 pass. The HMAC-SHA256 signature is
// generated here — the eSewa secret key never touches the client.
//
// Dual-mode:
//   { plan }        → creates a PENDING transaction ledger row, then
//                     returns the signed eSewa form fields (WebView)
//   { verify: data } → verifies a callback `data` payload (base64):
//                     1. HMAC signature check (payload genuinely
//                        signed by eSewa's secret)
//                     2. ledger lookup by transaction_uuid — replay
//                        protection (a uuid reconciles once, and only
//                        for the tutor who created it)
//                     3. amount + product-code cross-check vs what
//                        we signed
//                     4. server-to-server status check against
//                        eSewa's GET /api/epay/transaction/status/
//                        (the docs' anti-fraud step)
//                     Only after ALL checks pass is the transaction
//                     marked COMPLETE and the client allowed to grant.
//
// ⚠️ SANDBOX ONLY — merchant code EPAYTEST. Never point at live
// merchant credentials without an explicit, separate decision.
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  checkEsewaTransactionStatus,
  generateSignature,
  getEsewaConfig,
  isValidPlan,
  PRODUCTS,
  SIGNED_FIELD_NAMES,
  verifyCallbackSignature,
} from "../_shared/esewa.ts";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";
import { getSupabaseClient } from "../../ai/utils/supabaseClient.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 1. Authenticate — Firebase ID token (native Firebase Auth).
    const auth = await verifyFirebaseJwt(req);

    // 2. Parse + validate the body.
    let body: { plan?: string; verify?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // 3a. VERIFY mode — validate a callback `data` payload.
    if (typeof body.verify === "string" && body.verify.length > 0) {
      return await handleVerify(body.verify, auth.uid);
    }

    // 3b. ORDER mode — create a signed eSewa order.
    const { plan } = body;
    if (!plan || !isValidPlan(plan)) {
      return json(
        { error: `Invalid plan "${plan ?? ""}". Must be "monthly" or "3month".` },
        400,
      );
    }

    const product = PRODUCTS[plan];
    const amount = product.price;
    const taxAmount = 0;
    const serviceCharge = 0;
    const deliveryCharge = 0;
    const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

    // transaction_uuid: Date.now + random suffix (matches the working
    // reference project's format; alphanumeric + hyphen per the docs).
    const transactionUuid = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const esewa = getEsewaConfig();

    // Record the order in the transactions ledger BEFORE returning the
    // signed form. The uuid is the replay-protection anchor: the verify
    // path reconciles this exact row (ownership + one-time use).
    const supabase = getSupabaseClient();
    const { error: insertError } = await supabase.from("transactions").insert({
      transaction_uuid: transactionUuid,
      tutor_uid: auth.uid,
      plan,
      product_code: esewa.productCode,
      amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: "PENDING",
    });
    if (insertError) {
      console.error(
        "[create-esewa-order] failed to insert transaction:",
        insertError,
      );
      return json({ error: "Failed to create order — please try again" }, 500);
    }

    const signature = await generateSignature(
      totalAmount,
      transactionUuid,
      esewa.productCode,
      esewa.secretKey,
    );

    return json({
      amount: amount.toString(),
      tax_amount: taxAmount.toString(),
      total_amount: totalAmount.toString(),
      transaction_uuid: transactionUuid,
      product_code: esewa.productCode,
      product_service_charge: serviceCharge.toString(),
      product_delivery_charge: deliveryCharge.toString(),
      success_url: esewa.successUrl,
      failure_url: esewa.failureUrl,
      signed_field_names: SIGNED_FIELD_NAMES,
      signature,
      form_action_url: esewa.formUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.status);
    }
    console.error("[create-esewa-order] unhandled error:", err);
    return json({ error: "Payment server error. Please try again." }, 500);
  }
});

/** Full verification of an eSewa callback `data` payload. */
async function handleVerify(
  data: string,
  callerUid: string,
): Promise<Response> {
  const esewa = getEsewaConfig();

  // 1. HMAC signature check — proves the payload was signed with the
  //    eSewa secret (only eSewa and us hold it).
  const { valid, payload } = await verifyCallbackSignature(
    data,
    esewa.secretKey,
  );
  if (!valid) {
    return json({ valid: false, reason: "signature_mismatch", payload });
  }

  const transactionUuid = payload.transaction_uuid as string | undefined;
  const totalAmount = Number(payload.total_amount);
  const productCode = payload.product_code as string | undefined;

  if (!transactionUuid || !Number.isFinite(totalAmount) || !productCode) {
    return json({ valid: false, reason: "invalid_payload", payload });
  }

  const supabase = getSupabaseClient();

  // 2. Ledger lookup by transaction_uuid — the replay anchor. A
  //    transaction created in ORDER mode must exist for THIS flow.
  const { data: row, error: rowError } = await supabase
    .from("transactions")
    .select("*")
    .eq("transaction_uuid", transactionUuid)
    .maybeSingle();

  if (rowError || !row) {
    console.error(
      "[create-esewa-order] transaction not found:",
      transactionUuid,
      rowError,
    );
    // Same reason for unknown + foreign uuids — don't leak existence.
    return json({ valid: false, reason: "transaction_not_found", payload });
  }

  // 3. Ownership — only the tutor who created the order can reconcile it.
  if (row.tutor_uid !== callerUid) {
    return json({ valid: false, reason: "transaction_not_found", payload });
  }

  // 4. Idempotency — a replayed callback for an already-reconciled
  //    transaction reports success but does NOT re-grant (the client
  //    skips the grant when alreadyGranted is true).
  if (row.status === "COMPLETE") {
    return json({
      valid: true,
      alreadyGranted: true,
      transaction_uuid: transactionUuid,
      payload,
    });
  }

  // 5. Amount + product-code cross-check against what we signed.
  if (Number(row.total_amount) !== totalAmount) {
    await markFailed(supabase, transactionUuid, payload);
    return json({ valid: false, reason: "amount_mismatch", payload });
  }
  if (row.product_code !== productCode) {
    await markFailed(supabase, transactionUuid, payload);
    return json({ valid: false, reason: "product_code_mismatch", payload });
  }

  // 6. Server-to-server status check (documented GET endpoint) — the
  //    docs' anti-fraud step: the signed callback proves provenance,
  //    the status API proves the transaction actually completed on
  //    eSewa's side.
  let esewaStatus;
  try {
    esewaStatus = await checkEsewaTransactionStatus(
      esewa.statusUrl,
      productCode,
      totalAmount,
      transactionUuid,
    );
  } catch (err) {
    console.error(
      "[create-esewa-order] eSewa status API unavailable for",
      transactionUuid,
      err,
    );
    // Never auto-success when verification is unavailable — the client
    // shows an error; the user retries and the ledger row is still
    // PENDING (the uuid stays one-time-use).
    return json({ valid: false, reason: "status_check_unavailable", payload });
  }

  if (esewaStatus.status !== "COMPLETE") {
    await markFailed(supabase, transactionUuid, payload);
    return json({
      valid: false,
      reason: `esewa_status_${esewaStatus.status.toLowerCase()}`,
      payload,
    });
  }

  // 7. All checks passed — mark the ledger row COMPLETE (one-time use).
  await supabase
    .from("transactions")
    .update({
      status: "COMPLETE",
      esewa_ref_id:
        (payload.transaction_code as string | undefined) ??
        esewaStatus.refId ??
        null,
      raw_callback: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_uuid", transactionUuid);

  return json({
    valid: true,
    alreadyGranted: false,
    transaction_uuid: transactionUuid,
    payload,
  });
}

/** Mark a ledger row FAILED (bad amount/product/status). */
async function markFailed(
  supabase: ReturnType<typeof getSupabaseClient>,
  transactionUuid: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      status: "FAILED",
      raw_callback: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_uuid", transactionUuid);
  if (error) {
    console.error(
      "[create-esewa-order] failed to mark transaction FAILED:",
      transactionUuid,
      error,
    );
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
