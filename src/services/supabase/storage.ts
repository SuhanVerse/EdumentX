/**
 * Supabase Storage helpers for tutor/student uploads.
 *
 * Two buckets (configured in Supabase dashboard, Mumbai region, no card):
 *   - `public-avatars`           — read-by-all, image/* MIME only, 5 MB cap
 *   - `private-verification-docs` — read-by-owner + admin, all MIME,
 *                                   25 MB cap
 *
 * See `Documentation/01-Architecture/ARCHITECTURE.md` §3 for the full
 * RLS policy spec and bucket-creation steps.
 *
 * Why we read the picked image with `new File(uri).arrayBuffer()`:
 *   - React Native's WHATWG polyfill ships a `Blob` whose `arrayBuffer()`
 *     method is not implemented, so `fetch(file://).blob().arrayBuffer()`
 *     throws at runtime.
 *   - `expo-file-system`'s modern `File` class **implements the WHATWG
 *     `Blob` interface** (see `node_modules/expo-file-system/build/
 *     FileSystem.d.ts` line 42: `class File extends … implements Blob`),
 *     so its `arrayBuffer()` works on the JS engine we actually target.
 *   - This avoids the legacy `FileSystem.readAsStringAsync(uri, { encoding:
 *     "base64" })` path — which is deprecated in SDK 54 — and also avoids
 *     a base64 round-trip we don't need (the SDK accepts raw `ArrayBuffer`).
 */
import { File } from "expo-file-system";

import { getSupabase } from "@/services/supabase/client";

// ---------------------------------------------------------------------------
// Bucket names — kept as constants so a future rename is a one-line change.
// ---------------------------------------------------------------------------

export const BUCKET = {
  /** Public read; image/* only; 5 MB cap. Holds {uid}.jpg avatars. */
  AVATARS: "public-avatars",
  /**
   * Owner + admin read ONLY (Aug 24 audit fix — this bucket is now
   * fully PRIVATE; previews go through the `verification-doc-url`
   * Edge Function's short-lived signed URLs). Holds citizenship +
   * certificate scans. NEVER store anything here that students must
   * render.
   */
  VERIFICATION_DOCS: "private-verification-docs",
  /**
   * Public read; tutor intro videos (`kind: "demo"`). Split out of
   * VERIFICATION_DOCS by the Aug 24 audit so the private bucket can be
   * flipped fully private without breaking the public details screen.
   */
  DEMO_VIDEOS: "tutor-demo-videos",
} as const;

/** Kinds that live in the PUBLIC demo bucket (student-facing media). */
const PUBLIC_KINDS: ReadonlySet<string> = new Set(["demo"]);

// ---------------------------------------------------------------------------
// MIME detection
// ---------------------------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

/**
 * Sniffs the MIME type from a `file://` URI's extension. Falls back to
 * `image/jpeg` because 99% of avatars picked on Android/iOS are JPEG
 * (and `quality: 0.8` on `launchImageLibraryAsync` re-encodes as JPEG).
 */
function mimeFromUri(uri: string): string {
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

// ---------------------------------------------------------------------------
// URI → bytes
// ---------------------------------------------------------------------------

/**
 * Reads a `file://` / `assets-library://` URI into raw bytes using
 * expo-file-system's modern `File` class. The `File` class implements
 * the WHATWG `Blob` interface, so `arrayBuffer()` is available on it
 * (unlike the `Blob` returned by `fetch()` on React Native, which
 * doesn't implement `arrayBuffer()`). Zero base64 round-trip — the
 * bytes go straight to Supabase.
 *
 * If a future Expo SDK deprecates the `File` class, the documented
 * fallback is:
 *
 *   import * as FileSystem from "expo-file-system/legacy";
 *   const b64 = await FileSystem.readAsStringAsync(uri, {
 *     encoding: FileSystem.EncodingType.Base64,
 *   });
 *   return base64ToBytes(b64);  // tiny local atob()-based helper
 */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  return await new File(uri).arrayBuffer();
}

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

export type UploadAvatarResult = {
  /** Public URL of the uploaded avatar. Persist this in Firestore. */
  publicUrl: string;
  /** Storage object path inside the bucket (e.g. "{uid}.jpg"). */
  path: string;
};

