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
  /** Owner + admin read; all MIME; 25 MB cap. Holds ID / education / video. */
  VERIFICATION_DOCS: "private-verification-docs",
} as const;

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
export async function uploadVerificationDoc(
  uid: string,
  kind: VerificationKind,
  uri: string,
): Promise<{ path: string }> {
  if (!uid) throw new Error("[uploadVerificationDoc] uid is required");

  const bytes = await readBytes(uri);
  const contentType = mimeFromUri(uri);
  const ext = contentType.split("/")[1] ?? "bin";
  const path = `${uid}/${kind}.${ext}`;

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET.VERIFICATION_DOCS)
    .upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: "0", // docs are private — no need to cache
    });

  if (error) {
    // The Storage SDK surfaces two failure shapes:
    //   - `StorageApiError`     — HTTP responded but with 4xx/5xx
    //                              (e.g. "Bucket not found", RLS denied).
    //                              Carries `status` and `statusCode`.
    //   - `StorageUnknownError` — transport-level failure
    //                              (DNS, TLS, paused Supabase project,
    //                              captive portal). Message is usually
    //                              "Network request failed", no status.
    //
    // Both come back through the same `{ error }` field. We log the
    // full error in `__DEV__` so the device console has the
    // `originalError` / status, and we include the bucket + path in
    // the thrown message so the user can copy-paste into an issue
    // tracker. For the most common failure (bucket missing) we
    // also surface a one-liner in the thrown message that points
    // the user at the Supabase dashboard — saves the next 20
    // minutes of debugging.
    if (__DEV__) {
       
      console.warn("[uploadVerificationDoc] full error", error);
    }
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    const hint =
      error.message === "Bucket not found"
        ? " — create the bucket in Supabase Storage (name: " +
          BUCKET.VERIFICATION_DOCS +
          ") before retrying"
        : status === 401 || status === 403
          ? " — the anon key upload is denied by RLS. In Supabase SQL editor: CREATE POLICY \"anon-upload\" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = '" +
            BUCKET.VERIFICATION_DOCS +
            "')"
          : "";
    throw new Error(
      `[uploadVerificationDoc] ${error.message}${hint} (bucket=${BUCKET.VERIFICATION_DOCS}, path=${path})`,
    );
  }

  return { path };
}

/**
 * Public read URL for a verification doc inside the
 * `private-verification-docs` bucket.
 *
 * Why we expose a *public* URL on a *private*-named bucket: the
 * EdumentX project is on the Supabase free tier (no card, no
 * Cloud Functions). The only way for the admin client to render
 * a tutor's citizenship scan / certificate is to make the file
 * readable without a signed URL. Writes remain owner-only — a
 * tutor can only upload to their own `{uid}/...` path because
 * `uploadVerificationDoc` is called with the signed-in user's
 * uid as the first segment. Reads are public so the admin queue
 * can render an `<Image>` preview and the admin can tap to
 * open the file in the system browser.
 *
 * If we ever add a Cloud Function on a paid plan, this helper
 * becomes `getSignedUrl` (server-minted, time-limited) and the
 * bucket is flipped back to private-read. Until then this is
 * the cheapest path that keeps the admin flow working on the
 * free tier.
 *
 * @param path Storage object path, e.g. `{uid}/id.jpg`.
 */
export function getVerificationDocPublicUrl(path: string): string {
  if (!path) throw new Error("[getVerificationDocPublicUrl] path is required");
  const supabase = getSupabase();
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET.VERIFICATION_DOCS).getPublicUrl(path);
  return publicUrl;
}
