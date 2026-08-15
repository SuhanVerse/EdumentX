/**
 * EdumentX — Admin user lifecycle (hard delete)
 *
 * The "Delete permanently" action in the admin UserManagement screen.
 * It purges a user's data from Firestore and (best-effort) their
 * objects from Supabase Storage.
 *
 * Security rules grants (Aug 2026, see firebase/firestore.rules):
 *   - `users/{userId}`             → `delete: if isAdmin()`
 *   - `tutors/{uid}`               → `delete: if isAdmin()`
 *   - `tutorVerifications/{uid}`   → `delete: if isAdmin()`
 *   - `tutorProfileUpdates/{uid}`  → `delete: if isAdmin()`
 *   - `notifications/{uid}`        → `delete: if isAdmin()`
 *   - `users/{uid}/{subcollection}` wildcard → admin write already
 *
 * What this does NOT do (and why):
 *   - Firebase Auth account deletion — `auth().delete()` is
 *     current-user-only and the Spark/free-tier plan has no Cloud
 *     Functions to run the Admin SDK. The auth identity is removed
 *     from a dev laptop via `scripts/deleteUser.ts` (npm run delete:user).
 *   - Guaranteed Supabase Storage cleanup — the app only holds the
 *     anon key, and RLS policies cannot tie storage rows to the
 *     Firebase uid (the app never signs in to Supabase auth). We
 *     attempt the removal anyway (no-op success when the object is
 *     already gone); failures are reported so the operator can run
 *     the script, which uses the service-role key and deletes the
 *     auth record in the same pass.
 */
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
} from "@react-native-firebase/firestore";

import { getSupabase } from "@/services/supabase/client";
import { BUCKET } from "@/services/supabase/storage";

const TUTOR_PROFILE_DOC = "tutorProfile/default";
const STUDENT_PROFILE_DOC = "studentProfile/default";

export type PurgeResult = {
  /** Firestore paths deleted (best-effort — missing docs no-op). */
  firestoreDeleted: string[];
  /** Storage objects removed from Supabase. */
  storageRemoved: string[];
  /** Storage objects that could NOT be removed (RLS / offline). */
  storageFailed: string[];
};

/**
 * Derives the Supabase object path of a user's avatar from its public
 * URL. Public URLs look like
 * `https://<project>.supabase.co/storage/v1/object/public/public-avatars/{uid}.jpg`.
 * Falls back to the canonical `{uid}.jpg` when the URL is missing or
 * not parseable — `uploadAvatar` always writes that exact path, so
 * the fallback is reliable for every avatar the app produced.
 */
export function avatarStoragePathFromUrl(
  avatarUrl: string | null | undefined,
  uid: string,
): string {
  if (!avatarUrl) return `${uid}.jpg`;
  const match = avatarUrl.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return `${uid}.jpg`;
  const [, bucket, objPath] = match;
  return bucket === BUCKET.AVATARS ? objPath : `${uid}.jpg`;
}

/**
 * Collects every Supabase Storage path referenced by a user's profile
 * documents, so the purge can clean up `private-verification-docs`.
 *
 * Reads:
 *   - users/{uid}/tutorProfile/default  (documents[])
 *   - tutorVerifications/{uid}          (documents[])
 *   - tutorProfileUpdates/{uid}         (documents[], if any)
 *
 * Each `TutorDocument` record carries `{ kind, path, ... }` where
 * `path` lives inside the `private-verification-docs` bucket.
 */
async function harvestDocPaths(uid: string): Promise<string[]> {
  const db = getFirestore(getApp());
  const candidates = [
    doc(db, "users", uid, ...TUTOR_PROFILE_DOC.split("/")),
    doc(db, "tutorVerifications", uid),
    doc(db, "tutorProfileUpdates", uid),
  ];

  const paths: string[] = [];
  for (const ref of candidates) {
    try {
      const snap = await getDoc(ref);
      const documents = snap.exists() ? snap.data().documents : undefined;
      if (!Array.isArray(documents)) continue;
      for (const entry of documents) {
        const p = entry?.path;
        if (typeof p === "string" && p.length > 0) paths.push(p);
      }
    } catch {
      // Missing doc or permission edge — skip this candidate rather
      // than aborting the whole purge.
    }
  }
  return paths;
}

/**
 * Hard-deletes a user's data:
 *   1. Firestore — user doc, both profile subdocs, the discovery
 *      mirror, verification/update queues and the notification doc.
 *      (Every path is permitted by the `isAdmin()` grants in
 *      firebase/firestore.rules.)
 *   2. Supabase storage — avatar object + verification docs,
 *      best-effort. Failures are reported, not fatal.
 *
 * The Firebase Auth identity is intentionally NOT touched here — see
 * the file header for why.
 */
export async function purgeUserAccount(
  uid: string,
  avatarUrl: string | null | undefined,
): Promise<PurgeResult> {
  const db = getFirestore(getApp());

  // Harvest verification-doc paths FIRST — the delete loop below
  // removes the very docs that carry them.
  const docPaths = await harvestDocPaths(uid);

  // Also harvest every notification item under
  // `notifications/{uid}/items/{autoId}` so the items subcollection
  // is purged alongside the parent anchor doc. Firestore doesn't
  // recurse into subcollections on `deleteDoc` of the parent — each
  // child doc has to be deleted explicitly (admin rules allow it
  // via the existing `match /notifications/{uid}` rule).
  const notifItemsSnap = await getDocs(
    collection(db, "notifications", uid, "items"),
  );
  const notifItemRefs = notifItemsSnap.docs.map((d) =>
    doc(db, "notifications", uid, "items", d.id),
  );

  const firestoreRefs = [
    doc(db, "users", uid),
    doc(db, "users", uid, ...TUTOR_PROFILE_DOC.split("/")),
    doc(db, "users", uid, ...STUDENT_PROFILE_DOC.split("/")),
    doc(db, "tutors", uid),
    doc(db, "tutorVerifications", uid),
    doc(db, "tutorProfileUpdates", uid),
    doc(db, "notifications", uid),
    ...notifItemRefs,
  ];

  const firestoreDeleted: string[] = [];
  for (const ref of firestoreRefs) {
    try {
      await deleteDoc(ref);
      firestoreDeleted.push(ref.path);
    } catch {
      // A missing doc is a no-op; a rules denial surfaces in the
      // caller's summary. Keep going so one failure doesn't strand
      // half the purge.
    }
  }

  const supabase = getSupabase();
  const storageRemoved: string[] = [];
  const storageFailed: string[] = [];

  if (docPaths.length > 0) {
    const { error } = await supabase.storage
      .from(BUCKET.VERIFICATION_DOCS)
      .remove(docPaths);
    if (error) storageFailed.push(...docPaths);
    else storageRemoved.push(...docPaths);
  }

  const avatarPath = avatarStoragePathFromUrl(avatarUrl, uid);
  const { error: avatarError } = await supabase.storage
    .from(BUCKET.AVATARS)
    .remove([avatarPath]);
  if (avatarError) storageFailed.push(avatarPath);
  else storageRemoved.push(avatarPath);

  return { firestoreDeleted, storageRemoved, storageFailed };
}