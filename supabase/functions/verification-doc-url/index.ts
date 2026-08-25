// ════════════════════════════════════════════════════════════════
// verification-doc-url
//
// Mints SHORT-LIVED (10 min) signed read URLs for objects in the
// `private-verification-docs` Supabase Storage bucket, replacing the
// old permanent public URLs (Aug 24 audit CRITICAL: the bucket was
// public-read with guessable `{uid}/{kind}.{ext}` keys — anyone who
// learned a Firebase uid could fetch that user's citizenship scan).
//
// Authorization (derived SERVER-SIDE from the object path — the
// client cannot choose its privilege):
//   path `{uid}/citizenship|certificate|….{ext}`
//     → only THAT uid (owner) or an admin (custom claim admin:true)
//   path `{uid}/demo.{ext}` (tutor intro video, shown on the public
//   details screen)
//     → any signed-in user
//
// Requires SUPABASE_SERVICE_ROLE_KEY (service role bypasses storage
// RLS to sign) and FIREBASE_PRODUCT_ID/FIREBASE_PROJECT_ID.
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "private-verification-docs";
const SIGNED_URL_TTL_SECONDS = 600;
/** Path shape: `{uid}/{kind}.{ext}` */
const PATH_RE = /^([A-Za-z0-9:_-]+)\/([A-Za-z0-9_-]+)\.[A-Za-z0-9]{1,8}$/;
/** Kinds any signed-in user may view (non-PII media). */
const PUBLIC_KINDS = new Set(["demo"]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 1. Authenticate.
    const auth = await verifyFirebaseJwt(req);

    // 2. Validate body.
    const body = await req.json().catch(() => null);
    const path = (body as { path?: unknown } | null)?.path;
    if (typeof path !== "string" || !PATH_RE.test(path)) {
      return json({ error: "Invalid doc path" }, 400);
    }
    const [, ownerUid, kind] = PATH_RE.exec(path)!;

    // 3. Authorize — derived from the PATH, not the request body.
    // Admin authority = the seedAdmin-minted custom claim (see
    // firebase/firestore.rules isAdmin()).
    const tokenAdmin = auth.claims.admin === true;
    const isOwner = auth.uid === ownerUid;
    let allowed = false;
    if (isOwner || tokenAdmin) {
      allowed = true;
    } else if (PUBLIC_KINDS.has(kind)) {
      allowed = true;
    }
    if (!allowed) {
      // Same generic reason for foreign + forbidden — no existence leak.
      return json({ error: "Not allowed" }, 403);
    }

    // 4. Mint a short-lived signed URL via raw Storage REST using a
    // JWT service key (role=service_role).
    //   * STORAGE_SERVICE_JWT holds the legacy JWT key because the
    //     platform-injected SUPABASE_SERVICE_ROLE_KEY may be the new
    //     opaque sb_secret_… format, which the storage gateway
    //     rejects ("Invalid Compact JWS").
    //   * Raw REST (not supabase-js) — verified working end-to-end.
    const serviceKey = Deno.env.get("STORAGE_SERVICE_JWT")
      ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error("[verification-doc-url] no service key configured");
      return json({ error: "Server not configured" }, 500);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      console.error("[verification-doc-url] SUPABASE_URL unset");
      return json({ error: "Server not configured" }, 500);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const signRes = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));

    if (!signRes.ok) {
      const t = await signRes.text();
      console.error(
        "[verification-doc-url] sign failed:",
        signRes.status,
        t.slice(0, 200),
      );
      return json(
        { error: "Could not sign document URL", upstreamStatus: signRes.status },
        502,
      );
    }
    const signed = (await signRes.json()) as { signedURL?: string };
    if (!signed.signedURL) {
      return json({ error: "Could not sign document URL" }, 502);
    }
    // The storage API returns a relative signedURL (`/object/sign/…`);
    // absolutize it.
    const absolute = signed.signedURL.startsWith("http")
      ? signed.signedURL
      : `${supabaseUrl}${signed.signedURL}`;
    return json({
      url: absolute,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.status);
    }
    console.error("[verification-doc-url] unhandled error:", err);
    return json({ error: "Server error" }, 500);
  }
});