/**
 * Uploads an avatar picked from the device into `public-avatars`.
 *
 * Contract:
 *   - Caller is responsible for permission prompts (`expo-image-picker`
 *     handles this in `AvatarUploader`).
 *   - Caller is responsible for compression — pass the URI returned by
 *     `expo-image-picker.launchImageLibraryAsync({ quality: 0.8 })`.
 *     The re-encode to JPEG at q=0.8 usually lands avatars at 200–400 KB.
 *   - We always write to `{bucket}/{uid}.jpg` — overwrite is idempotent.
 *   - We `upsert: true` so a tutor who changes their avatar doesn't
 *     create a duplicate `{uid}.jpg`, `{uid}-1.jpg`, etc.
 *   - The returned `publicUrl` is stable for the lifetime of the bucket.
 *
 * @param uid   Firebase auth uid (used as the filename).
 * @param uri   Local URI from `expo-image-picker`.
 */
export async function uploadAvatar(
  uid: string,
  uri: string,
): Promise<UploadAvatarResult> {
  if (!uid) throw new Error("[uploadAvatar] uid is required");

  const bytes = await readBytes(uri);
  const path = `${uid}.jpg`;
  const contentType = mimeFromUri(uri);

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET.AVATARS).upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: "3600", // 1h — avatars are immutable per uid
  });

  if (error) {
    if (__DEV__) {
       
      console.warn("[uploadAvatar] full error", error);
    }
    const hint =
      error.message === "Bucket not found"
        ? " — create the bucket in Supabase Storage (name: " +
          BUCKET.AVATARS +
          ") before retrying"
        : "";
    throw new Error(
      `[uploadAvatar] ${error.message}${hint} (bucket=${BUCKET.AVATARS}, path=${path})`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET.AVATARS).getPublicUrl(path);

  return { publicUrl, path };
}

// ---------------------------------------------------------------------------
// Review photos (public bucket, review-attached)
// ---------------------------------------------------------------------------

/**
 * Uploads an optional photo attached to a student's tutor review into
 * `public-avatars` (the existing public image bucket — image/* only,
 * no card required, matches the zero-budget rule).
 *
 * Path convention: `reviews/{tutorUid}/{timestamp}.{ext}` so review
 * photos are grouped per tutor and never collide. Upsert is off —
 * each photo is a distinct object.
 *
 * @param tutorUid The tutor the review is about (path namespace).
 * @param uri      Local URI from `expo-image-picker` (q 0.8 re-encode).
 */
export async function uploadReviewPhoto(
  tutorUid: string,
  uri: string,
): Promise<UploadAvatarResult> {
  if (!tutorUid) throw new Error("[uploadReviewPhoto] tutorUid is required");

  const bytes = await readBytes(uri);
  const path = `reviews/${tutorUid}/${Date.now()}.jpg`;
  const contentType = mimeFromUri(uri);

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET.AVATARS).upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });

  if (error) {
    if (__DEV__) {
      console.warn("[uploadReviewPhoto] full error", error);
    }
    throw new Error(
      `[uploadReviewPhoto] ${error.message} (bucket=${BUCKET.AVATARS}, path=${path})`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET.AVATARS).getPublicUrl(path);

  return { publicUrl, path };
}

// ---------------------------------------------------------------------------
// Verification docs (private bucket, RLS-protected)
// ---------------------------------------------------------------------------

export type VerificationKind = "id" | "education" | "video";

/**
 * Uploads a tutor verification document into `private-verification-docs`.
 *
 * The bucket is private. The user can read their own docs via RLS, but
 * the admin cannot (the admin uses the Supabase dashboard or a
 * developer-side script with the service-role key — not the app).
 *
 * Path convention: `{uid}/{kind}.{ext}` so the user's three docs are
 * grouped and easy to enumerate.
 */
/**
 * Uploads a tutor verification document.
 *
 * ── SECURITY HARDENING (Aug 25) ──
 * Uploads now route through the `upload-verification-doc` Edge
 * Function instead of writing to Storage with the anon key. The uid
 * is taken from the VERIFIED FIREBASE JWT server-side — the path is
 * built there, so a malicious client can no longer overwrite another
 * user's `{victimUid}/id.jpg` via the bucket-scoped anon policies
 * (which migration 017 removes entirely).
 *
 * Contract unchanged for callers: pass the Firebase uid + kind +
 * local URI, get back the storage path. The uid param is still used
 * for the optimistic local error messages but is NOT trusted by the
 * server.
 *
 * Path convention: `{uid}/{kind}.{ext}` (server-derived).
 */
