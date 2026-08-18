/**
 * EdumentX — Tutor Repository abstraction
 *
 * The single contract between the student marketplace UI / AI chatbot
 * pipeline and the underlying data source (Firebase or in-memory
 * mock).
 *
 * Two concrete implementations:
 *   - `FirebaseTutorRepository` — wraps the existing
 *     `lib/tutor/firestoreTutorService.ts`. Production default.
 *   - `MockTutorRepository` — in-memory, fully offline.
 *
 * Selection is gated by `EXPO_PUBLIC_USE_MOCK_DATA` and performed by
 * `services/tutors/dataSource.ts` at module load.
 *
 * Method semantics:
 *   - `subscribeTutors` — live list of approved tutors. Pushes one
 *     snapshot then continues to emit on change. Returns an
 *     Unsubscribe handle that the caller must invoke on cleanup.
 *   - `fetchTutorProfile(uid)` — read-once full profile lookup. May
 *     be null when the uid is unknown.
 *   - `searchTutors(filters)` — synchronous-feeling Promise that
 *     applies the filter pipeline and returns ranked matches.
 *     Today only the mock implementation exercises the full filter
 *     pipeline; the Firebase implementation returns all approved
 *     tutors because the live chat path goes through the Supabase
 *     Edge Function (`hybrid_search_tutors` RPC), not the client.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";
import type { TutorProfile } from "@/lib/tutor/types";

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Card-view shape returned by `subscribeTutors` and `searchTutors`.
 * A strict subset of `TutorProfile` — just the fields the card UI
 * needs. Both `FirebaseTutorRepository` and `MockTutorRepository`
 * produce this shape from their native representations.
 */
export interface TutorListing {
  uid: string;
  fullName: string;
  username: string;
  headline: string;
  subjects: string[];
  monthlyRateNpr: number;
  location: { neighborhood: string; city: string };
  /** GPS coordinates for map plotting — present when the profile was
   *  saved through the GPS / map-picker flow (Phase 5.2+). `undefined`
   *  for tutors registered before it existed. Mirrors
   *  `TutorProfile.location.coordinates`. */
  coordinates?: { latitude: number; longitude: number };
  photoUrl: string | null;
  verificationStatus: string;
  isVerifiedProfessional: boolean;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  gender: "male" | "female" | "other" | null;
  tutoringMode: "home" | "online" | "both";
  languages: string[];
  /** Pro subscription tier (Phase 2 Advanced Architecture). Free
   *  tutors rank below Pro in discovery and don't get the badge. */
  subscriptionTier: "free" | "pro";
}

/**
 * Filters applied to the tutor search. Mirrors `SearchConstraints`
 * (the server-side type) but in a client-friendly camelCase shape.
 * All fields are optional; an empty filter object returns the entire
 * approved-tutor set.
 */
export interface TutorSearchFilters {
  subject?: string;
  gradeLevel?: string;
  budgetMax?: number;
  locationText?: string;
  genderPreference?: "male" | "female" | "other";
  tutoringMode?: "home" | "online" | "both";
  language?: string;
  minExperience?: number;
  /** Minimum rating filter (1-5). Tutors below this threshold are excluded. */
  minRating?: number;
  /** Search radius in km. Used with location to filter by proximity. */
  radiusKm?: number;
  verifiedOnly?: boolean;
}

/** Result of a `searchTutors` call. */
export interface TutorSearchResult {
  tutors: TutorListing[];
  totalCount: number;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface TutorRepository {
  /**
   * Subscribe to the live list of approved tutors. Fires once with
   * the current snapshot, then again on every change.
   *
   * Returns an unsubscribe function. Callers MUST invoke it on
   * unmount to avoid leaking the Firestore listener (or, for the
   * mock, the synthetic interval).
   */
  subscribeTutors(
    onData: (tutors: TutorListing[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /**
   * Fetch a single tutor's full profile by uid. Returns `null` when
   * the uid is not found across any of the data source's known
   * paths. Resolves with a `TutorProfile` (the canonical shape).
   */
  fetchTutorProfile(uid: string): Promise<TutorProfile | null>;

  /**
   * Apply the filter pipeline to the dataset and return ranked
   * matches.
   *
   * Default ranking: `isVerifiedProfessional DESC, rating DESC,
   * reviewCount DESC`. Returned list is capped at 5 entries
   * (the chat card limit).
   *
   * The Firebase implementation is a no-op filter — it returns the
   * full list because the live chat pipeline queries Supabase PG
   * via the Edge Function, never this client method.
   *
   * @param cap - Optional result cap (default 5, the chat card limit).
   *   The mock chat pipeline passes a larger cap (20) before a
   *   deterministic sort so the best match can surface even if it
   *   ranked beyond the top-5 by the default order.
   */
  searchTutors(filters: TutorSearchFilters, cap?: number): Promise<TutorSearchResult>;
}