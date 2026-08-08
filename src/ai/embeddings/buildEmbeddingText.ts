/**
 * EdumentX AI — Embedding Text Builder
 *
 * Builds rich text from tutor profile data for embedding generation.
 * The quality of this text directly affects semantic search quality.
 *
 * Strategy: concatenate meaningful profile fields into a natural
 * paragraph that captures the tutor's identity, teaching style,
 * expertise, and specialties.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TutorEmbeddingSource {
  full_name: string;
  headline: string;
  bio: string;
  subjects: string[];
  grades_teaching: string[];
  years_experience: number;
  degree: string;
  institution: string;
  neighborhood: string;
  city: string;
  /** Monthly rate in NPR — included so budget queries rank better. */
  monthly_rate_npr?: number;
  /** Gender — included so "female tutor" / "male tutor" queries match. */
  gender?: string;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build rich text from tutor profile for embedding.
 * The output is a natural-language paragraph describing the tutor.
 *
 * @param tutor - Tutor profile data
 * @returns Rich text string suitable for embedding
 */
export function buildEmbeddingText(tutor: Partial<TutorEmbeddingSource>): string {
  const parts: string[] = [];

  // 1. Headline (most important — captures the tutor's core value)
  if (tutor.headline) {
    parts.push(tutor.headline);
  }

  // 2. Bio (detailed description of teaching style and approach)
  if (tutor.bio) {
    parts.push(tutor.bio);
  }

  // 3. Subjects taught
  if (tutor.subjects && tutor.subjects.length > 0) {
    parts.push(`Teaches: ${tutor.subjects.join(", ")}.`);
  }

  // 4. Grade levels
  if (tutor.grades_teaching && tutor.grades_teaching.length > 0) {
    parts.push(`For grades: ${tutor.grades_teaching.join(", ")}.`);
  }

  // 5. Qualifications
  const qualifications: string[] = [];
  if (tutor.degree) qualifications.push(tutor.degree);
  if (tutor.institution) qualifications.push(tutor.institution);
  if (tutor.years_experience && tutor.years_experience > 0) {
    qualifications.push(`${tutor.years_experience} years of teaching experience`);
  }
  if (qualifications.length > 0) {
    parts.push(`Qualification: ${qualifications.join(", ")}.`);
  }

  // 6. Budget (monthly rate) — helps "under Rs 5000" queries match.
  if (tutor.monthly_rate_npr && tutor.monthly_rate_npr > 0) {
    parts.push(`Monthly rate around Rs ${tutor.monthly_rate_npr}.`);
  }

  // 7. Gender — helps "female tutor" / "male tutor" queries match.
  if (tutor.gender) {
    parts.push(`${tutor.gender.charAt(0).toUpperCase()}${tutor.gender.slice(1)} tutor.`);
  }

  // 8. Location
  const location = [tutor.neighborhood, tutor.city].filter(Boolean).join(", ");
  if (location) {
    parts.push(`Located in ${location}.`);
  }

  return parts.join(" ").trim();
}

/**
 * Build embedding text specifically for student search queries.
 * Converts student constraints into a natural search query.
 */
export function buildSearchQueryText(constraints: {
  subject?: string;
  grade_level?: string;
  budget_max?: number;
  location_text?: string;
  gender_preference?: string;
  // NOTE: tutoring_mode / language are deliberately NOT part of the semantic
  // query — they are SQL-only filters (migration 010).
}): string {
  const parts: string[] = [];

  if (constraints.subject) {
    parts.push(constraints.subject);
  }

  if (constraints.grade_level) {
    parts.push(`for grade ${constraints.grade_level}`);
  }

  // Budget — keep the amount in the semantic query so tutors whose rate
  // matches rank higher ("under Rs 5000" ↔ "Monthly rate around Rs 5000").
  if (constraints.budget_max) {
    parts.push(`under Rs ${constraints.budget_max}`);
  }

  // Location — "in Kathmandu" / "in Baneshwor"
  if (constraints.location_text) {
    parts.push(`in ${constraints.location_text}`);
  }

  // Gender preference — "female tutor" / "male tutor"
  if (constraints.gender_preference) {
    parts.push(`${constraints.gender_preference} tutor`);
  }

  // NOTE: `language` and `tutoring_mode` are intentionally NOT included in
  // the semantic query text — they are enforced as SQL filters only (see
  // migration 010). Keeping them out of the embedding prevents them from
  // skewing semantic similarity.

  // Add context words that help match tutor bios
  parts.push("tutor");
  parts.push("teaching");
  parts.push("help");

  return parts.join(" ").trim();
}
