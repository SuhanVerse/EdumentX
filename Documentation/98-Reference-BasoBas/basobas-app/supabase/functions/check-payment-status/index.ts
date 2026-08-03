// ════════════════════════════════════════════════════════════════════
// check-payment-status (optional — for polling/fallback)
//
// The React Native app can poll this if the WebView-callback flow
// is unreliable on some devices (React Native WebViews sometimes
// swallow redirects).
//
// If the local transaction is still PENDING past a reasonable threshold
// (e.g. 10 minutes), this function calls the eSewa status-check API
// directly and updates the local state accordingly, reusing the same
// verification logic as verify-esewa-payment.
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import {
  checkEsewaTransactionStatus,
  getEsewaConfig,
  grantUserPass,
} from "../_shared/esewa.ts";
import { verifyClerkJwt } from "../_shared/auth.ts";

// If a transaction stays PENDING longer than this, do a server-side
// status check with eSewa rather than just returning the local status.
const PENDING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

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

    // ── 2. Parse request body ──────────────────────────────────────
    let body: { transaction_uuid?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { transaction_uuid: transactionUuid } = body;
    if (!transactionUuid) {
      return Response.json(
        { error: "Missing required field: transaction_uuid" },
        { status: 400 },
      );
    }

    // ── 3. Look up the transaction ──────────────────────────────────
    const { data: transaction, error: lookupError } = await ctx.supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("transaction_uuid", transactionUuid)
      .eq("clerk_id", clerkId)  // Ensure the user owns this transaction
      .single();

    if (lookupError || !transaction) {
      return Response.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // ── 4. If already resolved, return current status ───────────────
    if (transaction.status !== "PENDING") {
      return Response.json({
        status: transaction.status,
        transaction_uuid: transactionUuid,
        esewa_ref_id: transaction.esewa_ref_id,
      });
    }

    // ── 5. Still PENDING — check if we should verify with eSewa ─────
    const createdAt = new Date(transaction.created_at).getTime();
    const elapsed = Date.now() - createdAt;

    if (elapsed < PENDING_THRESHOLD_MS) {
      // Too soon to check with eSewa — return that it's still pending
      return Response.json({
        status: "PENDING",
        transaction_uuid: transactionUuid,
        note: "Still pending. Try again later for server-side verification.",
      });
    }

    // ── 6. Past threshold — verify with eSewa server-to-server ──────
    const esewa = getEsewaConfig();
    const totalAmount = Number(transaction.total_amount);

    let esewaStatus;
    try {
      esewaStatus = await checkEsewaTransactionStatus(
        esewa.statusUrl,
        esewa.productCode,
        totalAmount,
        transactionUuid,
      );
    } catch (err) {
      console.error(
        `check-payment-status: eSewa API call failed for ${transactionUuid}:`,
        err,
      );
      return Response.json({
        status: "PENDING",
        transaction_uuid: transactionUuid,
        note: "Could not verify with eSewa — transient error, retry later.",
      });
    }

    // ── 7. Process the eSewa status response ────────────────────────
    if (esewaStatus.status === "COMPLETE") {
      // eSewa says COMPLETE — grant the pass
      const { data: product } = await ctx.supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", transaction.product_id)
        .single();

      // Mark transaction COMPLETE
      await ctx.supabaseAdmin
        .from("transactions")
        .update({
          status: "COMPLETE",
          esewa_ref_id: esewaStatus.refId,
        })
        .eq("transaction_uuid", transactionUuid);

      // Grant pass with stacking (using the shared helper)
      if (product) {
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
      }

      return Response.json({
        status: "COMPLETE",
        transaction_uuid: transactionUuid,
        esewa_ref_id: esewaStatus.refId,
      });
    }

    // eSewa says something other than COMPLETE — mark as FAILED
    if (esewaStatus.status !== "PENDING") {
      await ctx.supabaseAdmin
        .from("transactions")
        .update({ status: "FAILED" })
        .eq("transaction_uuid", transactionUuid);

      return Response.json({
        status: "FAILED",
        transaction_uuid: transactionUuid,
        esewa_status: esewaStatus.status,
      });
    }

    // Still PENDING on eSewa's side too
    return Response.json({
      status: "PENDING",
      transaction_uuid: transactionUuid,
      note: "Still pending on eSewa's side.",
    });
  }),
};
