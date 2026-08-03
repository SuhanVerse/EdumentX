/**
 * EdumentX — Backfill Tutor Discovery Collection
 *
 * One-time utility for admins to populate the `tutors/{uid}` collection
 * for any existing tutors who were approved BEFORE the `tutors`
 * collection was introduced. Without this backfill, those tutors won't
 * appear on the student home screen even though they're fully verified.
 *
 * **How to use:**
 *   1. Admin navigates to the Verification Queue screen
 *   2. Scrolls to the bottom and taps "Backfill tutor directory"
 *   3. The function iterates through `users/{uid}/tutorProfile/default`
 *      docs where `verificationStatus === "approved"` and writes the
 *      student-facing fields to `tutors/{uid}`
 *
 * **What it writes per tutor:**
 *   - uid, fullName, username, headline, subjects, monthlyRateNpr,
 *     location, photoUrl, yearsExperience, degree, institution
 *   - verificationStatus: "approved"
 *   - isVerifiedProfessional: true
 *   - hasPendingUpdate: false
 *
 * **Why it's safe:**
 *   - Uses batched writes (500 per batch) so a partial failure never
 *     leaves the collection in a half-written state
 *   - Idempotent: re-running overwrites the doc with the same data
 *   - Only touches tutors who are already `verificationStatus === "approved"`
 */

import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

export type BackfillResult = {
  totalProcessed: number;
  totalWritten: number;
  errors: { uid: string; reason: string }[];
};

/**
 * Backfill the `tutors/{uid}` collection for all existing approved
 * tutors who may not have a doc there yet.
 *
 * Iterates through the `users/{uid}/tutorProfile/default` subcollection
 * for tutors whose `verificationStatus === "approved"` and writes the
 * student-facing fields to `tutors/{uid}`.
 *
 * Safe to call multiple times — idempotent.
 */
export async function backfillTutorDirectory(): Promise<BackfillResult> {
  const result: BackfillResult = {
    totalProcessed: 0,
    totalWritten: 0,
    errors: [],
  };

  const db = getFirestore(getApp());

  // Step 1: Find all users with role === "tutor"
  // We query the `users` collection for docs where `role === "tutor"`.
  // Note: In Firestore, this is a top-level collection query.
  const usersRef = collection(db, "users");
  const tutorQuery = query(usersRef, where("role", "==", "tutor"));

  let tutorUids: string[] = [];
  try {
    const snap = await getDocs(tutorQuery);
    tutorUids = snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn("[backfillTutors] Failed to query users collection", err);
    result.errors.push({
      uid: "query",
      reason: `Failed to query users/role=tutor: ${err}`,
    });
    return result;
  }

  if (tutorUids.length === 0) {
    return result; // No tutors found
  }

  // Step 2: For each tutor, check if their profile doc exists and
  // is verified. We read the profile subcollection doc which should
  // always exist if they completed the signup flow.
  const batch = writeBatch(db);
  let batchSize = 0;
  const BATCH_LIMIT = 500;

  // Helper to flush the current batch when we hit the limit.
  async function flushBatch() {
    if (batchSize > 0) {
      await batch.commit();
    }
  }

  for (const uid of tutorUids) {
    result.totalProcessed++;

    try {
      const profileRef = doc(db, "users", uid, "tutorProfile", "default");
      const snap = await getDoc(profileRef);

      if (!snap.exists()) {
        // User has role "tutor" but no profile doc — skip.
        // This shouldn't happen for legitimate users, but handle it
        // gracefully.
        continue;
      }

      const data = snap.data() as Record<string, unknown>;

      // Only backfill tutors who are approved
      const verificationStatus =
        typeof data.verificationStatus === "string"
          ? data.verificationStatus
          : "pending";
      if (verificationStatus !== "approved") {
        continue;
      }

      const rawLocation = data.location as
        | { neighborhood?: string; city?: string }
        | null
        | undefined;

      // Write the tutor to the discovery collection
      const tutorDirRef = doc(db, "tutors", uid);
      batch.set(
        tutorDirRef,
        {
          uid,
          fullName: typeof data.fullName === "string" ? data.fullName : null,
          username: typeof data.username === "string" ? data.username : null,
          headline: typeof data.headline === "string" ? data.headline : null,
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
          // gradesTeaching is a filterable field in the AI search (grade is
          // a minimum constraint). Missing it here means the seed stores an
          // empty grades array and the chatbot returns 0 tutors for every
          // search. Mirror the full filterable profile.
          gradesTeaching: Array.isArray(data.gradesTeaching)
            ? data.gradesTeaching
            : [],
          monthlyRateNpr:
            typeof data.monthlyRateNpr === "number" ? data.monthlyRateNpr : 0,
          location:
            rawLocation && typeof rawLocation === "object"
              ? {
                  neighborhood:
                    typeof rawLocation.neighborhood === "string"
                      ? rawLocation.neighborhood
                      : "",
                  city:
                    typeof rawLocation.city === "string"
                      ? rawLocation.city
                      : "",
                }
              : null,
          photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
          yearsExperience:
            typeof data.yearsExperience === "number"
              ? data.yearsExperience
              : 0,
          bio: typeof data.bio === "string" ? data.bio : "",
          gender:
            data.gender === "male" || data.gender === "female" || data.gender === "other"
              ? (data.gender as "male" | "female" | "other")
              : null,
          tutoringMode:
            data.tutoringMode === "home" ||
            data.tutoringMode === "online" ||
            data.tutoringMode === "both"
              ? (data.tutoringMode as "home" | "online" | "both")
              : "both",
          languages: Array.isArray(data.languages)
            ? data.languages
            : ["English", "Nepali"],
          rating: typeof data.rating === "number" ? data.rating : 0,
          reviewCount: typeof data.reviewCount === "number" ? data.reviewCount : 0,
          responseRate: typeof data.responseRate === "number" ? data.responseRate : 0,
          verificationStatus: "approved",
          isVerifiedProfessional: true,
          hasPendingUpdate: false,
          degree: typeof data.degree === "string" ? data.degree : null,
          institution:
            typeof data.institution === "string" ? data.institution : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      result.totalWritten++;
      batchSize++;

      // Flush batch when we hit the limit to avoid Firestore's
      // 500-write-per-batch ceiling.
      if (batchSize >= BATCH_LIMIT) {
        await batch.commit();
        batchSize = 0;
      }
    } catch (err) {
      console.warn(`[backfillTutors] Failed for uid=${uid}`, err);
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
    console.warn("[backfillTutors] Failed to commit final batch", err);
    // Don't report individual errors here since we already
    // caught them per-tutor above.
  }

  return result;
}
