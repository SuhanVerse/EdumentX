// ════════════════════════════════════════════════════════════════════
// esewa-payment-failed
//
// Called by eSewa's redirect when a payment is canceled or fails.
// eSewa redirects the browser to {failure_url}?data=<base64>.
//
// This function marks the matching transaction as FAILED (only if it
// is still PENDING — never overwrite a COMPLETE status), then returns
// a 302 redirect to basobas://payment-failed for the WebView to
// intercept.
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

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
    // ── 1. Extract Base64 data param (query string OR POST body) ────
    const url = new URL(req.url);
    const body = req.method === "POST" ? await parseBody(req) : {};
    const data = extractDataParam(url.searchParams, body);

    console.log(
      `[esewa-payment-failed] ${req.method} ${req.url} | data=${data ? "present" : "MISSING"} | bodyKeys=${Object.keys(body).join(",") || "none"}`,
    );

    if (!data) {
      console.log("esewa-payment-failed: no data param — payment did not complete on eSewa");
      return Response.redirect("basobas://payment-failed?reason=cancelled", 302);
    }

    // ── 2. Decode the callback payload ─────────────────────────────
    let decoded: string;
    let payload: Record<string, string>;

    try {
      decoded = atob(data);
      payload = JSON.parse(decoded);
    } catch {
      console.error("esewa-payment-failed: invalid Base64/JSON in data param");
      return Response.redirect("basobas://payment-failed?reason=invalid_payload", 302);
    }

    const transactionUuid = payload.transaction_uuid as string;

    if (!transactionUuid) {
      console.error("esewa-payment-failed: no transaction_uuid in payload");
      return Response.redirect("basobas://payment-failed?reason=missing_transaction_uuid", 302);
    }

    // ── 3. Look up and mark the transaction as FAILED ───────────────
    const { error: updateError } = await ctx.supabaseAdmin
      .from("transactions")
      .update({
        status: "FAILED",
        raw_callback: payload,
      })
      .eq("transaction_uuid", transactionUuid)
      .eq("status", "PENDING");

    if (updateError) {
      console.error(
        `Failed to mark transaction ${transactionUuid} as FAILED:`,
        updateError,
      );
    }

    // ── 4. Return failure HTML page ─────────────────────────────────
    return Response.redirect(`basobas://payment-failed?reason=failed&transaction_uuid=${transactionUuid}`, 302);
  }),
};
