import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  Query,
} from "@react-native-firebase/firestore";

/**
 * EdumentX — Tutor Discovery Filter
 *
 * Source of truth for what makes a tutor "discoverable" to a student.
 * A single tutor doc lives at two write-points (their own
 * `users/{uid}/tutorProfile/default` and the denormalized
 * `tutors/{uid}` mirror used by the marketplace / map query). Both
 * paths write the same denormalized flags, so the filter below works
 * against either.
 *
 * Why a dedicated module: the rules comment in
 * `firebase/firestore.rules` and the bug-fix history in
 * `CLAUDE.md` both note that the marketplace MUST NOT show:
 *
 *   1. Tutors whose initial verification is still `pending` (they
 *      haven't been vetted yet — surfacing them is a trust issue).
 *   2. Tutors who were rejected (admin said no — they're gone).
 *   3. Tutors who got "more_info" requested (they're blocked on the
 *      tutor's reply, so they shouldn't be bookable in the meantime).
 *   4. Verified tutors with a `pending` edit in
 *      `tutorProfileUpdates/{uid}` (a high-risk field change is
 *      under review; show the old values, not the new ones, and
 *      remove them from search until the admin signs off — see
 *      `lib/verification/editableFields.ts` §model-B).
 *
 * That second case (#4) is why we have two filter clauses, not one
 * — `verificationStatus === "approved"` alone wouldn't hide a
 * tutor mid-edit. The `tutorProfileUpdates` collection's `pending`
 * status is mirrored to `tutorProfile.hasPendingUpdate` so the
 * filter is a flat `where(...)` against the denormalized doc.
 *
 * Usage (Phase 5+):
 *
 *   const q = buildTutorDiscoveryQuery();
 *   const unsub = onSnapshot(q, (snap) => { ... });
 */

export type DiscoveryStatus = "approved";

/** Predicate for a tutor doc shape. Matches the denormalized
 *  `tutors/{uid}` collection AND the subcollection
 *  `users/{uid}/tutorProfile/default` — both write the same flags. */
export type DiscoveryTutor = {
  verificationStatus?: string | null;
  isVerifiedProfessional?: boolean | null;
  hasPendingUpdate?: boolean | null;
};

export function tutorMeetsDiscoveryCriteria(
  tutor: DiscoveryTutor | null | undefined,
): boolean {
  if (!tutor) return false;
  if (tutor.verificationStatus !== "approved") return false;
  if (!tutor.isVerifiedProfessional) return false;
  if (tutor.hasPendingUpdate) return false;
  return true;
}

/** Build the Firestore query for the student-side tutor list. Reads
 *  from the `tutors/{uid}` denormalized collection (the same shape
 *  gets denormalized into the profile subcollection for one-doc
 *  reads; this one is the multi-doc query path).
 *
 *  The two `where` clauses are composite-index candidates — add an
 *  index on `(verificationStatus, hasPendingUpdate)` in the Firebase
 *  console before going live with real data. The single-field
 *  `where("verificationStatus", "==", "approved")` will still work
 *  without the index; the combined filter is the perf win.
 *
 *  Note: the `isVerifiedProfessional` flag is treated as redundant
 *  with `verificationStatus === "approved"` and is NOT used in the
 *  query — it's denormalized for client-side convenience (so the
 *  tutor dashboard can show the blue-tick without a second read).
 *  Keeping the query small also keeps the composite index minimal. */
export function buildTutorDiscoveryQuery(): Query {
  const db = getFirestore(getApp());
  return query(
    collection(db, "tutors"),
    where("verificationStatus", "==", "approved"),
    where("hasPendingUpdate", "==", false),
  );
}