export async function uploadVerificationDoc(
  uid: string,
  kind: VerificationKind,
  uri: string,
): Promise<{ path: string }> {
  if (!uid) throw new Error("[uploadVerificationDoc] uid is required");

  // Demo videos are student-facing media → public bucket. Everything
  // else is PII → private bucket (signed-URL access only). The server
  // applies the same mapping; this only feeds its allow-list.
  const serverKind = PUBLIC_KINDS.has(kind) ? "demo" : kind;
  const contentType = mimeFromUri(uri);

  // Fresh Firebase ID token — identity comes from this, not from any
  // request field.
  const { getApp } = await import("@react-native-firebase/app");
  const { getAuth, getIdToken } = await import("@react-native-firebase/auth");
  const user = getAuth(getApp()).currentUser;
  if (!user) throw new Error("[uploadVerificationDoc] sign in required");
  const idToken = await getIdToken(user);

  // React Native's FormData file shape ({ uri, name, type }) streams
  // straight off disk — no base64 round-trip needed.
  const form = new FormData();
  form.append("kind", serverKind);
  form.append("file", {
    uri,
    name: `upload.${contentType.split("/")[1] ?? "bin"}`,
    type: contentType,
  } as unknown as Blob);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("[uploadVerificationDoc] EXPO_PUBLIC_SUPABASE_URL not set");
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/upload-verification-doc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: form,
    });
  } catch (err) {
    throw new Error(
      `[uploadVerificationDoc] network request failed: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      `[uploadVerificationDoc] upload rejected (${res.status}): ${
        body?.error ?? "unknown error"
      }`,
    );
  }

  const data = (await res.json()) as { path?: unknown };
  if (typeof data.path !== "string" || data.path.length === 0) {
    throw new Error("[uploadVerificationDoc] no path in response");
  }
  return { path: data.path };
}

/**
 * Resolve a display URL for a stored verification doc.
 *
 * ── SECURITY FIX (Aug 24 audit) ──
 * The old implementation minted a PERMANENT PUBLIC URL into the
 * private-verification-docs bucket — with guessable `{uid}/{kind}.{ext}`
 * keys, anyone who learned a Firebase uid could fetch that user's
 * citizenship scan.
 *
 * Now:
 *   - demo videos live in the PUBLIC `tutor-demo-videos` bucket and
 *     resolve to plain public URLs (student-facing media), while
 *   - PII scans (citizenship/certificate) resolve through the
 *     `verification-doc-url` Edge Function, which returns a SHORT-LIVED
 *     signed URL after checking owner-or-admin authority server-side.
 *
 * @param path Storage object path, e.g. `{uid}/id.jpg`.
 */
export function getVerificationDocPublicUrl(path: string): string | null {
  if (!path) return null;
  // Demo videos: public bucket, direct URL.
  const kind = path.split("/")[1]?.split(".")[0] ?? "";
  if (PUBLIC_KINDS.has(kind)) {
    const supabase = getSupabase();
    const { data } = supabase.storage.from(BUCKET.DEMO_VIDEOS).getPublicUrl(path);
    return data.publicUrl;
  }
  // PII docs have NO synchronously-resolvable URL any more. Callers
  // must use `getVerificationDocSignedUrl` (async). Returning null
  // keeps sync call sites type-honest and fails closed.
  return null;
}

/**
 * Mint a SHORT-LIVED signed URL for a PII verification doc via the
 * `verification-doc-url` Edge Function (owner-or-admin authorized,
 * server-side). Use for admin queue previews and the uploader's own
 * document thumbnails.
 */
export async function getVerificationDocSignedUrl(
  path: string,
): Promise<string> {
  if (!path) throw new Error("[getVerificationDocSignedUrl] path is required");
  const { getApp } = await import("@react-native-firebase/app");
  const { getAuth, getIdToken } = await import("@react-native-firebase/auth");
  const user = getAuth(getApp()).currentUser;
  if (!user) throw new Error("[getVerificationDocSignedUrl] sign in required");
  const idToken = await getIdToken(user);

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(
    "verification-doc-url",
    { body: { path }, headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (error) {
    throw new Error(
      `[getVerificationDocSignedUrl] ${(error as { message?: string }).message ?? "request failed"}`,
    );
  }
  const url = (data as { url?: unknown }).url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("[getVerificationDocSignedUrl] no URL in response");
  }
  return url;
}
