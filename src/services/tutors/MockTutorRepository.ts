/**
 * EdumentX — Mock Tutor Repository
 *
 * In-memory implementation of `TutorRepository`. Returns data from
 * the hand-crafted 30-tutor dataset in `lib/mock/tutors.ts`. Used
 * when `EXPO_PUBLIC_USE_MOCK_DATA=true`.
 *
 * Filter pipeline (per plan §8) is fully implemented — this is the
 * repository the mock chat service relies on for client-side search.
 * Every filter:
 *
 *   - subject (case-insensitive partial on subjects[])
 *   - gradeLevel (exact membership in gradesTeaching[])
 *   - budgetMax (monthlyRateNpr <= budgetMax)
 *   - locationText (case-insensitive substring on city OR neighborhood)
 *   - genderPreference (exact match on gender)
 *   - tutoringMode (tutor.tutoringMode === request OR === "both")
 *   - language (any-overlap on languages[], with empty = "unknown"
 *     tutor skipped rather than rejected)
 *   - minExperience (tutor.yearsExperience >= minExperience)
 *   - verifiedOnly (tutor.isVerifiedProfessional === true)
 *
 * Ranking: `isVerifiedProfessional DESC, rating DESC, reviewCount DESC`.
 * Result capped at 5 entries (chat card limit).
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import { MOCK_TUTORS } from "@/lib/mock/tutors";
import type { TutorProfile } from "@/lib/tutor/types";

import type {
  TutorListing,
  TutorRepository,
  TutorSearchFilters,
  TutorSearchResult,
} from "@/services/tutors/TutorRepository";

// ─── Shape translation ──────────────────────────────────────────────────────

/**
 * Project a canonical `TutorProfile` into the card-view
 * `TutorListing` shape. Both implementations of the Repository
 * expose the same interface, so consumers can't tell which
 * backend is in use.
 */
function profileToListing(t: TutorProfile): TutorListing {
  return {
    uid: t.id,
    fullName: t.fullName,
    username: t.username,
    headline: t.headline,
    subjects: t.subjects,
    monthlyRateNpr: t.monthlyRateNpr,
    location: t.location,
    coordinates: t.location.coordinates,
    photoUrl: t.photoUrl,
    verificationStatus: t.verificationStatus,
    isVerifiedProfessional: t.isVerifiedProfessional,
    rating: t.rating,
    reviewCount: t.reviewCount,
    yearsExperience: t.yearsExperience,
    gender: t.gender,
    tutoringMode: t.tutoringMode,
    languages: t.languages,
    subscriptionTier: t.subscriptionTier ?? "free",
  };
}

// ─── Filter pipeline ─────────────────────────────────────────────────────────

/**
 * Apply the full filter pipeline to the dataset. Each filter is
 * optional; an empty `filters` object returns every approved tutor
 * (filtered only by `verificationStatus === "approved"`, mirroring
 * the live `subscribeTutors` behavior).
 */

// ─── Grade normalization ──────────────────────────────────────────────────────

/**
 * Expand grade-level markers used in conversation but not in the data
 * model. The mock `MOCK_TUTORS` use the canonical string grades ("11",
 * "12") — the parser sometimes produces shorthand like "+2" (Nepali
 * higher-secondary marker for grades 11–12). This mapper expands the
 * shorthand so a single `filters.gradeLevel` token can match the
 * underlying array elements.
 */
function expandGradeLevel(token: string): string[] {
  const normalized = token.trim().toLowerCase();
  if (normalized === "+2" || normalized === "plus 2" || normalized === "plus two" || normalized === "higher secondary") {
    return ["11", "12"];
  }
  return [token];
}

