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

  // 6. Location
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
  tutoring_mode?: string;
  language?: string;
}): string {
  const parts: string[] = [];

  if (constraints.subject) {
    parts.push(constraints.subject);
  }

  if (constraints.grade_level) {
    parts.push(`for grade ${constraints.grade_level}`);
  }

  if (constraints.language) {
    parts.push(`in ${constraints.language}`);
  }

  if (constraints.tutoring_mode === "online") {
    parts.push("online tutoring");
  }

  // Add context words that help match tutor bios
  parts.push("tutor");
  parts.push("teaching");
  parts.push("help");

  return parts.join(" ").trim();
}
