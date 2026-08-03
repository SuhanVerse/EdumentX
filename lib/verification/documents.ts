import * as ImagePicker from "expo-image-picker";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { File } from "expo-file-system";

import {
  uploadVerificationDoc,
  type VerificationKind,
} from "@/services/supabase/storage";

/**
 * EdumentX — Tutor verification document helpers.
 *
 * Three docs, two required and one optional. The free Supabase plan
 * is capped at 1 GB of total object storage across the project, so
 * we hard-cap the per-file size before upload. The tutor dashboard
 * renders the existing three-doc list (citizenship / academic / video)
 * using `TutorDocument` records stored in `tutorVerifications/{uid}`
 * and `tutorProfileUpdates/{uid}` as `documents: TutorDocument[]`.
 *
 *   1. `citizenship` — REQUIRED. Citizenship ID, front and back.
 *      JPG / PNG / WEBP / HEIC, max 4 MB. Captured with the device
 *      camera or picked from the gallery.
 *   2. `certificate` — REQUIRED. Academic credentials — degree,
 *      transcript, enrollment letter, or any other proof of study.
 *      Same formats, same 4 MB cap.
 *   3. `demo`       — OPTIONAL. A 30–60 second teaching clip so
 *      admins can see the tutor in action. MP4 / MOV, max 25 MB.
 *
 * Why we cap at 4 MB for stills: a typical 1080×1440 phone photo
 * re-encoded at JPEG quality 0.8 lands at ~600 KB; the 4 MB cap
 * leaves headroom for higher-density scans (citizenship back with
 * fine print) without letting users upload raw camera raws.
 *
 * Why we cap the demo at 25 MB: a 60-second 720p h.264 clip is
 * typically 10–20 MB. Anything above 25 MB on the client side is
 * probably a raw recording the user forgot to compress.
 *
 * Why we don't use `expo-document-picker`: the spec calls for
 * "clear photo of certificate" — a JPEG/PNG photo, not a PDF scan.
 * `expo-image-picker` covers both photos (camera) and library
 * picks and is already in the project. We avoid adding a second
 * picker dependency for a use case the user has not asked for.
 */

export const TUTOR_DOC_KINDS = [
  "citizenship",
  "certificate",
  "demo",
] as const;

export type TutorDocKind = (typeof TUTOR_DOC_KINDS)[number];

/** Human label for a doc kind — used in the UI. */
export const TUTOR_DOC_LABEL: Record<TutorDocKind, string> = {
  citizenship: "Citizenship ID",
  certificate: "Academic certificate",
  demo: "Demo teaching video",
};

/** Short helper text under each doc slot in the upload UI. */
export const TUTOR_DOC_HELPER: Record<TutorDocKind, string> = {
  citizenship:
    "Front and back of your citizenship card. JPG or PNG, up to 4 MB.",
  certificate:
    "Degree, transcript, or enrollment letter. JPG or PNG, up to 4 MB.",
  demo:
    "Optional. 30–60 second teaching clip. MP4 or MOV, up to 25 MB.",
};

/** Storage kind used in `uploadVerificationDoc`. The mapping lives
 *  here so the rest of the app sees the friendly `TutorDocKind`
 *  union and not the storage-layer enum. */
const STORAGE_KIND: Record<TutorDocKind, VerificationKind> = {
  citizenship: "id",
  certificate: "education",
  demo: "video",
};

/** Per-kind file-size cap, in bytes. Used for client-side validation
 *  before any upload attempt so we can surface a friendly error
 *  instead of letting Supabase reject with a 413. */
export const TUTOR_DOC_MAX_BYTES: Record<TutorDocKind, number> = {
  citizenship: 4 * 1024 * 1024, // 4 MB
  certificate: 4 * 1024 * 1024, // 4 MB
  demo: 25 * 1024 * 1024, // 25 MB
};

/** Acceptable MIME types per kind. Image for stills; video for the
 *  demo. The image picker returns these by default so the check is
 *  really a defensive safety net. */
const ACCEPTED_MIME: Record<TutorDocKind, string[]> = {
  citizenship: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  certificate: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  demo: ["video/mp4", "video/quicktime"],
};

/** Persistent record of an uploaded doc. Stored on the
 *  `tutorVerifications/{uid}` and `tutorProfileUpdates/{uid}` docs
 *  so the admin queue can render the documents tile and the tutor
 *  dashboard can show "you already uploaded X" on the edit screen. */
