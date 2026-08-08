/**
 * EdumentX AI — Constraint Types
 *
 * Defines the structured constraints extracted from student messages.
 * These are accumulated across conversation turns and used to build
 * SQL queries for tutor search.
 */

/** Structured search constraints extracted from natural language */
export interface SearchConstraints {
  /** Subject the student wants to study (e.g., "Mathematics", "Physics") */
  subject?: string;

  /** Maximum monthly budget in NPR */
  budget_max?: number;

  /** Minimum monthly budget in NPR (for price range queries) */
  budget_min?: number;

  /** Location text (e.g., "Baneshwor", "Kathmandu", "Lalitpur") */
  location_text?: string;

  /** Search radius in kilometers (default: 10, used when map is ready) */
  radius_km?: number;

  /** Gender preference for tutor (male, female, or other) */
  gender_preference?: "male" | "female" | "other";

  /** Preferred tutoring mode */
  tutoring_mode?: "online" | "home_tuition";

  /** Grade or level (e.g., "9", "10", "11", "12", "Bachelor") */
  grade_level?: string;

  /** Preferred language of instruction */
  language?: string;

  /** Minimum rating (1-5) */
  min_rating?: number;

  /** Minimum years of experience */
  min_experience?: number;

  /** Whether to show only verified tutors. NOT defaulted to true — mock
   *  never sets it, so real mode must not either (it made the RPC filter
   *  `is_verified_professional = true` on every search, diverging from
   *  mock and silently dropping tutors missing that flag). Only set when
   *  the user explicitly asks for verified tutors. */
  verified_only?: boolean;

  /** Free-text query for semantic search (built from all constraints) */
  query_text?: string;

  /**
   * Subject synonym terms (label + every keyword) used by the RPC's
   * `s ILIKE ANY($terms)` matching. Transient — populated by
   * `hybridSearch.buildConstraintsJson`, never persisted to the pill
   * strip. Without it, "Mathematics" searches miss tutors who listed
   * "Math".
   */
  subject_terms?: string[];

  /**
   * Opt-out signal for the location requirement. Set to "anywhere"
   * when the user says "anywhere", "doesn't matter", "no preference",
   * or similar — the assistant should NOT keep re-asking for a city.
   *
   * KEEP IN SYNC with `lib/ai/minimumConstraints.ts` (client mirror).
   */
  location_preference?: "anywhere" | "near_me";
}

/** Map of field names to human-readable labels for LLM prompts */
export const CONSTRAINT_LABELS: Record<keyof SearchConstraints, string> = {
  subject: "Subject",
  budget_max: "Maximum budget (NPR)",
  budget_min: "Minimum budget (NPR)",
  location_text: "Location",
  radius_km: "Search radius (km)",
  gender_preference: "Gender preference",
  tutoring_mode: "Tutoring mode (online/home_tuition)",
  grade_level: "Grade or level",
  language: "Language of instruction",
  min_rating: "Minimum rating (1-5)",
  min_experience: "Minimum experience (years)",
  verified_only: "Verified tutors only",
  query_text: "Search query text",
  subject_terms: "Subject synonym terms",
  location_preference: "Location preference (anywhere/near_me)",
};

/** Fields that are "core" — we need at least a subject before searching */
export const CORE_CONSTRAINT_FIELDS: (keyof SearchConstraints)[] = ["subject"];
