// ════════════════════════════════════════════════════════════════
// upload-verification-doc
//
// Server-side upload gateway for tutor verification documents
// (defense-in-depth follow-up to the Aug 24/25 storage audit).
//
// WHY THIS EXISTS:
//   The app authenticates via FIREBASE, so Supabase's auth.uid() is
//   always NULL at the storage layer — RLS cannot bind an upload to
//   its owner. The previous anon-write policies therefore had to be
//   bucket-scoped: any holder of the anon key could overwrite another
//   user's object by guessing `{victimUid}/id.jpg`. This function
//   closes that hole completely:
//
//     * The uid is taken from the VERIFIED FIREBASE JWT — never from
//       the request body. Path isolation is enforced server-side.
//     * The kind is validated against an allow-list; the extension is
//       derived from the file's Content-Type, not client input.
//     * Writes use the SERVICE role, so the storage-layer anon write
//       policies can be dropped entirely (migration 017).
//
// Contract:
//   POST multipart/form-data
//     Authorization: Bearer <Firebase ID token>
//     fields: kind   — one of id | education | video | demo | avatar
//             file   — binary part
//   → { path, bucket } on success
//
// Requires: FIREBASE_PRODUCT_ID (or FIREBASE_PROJECT_ID) secret,
// STORAGE_SERVICE_JWT (legacy JWT service key — the opaque sb_secret_
// format is rejected by the storage gateway) or
// SUPABASE_SERVICE_ROLE_KEY fallback, SUPABASE_URL.
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRIVATE_BUCKET = "private-verification-docs";
const DEMO_BUCKET = "tutor-demo-videos";
const AVATAR_BUCKET = "public-avatars";

/** Max upload size — matches the documented private-bucket cap. */
const MAX_BYTES = 25 * 1024 * 1024;

/** Kind allow-list → target bucket. Anything else is rejected. */
const KIND_BUCKETS: Record<string, string> = {
  id: PRIVATE_BUCKET,
  education: PRIVATE_BUCKET,
  video: DEMO_BUCKET,
  demo: DEMO_BUCKET,
  avatar: AVATAR_BUCKET,
};

/** Content-Type → safe file extension (never trust the filename). */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Authenticate — the ONLY source of identity.
    const auth = await verifyFirebaseJwt(req);

    // 2. Parse multipart form.
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Expected multipart/form-data" }, 400);
    }

    const kindRaw = form.get("kind");
    const kind = typeof kindRaw === "string" ? kindRaw : "";
    const bucket = KIND_BUCKETS[kind];
    if (!bucket) {
      return json(
        { error: `Invalid kind — allowed: ${Object.keys(KIND_BUCKETS).join(", ")}` },
        400,
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing 'file' part" }, 400);
    }
    if (file.size === 0) {
      return json({ error: "Empty file" }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "File exceeds 25 MB limit" }, 413);
    }

    // 3. Derive the path SERVER-SIDE. The client controls only the
    // kind; uid comes from the JWT, ext from the sniffed MIME.
    const mime = (file.type || "").toLowerCase();
    const ext = EXT_BY_MIME[mime];
    if (!ext) {
      return json({ error: `Unsupported file type: ${mime || "unknown"}` }, 415);
    }
    const path = `${auth.uid}/${kind}.${ext}`;

    // 4. Write via Storage REST with the service role (bypasses RLS —
    // no anon policies needed anymore). x-upsert makes re-uploads
    // idempotent overwrites, matching the old SDK behavior.
    const serviceKey =
      Deno.env.get("STORAGE_SERVICE_JWT") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceKey || !supabaseUrl) {
      console.error("[upload-verification-doc] server not configured");
      return json({ error: "Server not configured" }, 500);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const putRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": mime,
          "x-upsert": "true",
          "Cache-Control": "0",
        },
        body: bytes,
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      console.error(
        "[upload-verification-doc] storage write failed:",
        putRes.status,
        t.slice(0, 300),
      );
      return json(
        { error: "Storage write failed", upstreamStatus: putRes.status },
        502,
      );
    }

    return json({ path, bucket });
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.status);
    }
    console.error("[upload-verification-doc] unhandled error:", err);
    return json({ error: "Server error" }, 500);
  }
});