function applyFilters(
  tutors: readonly TutorProfile[],
  filters: TutorSearchFilters,
): TutorProfile[] {
  return tutors.filter((t) => {
    // Approved-only (mirrors Firestore's where clause in
    // firestoreTutorService.ts#subscribeTutors).
    if (t.verificationStatus !== "approved") return false;

    // Subject — case-insensitive partial match on any element of subjects[]
    if (filters.subject) {
      const q = filters.subject.toLowerCase();
      if (!t.subjects.some((s) => s.toLowerCase().includes(q))) return false;
    }

    // Grade — tutor must teach this grade. The filter token is expanded
    // via `expandGradeLevel` so shorthand like "+2" matches "11" / "12"
    // entries in the tutor's `gradesTeaching` array.
    if (filters.gradeLevel) {
      const acceptable = expandGradeLevel(filters.gradeLevel);
      const teachesOne = acceptable.some((g) => t.gradesTeaching.includes(g));
      if (!teachesOne) return false;
    }

    // Budget — monthlyRateNpr <= budgetMax
    if (filters.budgetMax != null) {
      if (t.monthlyRateNpr > filters.budgetMax) return false;
    }

    // Location — case-insensitive match on city OR neighborhood
    if (filters.locationText) {
      const q = filters.locationText.toLowerCase();
      const loc = `${t.location.neighborhood} ${t.location.city}`.toLowerCase();
      if (!loc.includes(q)) return false;
    }

    // Gender
    if (filters.genderPreference) {
      if (t.gender !== filters.genderPreference) return false;
    }

    // Tutoring mode — tutor's mode must cover the requested mode.
    // "both" satisfies both "home" and "online".
    if (filters.tutoringMode) {
      if (
        t.tutoringMode !== "both" &&
        t.tutoringMode !== filters.tutoringMode
      ) {
        return false;
      }
    }

    // Language — any-overlap. An empty languages array means
    // "unknown" (post-migration fallback) and the filter is
    // SKIPPED for that tutor rather than rejecting them.
    if (filters.language) {
      if (t.languages.length === 0) {
        // unknown — skip filter
      } else {
        const has = t.languages.some(
          (l) => l.toLowerCase() === filters.language!.toLowerCase(),
        );
        if (!has) return false;
      }
    }

    // Experience
    if (filters.minExperience != null) {
      if (t.yearsExperience < filters.minExperience) return false;
    }

    // Verified only — already filtered by isVerifiedProfessional;
    // this is a separate intent field
    if (filters.verifiedOnly && !t.isVerifiedProfessional) return false;

    // Min rating — tutor must meet or exceed the rating floor
    if (filters.minRating != null) {
      if (t.rating < filters.minRating) return false;
    }

    // Radius — this filter is a placeholder for future map integration.
    // Currently, if radiusKm is set AND locationText is also set, we don't
    // have real distance data for mock tutors (all distanceKm = 0). So we
    // skip proximity filtering for now — the radius field is populated by
    // the constraint parser but the actual distance check will be done by
    // the Edge Function when the map module is available.
    // (radiusKm is accepted but not applied in the mock)

    return true;
  });
}

/**
 * Rank results. Verified first, then by rating, then by review
 * count. Slice to the chat-card cap of 5.
 */
function rankAndCap(results: TutorProfile[], cap = 5): TutorProfile[] {
  const ranked = [...results].sort((a, b) => {
    if (a.isVerifiedProfessional !== b.isVerifiedProfessional) {
      return a.isVerifiedProfessional ? -1 : 1;
    }
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });
  return ranked.slice(0, cap);
}

// ─── Implementation ──────────────────────────────────────────────────────────

export const MockTutorRepository: TutorRepository = {
  /**
   * Emit the dataset once. The mock has no notion of live updates
   * — fire the snapshot immediately, then return a no-op
   * unsubscribe.
   */
  subscribeTutors(onData, _onError) {
    // Project to listings synchronously, push to caller.
    const listings = MOCK_TUTORS.map(profileToListing);
    onData(listings);

    // No-op unsubscribe — the mock doesn't subscribe to anything.
    const noop: Unsubscribe = () => {};
    return noop;
  },

  /**
   * Fetch a single tutor profile by id. Returns null when not
   * found.
   */
  async fetchTutorProfile(uid: string): Promise<TutorProfile | null> {
    if (!uid || typeof uid !== "string") return null;
    const found = MOCK_TUTORS.find((t) => t.id === uid);
    return found ?? null;
  },

  /**
   * Full filter pipeline + ranking. Used by the mock chat service
   * to satisfy tutor recommendation requests without a server
   * round-trip.
   */
  async searchTutors(filters: TutorSearchFilters, cap = 5): Promise<TutorSearchResult> {
    const filtered = applyFilters(MOCK_TUTORS, filters);
    const ranked = rankAndCap(filtered, cap);
    const listings = ranked.map(profileToListing);
    return { tutors: listings, totalCount: filtered.length };
  },
};