/**
 * EdumentX — Review Repository
 *
 * Single contract for writing + reading student reviews of a tutor.
 * Two concrete implementations (Firebase + Mock) — selected by
 * `EXPO_PUBLIC_USE_MOCK_DATA` via the dataSource selector.
 *
 * Why a separate repository (not folded into `EnrollmentRepository`):
 *   - Reviews are independent of enrollments — a student can review
 *     a tutor without an active enrollment (e.g. after a trial
 *     session).
 *   - The rules at `match /reviews/{tutorUid}/reviews/{reviewId}`
 *     have a different shape (delete-by-student-or-admin, single-doc
 *     aggregation on the profile subdoc) than the enrollment rules.
 *
 * The `submitReview` method runs a `runTransaction` that:
 *   1. Reads the tutor's profile subdoc to compute the running
 *      average (new rating = (oldRating * oldCount + newScore) /
 *      (oldCount + 1)) and category / breakdown counters.
 *   2. Writes the new review doc.
 *   3. Writes the aggregated counters back to the profile subdoc.
 *
 * Aggregation is client-side because Cloud Functions are out of
 * scope per CLAUDE.md §6. The transaction guards against
 * concurrent-review races — two students submitting simultaneously
 * will serialize on the same profile doc and the second one will
 * see the first's write.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type {
  CategoryRatings,
  Review,
} from "@/lib/tutor/types";

// ─── Inputs ─────────────────────────────────────────────────────────────────

export type SubmitReviewInput = {
  tutorUid: string;
  studentUid: string;
  studentName: string;
  studentAvatar: string | null;
  /** 1–5 — the headline "overall" score. */
  score: number;
  /** Sub-axis scores; same shape as TutorProfile.categoryRatings. */
  categoryRatings: CategoryRatings;
  /** Free-text comment. May be empty (1–5 stars only). */
  comment: string;
};

// ─── Repository contract ────────────────────────────────────────────────────

export interface ReviewRepository {
  /** Live list of a tutor's reviews, newest first. */
  subscribeReviews(
    tutorUid: string,
    onData: (reviews: Review[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /** Atomic submit: writes the review + aggregates counters. */
  submitReview(input: SubmitReviewInput): Promise<{ reviewId: string }>;

  /** Soft-delete a review. The tutor's counters roll back. */
  deleteReview(
    reviewId: string,
    actorUid: string,
    isAdmin: boolean,
  ): Promise<void>;
}