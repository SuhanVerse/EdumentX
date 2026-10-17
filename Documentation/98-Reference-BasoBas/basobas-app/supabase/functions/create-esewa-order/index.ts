// ════════════════════════════════════════════════════════════════════
// create-esewa-order
//
// Called by the React Native app when a logged-in user taps "Buy"
// on a pass plan. Requires a valid Clerk JWT (auth: 'user').
//
// The client sends ONLY the plan identifier ("15day" or "30day").
// The price is looked up server-side from the products table to
// prevent tampering (a client cannot pay Rs 1 for a Rs 249 pass).
//
// Returns all fields the app needs to render the eSewa payment form
// in a WebView.
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import {
  generateSignature,
  getEsewaConfig,
  isValidPlan,
  PRODUCTS,
  SIGNED_FIELD_NAMES,
} from "../_shared/esewa.ts";
import { verifyClerkJwt } from "../_shared/auth.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    // ── 1. Manually verify the Clerk JWT ───────────────────────────
    // withSupabase({ auth: 'user' }) cannot verify raw Clerk tokens.
    // We verify them manually using Clerk's JWKS endpoint via `jose`.
    let clerkId: string;
    try {
      clerkId = await verifyClerkJwt(req);
    } catch (err) {
      console.error("Clerk JWT verification failed:", err);
      return Response.json(
        { error: "Unauthorized — invalid or missing session token" },
        { status: 401 },
      );
    }

    // ── 2. Parse and validate the request body ──────────────────────
    let body: { plan?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { plan } = body;
    if (!plan || !isValidPlan(plan)) {
      return Response.json(
        {
          error: `Invalid plan "${plan ?? ""}". Must be "15day" or "30day".`,
        },
        { status: 400 },
      );
    }

    // ── 3. Look up price from server-side source of truth ───────────
    const product = PRODUCTS[plan];
    const amount = product.price;
    const taxAmount = 0;
    const serviceCharge = 0;
    const deliveryCharge = 0;
    const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

    // ── 4. Generate a unique transaction UUID ───────────────────────
    // This UUID is sent to eSewa and used to reconcile the callback.
    // Using Date.now() + random suffix to match the working recurrly project's format.
    const transactionUuid = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // ── 5. Get eSewa configuration ──────────────────────────────────
    const esewa = getEsewaConfig();

    // ── 6. Insert a PENDING transaction row ─────────────────────────
    // Using ctx.supabaseAdmin (service role) to bypass RLS.
    // The user can only read their own transactions via RLS.
    const { data: transaction, error: insertError } = await ctx.supabaseAdmin
      .from("transactions")
      .insert({
        clerk_id: clerkId,
        product_id: product.id,
        transaction_uuid: transactionUuid,
        amount: amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: "PENDING",
      })
      .select("*")
      .single();

    if (insertError || !transaction) {
      console.error("Failed to insert transaction:", insertError);
      return Response.json({ error: "Failed to create order — please try again" }, { status: 500 });
    }

    // ── 7. Generate the eSewa HMAC-SHA256 signature ─────────────────
    // The field order in the base string MUST match SIGNED_FIELD_NAMES
    const signature = await generateSignature(
      totalAmount,
      transactionUuid,
      esewa.productCode,
      esewa.secretKey,
    );

    // ── 8. Return everything the app needs to POST the eSewa form ───
    // The app opens esewa.formUrl in a WebView and POSTs these fields.
    //
    // Security note: signature and transaction_uuid are safe to expose.
    // The signature can only be generated server-side (secret key is never
    // exposed to the client). transaction_uuid is a UUID — it authorizes
    // nothing on its own.
    //
    // Amounts are returned as strings to match the working recurrly project.
    return Response.json({
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
      // The form action URL is included so the app knows where to POST
      form_action_url: esewa.formUrl,
    });
  }),
};