export type TutorDocument = {
  kind: TutorDocKind;
  /** Supabase Storage path inside the
   *  `private-verification-docs` bucket, e.g.
   *  `{uid}/id.jpg` or `{uid}/video.mp4`. */
  path: string;
  /** Best-effort size, in bytes. Captured at upload time so the UI
   *  can show "1.2 MB" without re-fetching the file. */
  bytes: number;
  /** Display name for the file (the user's original name or a
   *  derived name for camera captures). */
  name: string;
  /** ISO timestamp the upload completed. */
  uploadedAt: string;
};

export type UploadDocResult =
  | { ok: true; document: TutorDocument }
  | { ok: false; reason: "too_large" | "wrong_type" | "cancelled" | "unknown"; message?: string };

/**
 * Pick a file for the given kind and upload it to Supabase.
 *
 * Source of truth: we always re-read the local file with
 * `expo-file-system`'s modern `File` class (which implements the
 * WHATWG `Blob.arrayBuffer()` interface — see
 * `services/supabase/storage.ts` for the full reason). The result
 * is a `TutorDocument` we can persist to Firestore.
 */
export async function pickAndUploadTutorDoc(
  uid: string,
  kind: TutorDocKind,
): Promise<UploadDocResult> {
  if (!uid) {
    return { ok: false, reason: "unknown", message: "Not signed in." };
  }

  const isVideo = kind === "demo";
  const localUri = isVideo ? await pickVideoUri() : await pickImageUri();
  if (!localUri) {
    return { ok: false, reason: "cancelled" };
  }

  // Validate size before doing the network round-trip. The file's
  // local size is the same size we'll send — Supabase doesn't
  // re-encode.
  const bytes = await readLocalBytes(localUri);
  if (bytes.byteLength > TUTOR_DOC_MAX_BYTES[kind]) {
    return {
      ok: false,
      reason: "too_large",
      message: `File is ${formatBytes(bytes.byteLength)} — max allowed for ${TUTOR_DOC_LABEL[kind]} is ${formatBytes(TUTOR_DOC_MAX_BYTES[kind])}.`,
    };
  }

  // Defensive type check. The picker restricts the MIME family, but
  // a malicious or buggy caller could pass a URI with a misleading
  // extension. Bailing here is cheaper than letting Supabase store
  // a wrongly-typed file and the admin try to render it.
  const mime = sniffMime(localUri);
  if (!ACCEPTED_MIME[kind].includes(mime)) {
    return {
      ok: false,
      reason: "wrong_type",
      message: `${TUTOR_DOC_LABEL[kind]} accepts ${ACCEPTED_MIME[kind]
        .map((m) => m.split("/")[1])
        .join(", ")}.`,
    };
  }

  try {
    const { path } = await uploadVerificationDoc(uid, STORAGE_KIND[kind], localUri);
    return {
      ok: true,
      document: {
        kind,
        path,
        bytes: bytes.byteLength,
        name: deriveDisplayName(localUri, kind),
        uploadedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return { ok: false, reason: "unknown", message };
  }
}

/**
 * Read a local file's bytes via `expo-file-system`'s `File` class.
 * Same rationale as `services/supabase/storage.ts`: RN's
 * `fetch(file://).blob().arrayBuffer()` is not implemented, but
 * `expo-file-system`'s `File` is a real `Blob` subclass.
 */
async function readLocalBytes(uri: string): Promise<ArrayBuffer> {
  return await new File(uri).arrayBuffer();
}

async function pickImageUri(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    quality: 0.8,
    mediaTypes: ["images"],
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

async function pickVideoUri(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ["videos"],
    videoMaxDuration: 60,
    quality: 0.7,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

/** Read the MIME type from a URI's extension. We deliberately do
 *  NOT trust `result.assets[0].mimeType` (the picker sometimes
 *  reports `null` for HEIC or camera captures). */
function sniffMime(uri: string): string {
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  const table: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return table[ext] ?? "application/octet-stream";
}

function deriveDisplayName(uri: string, kind: TutorDocKind): string {
  const fallback = `${kind}-${Date.now()}`;
  const last = uri.split("/").pop() ?? fallback;
  // Camera captures are usually named "image-1234.jpg" or similar —
  // replace those with a friendlier label.
  if (/^image[-_]?\d+/i.test(last)) {
    return `${TUTOR_DOC_LABEL[kind]} (${new Date().toLocaleDateString()})`;
  }
  return last;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resolve the current Firebase auth uid. Convenience for the
 *  call sites that just need the uid. */
export function currentUid(): string | null {
  return getAuth(getApp()).currentUser?.uid ?? null;
}
