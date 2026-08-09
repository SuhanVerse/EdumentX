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

export const FirebaseTutorRepository: TutorRepository = {
  /**
   * Subscribe to the live Firestore tutor list. Caches the latest
   * snapshot for `searchTutors` (which is a no-op today — see the
   * interface doc).
   */
  subscribeTutors(onData, onError) {
    return firestoreSubscribeTutors(
      (firestoreList) => {
        const canonical = firestoreList.map(toCanonicalListing);
        latestSnapshot = canonical;
        onData(canonical);
      },
      onError,
    );
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