// ════════════════════════════════════════════════════════════════════
// eSewa v2 (Test/UAT) — Shared Utilities
//
// This file provides HMAC-SHA256 signing, callback verification,
// server-to-server status checking, and product/price definitions.
//
// ⚠️ eSewa signature field order is CRITICAL
//    The base string must be: "total_amount=<val>,transaction_uuid=<val>,product_code=<val>"
//    in that exact order, which matches signed_field_names.
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ─── Product Pricing (Server-Side Source of Truth) ────────────────────
// The client NEVER sends the amount. It sends a plan identifier, and
// the Edge Function looks up the authoritative price here.
// This prevents a tampered client from paying an arbitrary amount.

export const PRODUCTS = {
  "15day": {
    id: "15day",
    name: "15-Day Pass",
    price: 149.0,
    durationDays: 15,
  },
  "30day": {
    id: "30day",
    name: "30-Day Pass",
    price: 249.0,
    durationDays: 30,
  },
} as const;

export type PlanId = keyof typeof PRODUCTS;

/**
 * Validate that a plan identifier is one of the allowed values.
 */
export function isValidPlan(plan: string): plan is PlanId {
  return plan === "15day" || plan === "30day";
}

// ─── eSewa Configuration (from environment variables) ─────────────────

export function getEsewaConfig() {
  const formUrl = Deno.env.get("ESEWA_FORM_URL");
  const statusUrl = Deno.env.get("ESEWA_STATUS_URL");
  const productCode = Deno.env.get("ESEWA_PRODUCT_CODE");
  const secretKey = Deno.env.get("ESEWA_SECRET_KEY");
  const successUrl = Deno.env.get("SUCCESS_URL");
  const failureUrl = Deno.env.get("FAILURE_URL");

  if (!formUrl || !statusUrl || !productCode || !secretKey || !successUrl || !failureUrl) {
    throw new Error("Missing one or more ESEWA_* environment variables");
  }

  return { formUrl, statusUrl, productCode, secretKey, successUrl, failureUrl };
}

/**
 * The signed field names sent to eSewa.
 * This exact string must match the fields and order used in generateSignature.
 */
export const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";

// ─── HMAC-SHA256 Signing ─────────────────────────────────────────────
// eSewa signature generation:
//   base_string = "total_amount=<total_amount>,transaction_uuid=<transaction_uuid>,product_code=<product_code>"
//   signature   = Base64(HMAC_SHA256(base_string, secret_key))
//
// Uses Deno's Web Crypto API (crypto.subtle) — no external crypto libs needed.

/**
 * Generate an eSewa HMAC-SHA256 signature.
 *
 * @param totalAmount - The total amount (amount + tax + service + delivery)
 * @param transactionUuid - Unique UUID for this transaction
 * @param productCode - eSewa merchant product code (e.g. "EPAYTEST")
 * @param secretKey - eSewa secret key
 * @returns Base64-encoded HMAC-SHA256 signature
 */
export async function generateSignature(
  totalAmount: number,
  transactionUuid: string,
  productCode: string,
  secretKey: string,
): Promise<string> {
  // The field order MUST match SIGNED_FIELD_NAMES exactly
  const baseString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));

  // ArrayBuffer → Base64
  return arrayBufferToBase64(signature);
}

/**
 * Verify an eSewa callback payload.
 *
 * Steps:
 * 1. Decode the Base64 `data` parameter → JSON
 * 2. Read `signed_field_names` from the decoded payload to know which fields
 *    were signed and in what order
 * 3. Rebuild the signed base string from those fields
 * 4. Recompute the HMAC-SHA256 and compare to the `signature` in the payload
 *
 * @param data - The Base64-encoded JSON payload from eSewa's redirect
 * @param secretKey - eSewa secret key
 * @returns Object with `valid` boolean and the decoded `payload`
 */
export async function verifyCallbackSignature(
  data: string,
  secretKey: string,
): Promise<{ valid: boolean; payload: Record<string, string> }> {
  // Step 1: Decode Base64 → JSON
  let decoded: string;
  try {
    decoded = atob(data);
  } catch {
    return { valid: false, payload: {} };
  }

  let payload: Record<string, string>;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return { valid: false, payload: {} };
  }

  // Step 2: Read the signed field names from the payload itself
  // eSewa returns the field names it signed, so the order is authoritative
  const fieldNames = (payload.signed_field_names as string)?.split(",");
  if (!fieldNames || fieldNames.length === 0) {
    return { valid: false, payload };
  }

  // Step 3: Rebuild the signed base string in the exact order specified
  const signedParts = fieldNames.map((f) => `${f}=${payload[f] ?? ""}`);
  const baseString = signedParts.join(",");

  // Step 4: Recompute HMAC and compare
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const computedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  const computedBase64 = arrayBufferToBase64(computedSig);
  const valid = computedBase64 === payload.signature;

  return { valid, payload };
}

/**
 * Check transaction status with eSewa server-to-server API.
 *
 * eSewa status-check endpoint (GET):
 *   /api/epay/transaction/status/?product_code=...&total_amount=...&transaction_uuid=...
 *
 * @returns The status and ref_id from eSewa
 */
export async function checkEsewaTransactionStatus(
  statusUrl: string,
  productCode: string,
  totalAmount: number,
  transactionUuid: string,
): Promise<{ status: string; refId?: string; totalAmount?: number }> {
  const url = `${statusUrl}?product_code=${encodeURIComponent(productCode)}&total_amount=${totalAmount}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `eSewa status check failed: ${response.status} ${response.statusText}`,
    );
  }

  const result = await response.json();
  return {
    status: result.status as string,
    refId: result.ref_id as string | undefined,
    totalAmount: result.total_amount ? Number(result.total_amount) : undefined,
  };
}

// ─── Pass Granting (Shared between verify-callback and polling) ───────
// Extracted to avoid duplicating pass-stacking logic across functions.

/**
 * Grant a pass to a user with stacking support.
 *
 * If the user already has an ACTIVE pass that hasn't expired, the new
 * pass starts at the existing pass's expires_at (stacking) rather than
 * starting from now.
 *
 * @param supabaseAdmin - The Supabase admin client for writes
 * @param clerkId - Clerk user ID
 * @param productId - Product/plan ID ("15day" | "30day")
 * @param transactionId - UUID of the COMPLETE transaction
 * @param durationDays - How many days this pass lasts
 * @returns The created user_pass row, or throws on error
 */
export async function grantUserPass(
  supabaseAdmin: any,
  clerkId: string,
  productId: string,
  transactionId: string,
  durationDays: number,
): Promise<Record<string, unknown>> {
  const now = new Date();
  let startsAt = now;

  // Check if the user has an existing ACTIVE pass to stack on top of
  const { data: activePass } = await supabaseAdmin
    .from("user_passes")
    .select("*")
    .eq("clerk_id", clerkId)
    .eq("status", "ACTIVE")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activePass && new Date(activePass.expires_at) > now) {
    startsAt = new Date(activePass.expires_at);
  }

  // Calculate the new expiry by adding duration_days from start
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { data: pass, error } = await supabaseAdmin
    .from("user_passes")
    .insert({
      clerk_id: clerkId,
      product_id: productId,
      transaction_id: transactionId,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "ACTIVE",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to grant user pass: ${error.message}`);
  }

  return pass;
}


// ─── Internal Helpers ─────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
