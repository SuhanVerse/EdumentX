/**
 * EdumentX AI — Constraint Merger
 *
 * Merges newly extracted constraints with existing session constraints.
 * New values override old ones, null/undefined values preserve existing.
 *
 * This allows the conversation to build up constraints incrementally:
 *   User 1: "I need a Maths tutor"
 *   → constraints: { subject: "Mathematics" }
 *   User 2: "Budget around Rs 5000"
 *   → constraints: { subject: "Mathematics", budget_max: 5000 }
 */

import type { SearchConstraints } from "../types/constraints.types.ts";

/**
 * Merge new constraints with existing ones.
 *
 * Rules:
 *   1. New explicit values override old ones
 *   2. null/undefined values in the new object preserve existing values
 *   3. Empty object returns the existing constraints unchanged
 *   4. The `query_text` is rebuilt if any core field changes
 *
 * @param existing - Current constraints from session state
 * @param incoming - Newly extracted constraints
 * @returns Merged constraints
 */
export function mergeConstraints(
  existing: SearchConstraints,
  incoming: Partial<SearchConstraints>,
): SearchConstraints {
  // Filter out null/undefined values from incoming
  const definedIncoming = Object.fromEntries(
    Object.entries(incoming).filter(
      ([_, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

  if (Object.keys(definedIncoming).length === 0) {
    return { ...existing };
  }

  // Build merged result
  const merged: SearchConstraints = {
    ...existing,
  };

  // Apply each incoming value (only defined ones)
  for (const [key, value] of Object.entries(definedIncoming)) {
    (merged as Record<string, unknown>)[key] = value;
  }

  // Rebuild query_text if core fields changed
  const coreFields: (keyof SearchConstraints)[] = [
    "subject", "budget_max", "budget_min", "location_text",
    "grade_level", "gender_preference", "tutoring_mode",
  ];

  const coreChanged = coreFields.some(
    (f) => f in definedIncoming,
  );

  if (coreChanged) {
    merged.query_text = buildQueryText(merged);
  }

  return merged;
}

/**
 * Reset specific constraints (e.g., when user says "Actually, I want something different").
 * If no fields are specified, resets all search constraints.
 *
 * @param existing - Current constraints
 * @param fieldsToReset - Specific fields to reset (default: all)
 * @returns Reset constraints
 */
export function resetConstraints(
  existing: SearchConstraints,
  fieldsToReset?: (keyof SearchConstraints)[],
): SearchConstraints {
  const reset: SearchConstraints = { ...existing };

  const fields = fieldsToReset ?? [
    "subject", "budget_max", "budget_min", "location_text",
    "radius_km", "gender_preference", "tutoring_mode",
    "grade_level", "language", "min_rating", "min_experience",
    "query_text",
  ];

  for (const field of fields) {
    delete reset[field];
  }

  return reset;
}

/**
 * Check if we have enough constraints to perform a search.
 *
 * The minimum bar is **subject + grade + budget** (Phase 2).
 * Location is NO LONGER required — students can volunteer it or
 * say "anywhere". Optional fields like gender, experience, language,
 * and tutoring_mode are picked up when the student volunteers them
 * — we never block on them.
 *
 * Mirrored client-side at `lib/ai/minimumConstraints.ts` so the Zustand
 * store can compute the same gate without a roundtrip. Keep the two in
 * sync.
 */
export function hasMinimumConstraints(constraints: SearchConstraints): boolean {
  const hasSubject =
    constraints.subject !== undefined &&
    constraints.subject !== null &&
    constraints.subject.trim().length > 0;

  const hasGrade =
    constraints.grade_level !== undefined &&
    constraints.grade_level !== null &&
    String(constraints.grade_level).trim().length > 0;

  const hasBudget =
    constraints.budget_max !== undefined &&
    constraints.budget_max !== null &&
    constraints.budget_max > 0;

  return Boolean(hasSubject && hasGrade && hasBudget);
}

/**
 * Get a list of missing core fields that the bot should still ask about.
 * The question picker (`state/states.ts#getNextQuestion`) reads this list
 * to decide which clarifying question to ask next.
 *
 * Phase 2: budget replaces location in the minimum set.
 */
export function getMissingCoreFields(constraints: SearchConstraints): string[] {
  const missing: string[] = [];

  if (!constraints.subject) {
    missing.push("subject");
  }
  if (!constraints.grade_level) {
    missing.push("grade");
  }
  if (
    constraints.budget_max === undefined ||
    constraints.budget_max === null ||
    constraints.budget_max <= 0
  ) {
    missing.push("budget");
  }

  return missing;
}

/**
 * Build a natural-language query text from constraints.
 * This text is used for semantic search (embedding generation).
 */
function buildQueryText(constraints: SearchConstraints): string {
  const parts: string[] = [];

  if (constraints.subject) {
    parts.push(constraints.subject);
  }

  if (constraints.grade_level) {
    parts.push(`for ${constraints.grade_level}`);
  }

  if (constraints.budget_max) {
    parts.push(`under Rs ${constraints.budget_max}`);
  }

  if (constraints.location_text) {
    parts.push(`in ${constraints.location_text}`);
  }

  if (constraints.gender_preference) {
    parts.push(`${constraints.gender_preference} tutor`);
  }

  if (constraints.tutoring_mode) {
    parts.push(constraints.tutoring_mode);
  }

  if (constraints.language) {
    parts.push(`in ${constraints.language}`);
  }

  parts.push("tutor teaching");

  return parts.join(" ").trim();
}
