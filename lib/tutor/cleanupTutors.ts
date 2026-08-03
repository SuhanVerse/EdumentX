/**
 * EdumentX — Clean Up Orphaned Tutor Directory Entries
 *
 * Scans the `tutors/{uid}` collection and removes any doc where the
 * corresponding `users/{uid}/tutorProfile/default` subcollection doc
 * either doesn't exist or doesn't have `verificationStatus === "approved"`.
 *
 * This handles the "stale tutor" problem: when a user is deleted from
 * Firebase Auth or their profile is removed/rejected, the denormalized
 * `tutors/{uid}` doc persists and continues to appear on the student
 * home screen.
 *
 * Because `tutors/{uid}` is a denormalized cache that the admin review
 * pipeline writes to on approve/reject, it can fall out of sync if:
 *   - A user account is deleted outside the app (e.g. Firebase Console)
 *   - A user's verification status changes without going through the
 *     admin queue (e.g. a direct Firestore write)
 *   - The backfill script (now removed) wrote a stale entry from a
 *     user that was subsequently deleted
 *
 * **Safe to re-run:** only deletes docs that don't pass validation.
 * Idempotent.
 */

import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  writeBatch,
} from "@react-native-firebase/firestore";

export type CleanupResult = {
  totalScanned: number;
  totalDeleted: number;
  errors: { uid: string; reason: string }[];
};

/**
 * Scan every doc in the `tutors/{uid}` collection and delete those
 * whose source user profile is missing or no longer approved.
 *
 * Returns a summary so the caller can display it (e.g. in the admin
 * verification queue).
 */
export async function cleanupOrphanedTutorDirectory(): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalScanned: 0,
    totalDeleted: 0,
    errors: [],
  };

  const db = getFirestore(getApp());
  const tutorsRef = collection(db, "tutors");

  let allDocs: { id: string; data: Record<string, unknown> }[] = [];
  try {
    const snap = await getDocs(tutorsRef);
    allDocs = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, data };
    });
  } catch (err) {
    console.warn("[cleanupTutors] Failed to query tutors collection", err);
    result.errors.push({
      uid: "query",
      reason: `Failed to query tutors collection: ${err}`,
    });
    return result;
  }

  if (allDocs.length === 0) return result;

  const batch = writeBatch(db);
  let batchSize = 0;
  const BATCH_LIMIT = 500;

  async function flushBatch() {
    if (batchSize > 0) {
      await batch.commit();
    }
  }

  for (const entry of allDocs) {
    result.totalScanned++;
    const { id: uid } = entry;

    try {
      // Check if the user's profile subcollection doc exists and is approved.
      const profileRef = doc(db, "users", uid, "tutorProfile", "default");
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // User's profile subcollection doesn't exist — this tutor
        // either never completed onboarding or was deleted. Remove
        // the directory entry.
        batch.delete(doc(db, "tutors", uid));
        result.totalDeleted++;
        batchSize++;
      } else {
        const profileData = profileSnap.data() as Record<string, unknown>;
        const verificationStatus =
          typeof profileData.verificationStatus === "string"
            ? profileData.verificationStatus
            : "pending";

        if (verificationStatus !== "approved") {
          // Profile exists but tutor is no longer approved. Remove
          // the directory entry so the student query doesn't see them.
          batch.delete(doc(db, "tutors", uid));
          result.totalDeleted++;
          batchSize++;
        }
        // else: profile exists and is approved — keep the entry.
      }

      // Flush when we hit the batch limit.
      if (batchSize >= BATCH_LIMIT) {
        await flushBatch();
        batchSize = 0;
      }
    } catch (err) {
      console.warn(`[cleanupTutors] Failed for uid=${uid}`, err);
      result.errors.push({
        uid,
        reason: `${err}`,
      });
    }
  }

  // Flush any remaining writes.
  try {
    await flushBatch();
  } catch (err) {
    console.warn("[cleanupTutors] Failed to commit final batch", err);
  }

  return result;
}
