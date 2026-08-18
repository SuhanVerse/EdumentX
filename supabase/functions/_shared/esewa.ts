// ════════════════════════════════════════════════════════════════
// eSewa v2 (Test/UAT) — Shared Utilities
//
// Ported from the BasoBas reference project (see
// Documentation/98-Reference-BasoBas/). HMAC-SHA256 signing,
// callback verification, and server-to-server status checking.
//
// ⚠️ SANDBOX ONLY — merchant code `EPAYTEST` + the matching sandbox
// secret key. This must never be pointed at live merchant
// credentials without an explicit, separate decision (see
// Documentation/04-Advanced-Features.md).
//
// ⚠️ eSewa signature field order is CRITICAL: the base string must
// be "total_amount=<val>,transaction_uuid=<val>,product_code=<val>"
// in that exact order, which matches signed_field_names.
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ─── Product Pricing (Server-Side Source of Truth) ───────────────
// The client NEVER sends the amount. It sends a plan identifier, and
// the Edge Function looks up the authoritative price here. This
// prevents a tampered client from paying an arbitrary amount.

export const PRODUCTS = {
  monthly: {
    id: "monthly",
    name: "Pro — Monthly",
    price: 249.0,
    durationMonths: 1,
  },
  "3month": {
    id: "3month",
    name: "Pro — 3 Months",
    price: 549.0,
    durationMonths: 3,
  },
} as const;

export type PlanId = keyof typeof PRODUCTS;

/** Validate that a plan identifier is one of the allowed values. */
export function isValidPlan(plan: string): plan is PlanId {
  return plan === "monthly" || plan === "3month";
}

// ─── eSewa Configuration (from environment variables) ─────────────

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

/** The signed field names sent to eSewa. This exact string must match
 *  the fields and order used in generateSignature. */
export const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";

// ─── HMAC-SHA256 Signing ──────────────────────────────────────────
// eSewa signature generation:
//   base_string = "total_amount=<total_amount>,transaction_uuid=<transaction_uuid>,product_code=<product_code>"
//   signature   = Base64(HMAC_SHA256(base_string, secret_key))
//
// Uses Deno's Web Crypto API (crypto.subtle) — no external crypto libs.

export async function generateSignature(
  totalAmount: number,
  transactionUuid: string,
  productCode: string,
  secretKey: string,
): Promise<string> {
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

  return arrayBufferToBase64(signature);
}

/** Verify an eSewa callback payload:
 *  1. Normalize the (possibly URL-safe / URL-encoded) base64 `data`
 *     parameter and decode it → JSON
 *  2. Read `signed_field_names` from the decoded payload (order is authoritative)
 *  3. Rebuild the signed base string from the RAW JSON text values
 *     (see `rawJsonValue` — a parsed number re-stringifies "1000.0"
 *     as "1000" and breaks the HMAC)
 *  4. Recompute the HMAC-SHA256 and compare to the `signature`
 */
export async function verifyCallbackSignature(
  data: string,
  secretKey: string,
): Promise<{ valid: boolean; payload: Record<string, unknown> }> {
  let decoded: string;
  try {
    decoded = atob(normalizeBase64(data));
  } catch {
    return { valid: false, payload: {} };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return { valid: false, payload: {} };
  }

  const fieldNames = (payload.signed_field_names as string)?.split(",");
  if (!fieldNames || fieldNames.length === 0) {
    return { valid: false, payload };
  }

  // Rebuild the signed base string from the RAW decoded JSON text —
  // never from re-stringified parsed values. eSewa's response JSON
  // serializes numbers like `1000.0`; `String(1000.0)` yields "1000"
  // and the recomputed HMAC would not match eSewa's.
  const signedParts = fieldNames.map((f) => {
    const raw = rawJsonValue(decoded, f);
    return `${f}=${raw ?? ""}`;
  });
  const baseString = signedParts.join(",");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));

  return {
    valid: arrayBufferToBase64(expected) === payload.signature,
    payload,
  };
}

/** Server-to-server status check against eSewa's status API.
 *
 *  Per the official docs (developer.esewa.com.np/pages/Epay-V2 §Status
 *  Check) this is a GET:
 *
 *    /api/epay/transaction/status/?product_code=...&total_amount=...&transaction_uuid=...
 *
 *  No signature, no body — the merchant confirms a transaction's real
 *  state on eSewa's side (the anti-replay safeguard: the signed
 *  callback proves the payload came from eSewa, the status API proves
 *  the transaction actually happened). */
export async function checkEsewaTransactionStatus(
  statusUrl: string,
  productCode: string,
  totalAmount: number,
  transactionUuid: string,
): Promise<{ status: string; refId?: string; totalAmount?: number }> {
  const url =
    `${statusUrl}?product_code=${encodeURIComponent(productCode)}` +
    `&total_amount=${totalAmount}` +
    `&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `eSewa status check failed: ${response.status} ${response.statusText}`,
    );
  }

  const result = (await response.json()) as {
    status?: string;
    ref_id?: string;
    total_amount?: number | string;
  };

  return {
    status: result.status ?? "UNKNOWN",
    refId: result.ref_id,
    totalAmount:
      result.total_amount !== undefined
        ? Number(result.total_amount)
        : undefined,
  };
}

/** Normalize a base64 payload that arrived through a URL redirect:
 *  eSewa's `data` param may be URL-encoded (%2B/%2F/%3D), may use
 *  URL-safe base64 (-/_ instead of +/), or may have lost padding.
 *  Converts everything back to standard base64 with padding. */
export function normalizeBase64(data: string): string {
  let out = data
    .replace(/%2B/gi, "+")
    .replace(/%2F/gi, "/")
    .replace(/%3D/gi, "=")
    .replace(/\s/g, "+")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  while (out.length % 4 !== 0) out += "=";
  return out;
}

/** Extract a field's literal value text from a JSON document — the
 *  exact characters the serializer wrote (so `"total_amount": 1000.0`
 *  yields "1000.0", not the JS number 1000). String values come back
 *  unquoted/unescaped; returns null when the key is absent. */
function rawJsonValue(jsonText: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `"${escaped}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|[^\\s,}]+)`,
  );
  const m = pattern.exec(jsonText);
  if (!m) return null;
  let raw = m[1];
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return raw;
}

/** ArrayBuffer → Base64 (no Buffer in the Deno edge runtime). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
