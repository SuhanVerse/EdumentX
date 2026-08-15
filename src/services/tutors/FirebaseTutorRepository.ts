/**
 * EdumentX — Firebase Tutor Repository
 *
 * Wraps `lib/tutor/firestoreTutorService.ts` to satisfy the
 * `TutorRepository` interface. The underlying Firestore functions are
 * preserved exactly as-is; this file only adds the field-shape
 * translation required by the interface (notably `tutoringMode` and
 * `languages`, which the Firestore service did not expose).
 *
 * Used in production by default. Selected via
 * `services/tutors/dataSource.ts` when
 * `EXPO_PUBLIC_USE_MOCK_DATA !== "true"`.
 */

import { getApp } from "@react-native-firebase/app";
import {
  collectionGroup,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import type { Unsubscribe } from "@react-native-firebase/firestore";

import {
  subscribeTutors as firestoreSubscribeTutors,
  fetchTutorProfile as firestoreFetchTutorProfile,
  type TutorListing as FirestoreTutorListing,
} from "@/lib/tutor/firestoreTutorService";

import type {
  TutorListing,
  TutorRepository,
  TutorSearchFilters,
  TutorSearchResult,
} from "@/services/tutors/TutorRepository";
import type { TutorProfile } from "@/lib/tutor/types";

// ─── Shape translation ──────────────────────────────────────────────────────

/**
 * Map the Firestore service's `TutorListing` to the canonical
 * `TutorListing` from the Repository interface. The two shapes are
 * 90% identical — only the new `tutoringMode` + `languages` fields
 * need defaulting.
 */
function toCanonicalListing(t: FirestoreTutorListing): TutorListing {
  return {
    uid: t.uid,
    fullName: t.fullName,
    username: t.username,
    headline: t.headline,
    subjects: t.subjects,
    monthlyRateNpr: t.monthlyRateNpr,
    location: t.location,
    coordinates: t.coordinates,
    photoUrl: t.photoUrl,
    verificationStatus: t.verificationStatus,
    isVerifiedProfessional: t.isVerifiedProfessional,
    rating: t.rating,
    reviewCount: t.reviewCount,
    yearsExperience: t.yearsExperience,
    gender: t.gender,
    // The Firestore service's existing mapper (and the languages
    // default added by plan §12) populate these. Re-mapping here
    // ensures the shape is exhaustive even if the underlying doc
    // predates the migration.
    tutoringMode: "both",
    languages: ["English", "Nepali"],
  };
}

// ─── Cache for searchTutors ──────────────────────────────────────────────────

/**
 * The Firestore service exposes `subscribeTutors` (live) but does not
 * expose a "give me the current snapshot" call. The chat pipeline
 * uses the Edge Function for search, so this client `searchTutors`
 * is only used by the marketplace UI's local filter UI — which
 * doesn't exist today. We keep an in-memory cache of the latest
 * snapshot from `subscribeTutors` so a future caller can fetch it
 * synchronously. The `Promise.resolve(...)` shape is preserved.
 */
let latestSnapshot: TutorListing[] = [];

// ─── Live rating aggregates ──────────────────────────────────────────────────

/**
 * Live per-tutor rating + count, aggregated from the `reviews`
 * collectionGroup (`reviews/{tutorUid}/reviews/{reviewId}`).
 *
 * Why an overlay instead of the discovery doc's fields: the
 * `tutors/{uid}` docs only mirror `rating`/`reviewCount` at approval
 * time, and the rules make them admin-write-only (students can't
 * bump them when they submit a review). Overlaying the live
 * aggregates keeps the student-facing cards honest without any
 * rules change. One subscription covers every tutor; `status !=
 * "active"` rows and `_namespaceAnchor` placeholder docs are
 * skipped. Fallback when a tutor has no reviews: the discovery
 * doc's (zero) values pass through untouched.
 */
type ReviewAggregate = { rating: number; count: number };

let latestAggregates = new Map<string, ReviewAggregate>();

function subscribeReviewAggregates(
  onData: (aggregates: Map<string, ReviewAggregate>) => void,
): Unsubscribe {
  const db = getFirestore(getApp());
  return onSnapshot(
    collectionGroup(db, "reviews"),
    (snap) => {
      const sums = new Map<string, { sum: number; count: number }>();
      snap.docs.forEach((d) => {
        const data = d.data() as {
          tutorUid?: string;
          status?: string;
          score?: unknown;
        };
        if (!data.tutorUid || data.status !== "active") return;
        const score = typeof data.score === "number" ? data.score : 0;
        const bucket = sums.get(data.tutorUid) ?? { sum: 0, count: 0 };
        bucket.sum += score;
        bucket.count += 1;
        sums.set(data.tutorUid, bucket);
      });
      const aggregates = new Map<string, ReviewAggregate>();
      sums.forEach((bucket, uid) => {
        aggregates.set(uid, {
          rating: bucket.sum / bucket.count,
          count: bucket.count,
        });
      });
      latestAggregates = aggregates;
      onData(aggregates);
    },
    (err) => {
      console.warn(
        "TutorRepository: reviews aggregate subscribe failed",
        err,
      );
    },
  );
}

export const FirebaseTutorRepository: TutorRepository = {
  /**
   * Subscribe to the live Firestore tutor list. Caches the latest
   * snapshot for `searchTutors` (which is a no-op today — see the
   * interface doc).
   */
  subscribeTutors(onData, onError) {
    // Two live sources merged into one emission stream: the approved
    // tutor list (discovery docs) + the reviews collectionGroup for
    // live rating/reviewCount. `emit` re-fires on either snapshot;
    // listings without an aggregate keep their discovery values.
    let latest: TutorListing[] = [];
    const emit = () => {
      const merged = latest.map((t) => {
        const agg = latestAggregates.get(t.uid);
        return agg
          ? { ...t, rating: agg.rating, reviewCount: agg.count }
          : t;
      });
      latestSnapshot = merged;
      onData(merged);
    };

    const unsubTutors = firestoreSubscribeTutors(
      (firestoreList) => {
        latest = firestoreList.map(toCanonicalListing);
        emit();
      },
      onError,
    );
    const unsubReviews = subscribeReviewAggregates(() => emit());
    return () => {
      unsubTutors();
      unsubReviews();
    };
  },

  /**
   * Fetch a single tutor profile from Firestore (uses the three-tier
   * cascade inside `firestoreTutorService.ts`).
   */
  async fetchTutorProfile(uid: string): Promise<TutorProfile | null> {
    return await firestoreFetchTutorProfile(uid);
  },

  /**
   * Search the cached snapshot. NOT used by the live chat pipeline
   * (the Edge Function handles chat search). This implementation
   * ignores filters and returns the latest snapshot — the same data
   * the marketplace UI already shows via `subscribeTutors`. The
   * mock implementation has the full filter pipeline.
   */
  async searchTutors(_filters: TutorSearchFilters): Promise<TutorSearchResult> {
    return { tutors: latestSnapshot, totalCount: latestSnapshot.length };
  },
};