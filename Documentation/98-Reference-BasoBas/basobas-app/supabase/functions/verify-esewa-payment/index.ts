// ════════════════════════════════════════════════════════════════════
// verify-esewa-payment
//
// Called by eSewa's redirect after a successful payment.
// eSewa redirects the browser to {success_url}?data=<base64>.
//
// ⚠️ CRITICAL SECURITY: Do NOT trust the redirect alone — the
//    `data` param is fully client-controlled and could be forged.
//    This function performs TWO independent verifications:
//      1. HMAC signature verification — confirms the payload was
//         genuinely signed by eSewa (or at least someone with the
//         secret key — which only eSewa and we have).
//      2. Server-to-server status check — hits eSewa's own API to
//         confirm the transaction is truly COMPLETE on their side.
//
// Only after BOTH checks pass is the user_pass granted.
//
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import {
  checkEsewaTransactionStatus,
  getEsewaConfig,
  grantUserPass,
  verifyCallbackSignature,
} from "../_shared/esewa.ts";

function extractDataParam(searchParams: URLSearchParams, body: Record<string, string>): string | null {
  return searchParams.get("data") ?? body["data"] ?? null;
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    const obj: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      obj[k] = String(v);
    }
    return obj;
  }
  if (ct.includes("application/json")) {
    const json = await req.json();
    return typeof json === "object" && json !== null ? json : {};
  }
  return {};
}

export default {
  fetch: withSupabase({ auth: ["none"] }, async (req, ctx) => {
    // ── 1. Extract the Base64 data param (query string OR POST body) ─
    const url = new URL(req.url);
    const body = req.method === "POST" ? await parseBody(req) : {};
    const rawData = extractDataParam(url.searchParams, body);

    console.log(
      `[verify-esewa-payment] ${req.method} ${req.url} | dataPresent=${rawData ? "yes" : "NO"} | rawDataLen=${rawData?.length ?? 0} | bodyKeys=${Object.keys(body).join(",") || "none"}`,
    );

    if (!rawData) {
      console.error("verify-esewa-payment: missing 'data' param");
      return Response.redirect("basobas://payment-failed?reason=missing_data", 302);
    }

    // ── 2. Normalize base64 data ─────────────────────────────────────
    let data = rawData.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
    while (data.length % 4 !== 0) data += "=";

    console.log(
      `[verify-esewa-payment] normalisedData=${data.slice(0, 80)}...`,
    );

    // ── 3. Decode and parse the payload ──────────────────────────────
    let decoded: string;
    let payload: Record<string, string>;
    try {
      decoded = atob(data);
    } catch (e) {
      console.error(`verify-esewa-payment: atob failed for data=${data.slice(0, 80)}`, e);
      return Response.redirect("basobas://payment-failed?reason=invalid_payload", 302);
    }

    try {
      payload = JSON.parse(decoded);
    } catch (e) {
      console.error(`verify-esewa-payment: JSON.parse failed for decoded=${decoded.slice(0, 80)}`, e);
      return Response.redirect("basobas://payment-failed?reason=invalid_payload", 302);
    }

    console.log(
      `[verify-esewa-payment] parsedPayloadKeys=${Object.keys(payload).join(",")} | hasSignature=${!!payload.signature}`,
    );

    // ── 4. Verify the HMAC signature ────────────────────────────────
    const esewa = getEsewaConfig();
    const { valid } = await verifyCallbackSignature(data, esewa.secretKey, payload);

    if (!valid) {
      console.error(
        "SIGNATURE MISMATCH — possible tampering attempt. payload keys:",
        Object.keys(payload).join(","),
      );
      return Response.redirect("basobas://payment-failed?reason=signature_mismatch", 302);
    }

    // Extract verified fields from the decoded payload
    const transactionUuid = payload.transaction_uuid as string;
    const totalAmount = Number(payload.total_amount);
    const productCode = payload.product_code as string;
    const esewaRefId = payload.transaction_code as string;

    if (!transactionUuid || !totalAmount || !productCode) {
      console.error("Callback payload missing required fields:", JSON.stringify(payload));
      return Response.redirect("basobas://payment-failed?reason=invalid_payload", 302);
    }

    // ── 5. Look up the local transaction row ────────────────────────
    const { data: transaction, error: lookupError } = await ctx.supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("transaction_uuid", transactionUuid)
      .single();

    if (lookupError || !transaction) {
      console.error(`Transaction not found for UUID: ${transactionUuid}`, lookupError);
      return Response.redirect(`basobas://payment-failed?reason=transaction_not_found&transaction_uuid=${transactionUuid}`, 302);
    }

    // ── 6. Idempotency check ────────────────────────────────────────
    if (transaction.status === "COMPLETE") {
      console.log(`Transaction ${transactionUuid} already COMPLETE — returning success`);
      return Response.redirect(`basobas://payment-success?transaction_uuid=${transactionUuid}`, 302);
    }

    // ── 7. Verify that amounts match what we stored ─────────────────
    if (Number(transaction.total_amount) !== totalAmount) {
      console.error(
        `AMOUNT MISMATCH — stored=${transaction.total_amount}, callback=${totalAmount}. ` +
        `Transaction UUID: ${transactionUuid}`,
      );
      await markFailed(ctx.supabaseAdmin, transactionUuid, payload);
      return Response.redirect(`basobas://payment-failed?reason=amount_mismatch&transaction_uuid=${transactionUuid}`, 302);
    }

    if (productCode !== esewa.productCode) {
      console.error(
        `PRODUCT CODE MISMATCH — expected=${esewa.productCode}, callback=${productCode}`,
      );
      await markFailed(ctx.supabaseAdmin, transactionUuid, payload);
      return Response.redirect(`basobas://payment-failed?reason=product_code_mismatch&transaction_uuid=${transactionUuid}`, 302);
    }

    // ── 8. Server-to-server status check with eSewa ─────────────────
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
        `eSewa status check API call failed for ${transactionUuid}:`,
        err,
      );
      return Response.redirect(`basobas://payment-failed?reason=status_check_unavailable&transaction_uuid=${transactionUuid}`, 302);
    }

    if (esewaStatus.status !== "COMPLETE") {
      console.error(
        `eSewa status check returned "${esewaStatus.status}" (not COMPLETE) ` +
        `for transaction ${transactionUuid}`,
      );
      await markFailed(ctx.supabaseAdmin, transactionUuid, payload);
      return Response.redirect(`basobas://payment-failed?reason=esewa_status_${esewaStatus.status.toLowerCase()}&transaction_uuid=${transactionUuid}`, 302);
    }

    if (esewaStatus.totalAmount && esewaStatus.totalAmount !== totalAmount) {
      console.error(
        `AMOUNT MISMATCH from eSewa status check — ` +
        `expected=${totalAmount}, got=${esewaStatus.totalAmount}`,
      );
      await markFailed(ctx.supabaseAdmin, transactionUuid, payload);
      return Response.redirect(`basobas://payment-failed?reason=amount_mismatch&transaction_uuid=${transactionUuid}`, 302);
    }

    // ── 9. All checks passed — look up product for duration ─────────
    const { data: product, error: productError } = await ctx.supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", transaction.product_id)
      .single();

    if (productError || !product) {
      console.error(
        `Product not found for ID: ${transaction.product_id}`,
        productError,
      );
      return Response.redirect(`basobas://payment-failed?reason=product_not_found&transaction_uuid=${transactionUuid}`, 302);
    }

    // ── 10. Mark transaction as COMPLETE ─────────────────────────────
    await ctx.supabaseAdmin
      .from("transactions")
      .update({
        status: "COMPLETE",
        esewa_ref_id: esewaRefId,
        raw_callback: payload,
      })
      .eq("transaction_uuid", transactionUuid);

    // ── 11. Grant the user pass (with stacking support) ──────────────
    try {
      await grantUserPass(
        ctx.supabaseAdmin,
        transaction.clerk_id,
        product.id,
        transaction.id,
        product.duration_months,
      );
    } catch (passError) {
      console.error(
        `CRITICAL: Transaction ${transactionUuid} is COMPLETE but user_pass NOT created. ` +
        `Clerk ID: ${transaction.clerk_id}. Manual intervention required.`,
        passError,
      );
    }

    // ── 12. Redirect back to app with success ───────────────────────
    return Response.redirect(`basobas://payment-success?transaction_uuid=${transactionUuid}`, 302);
  }),
};

// ─── Helper: Mark a transaction as FAILED ────────────────────────────

async function markFailed(
  supabaseAdmin: any,
  transactionUuid: string,
  payload: Record<string, string>,
) {
  try {
    await supabaseAdmin
      .from("transactions")
      .update({
        status: "FAILED",
        raw_callback: payload,
      })
      .eq("transaction_uuid", transactionUuid);
  } catch (err) {
    console.error(`Failed to mark transaction ${transactionUuid} as FAILED:`, err);
  }
}
