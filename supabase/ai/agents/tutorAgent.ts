/**
 * EdumentX AI — Tutor Agent
 *
 * Helper functions for formatting tutor data for display.
 * Used by the response generator and the TutorCard component.
 */

import type { TutorResult } from "../types/conversation.types.ts";

/**
 * Format a tutor result as a concise text description.
 */
export function formatTutorResult(tutor: TutorResult): string {
  const parts: string[] = [];

  parts.push(tutor.full_name);

  if (tutor.headline) {
    parts.push(`— ${tutor.headline}`);
  }

  parts.push(
    `[Rs ${tutor.monthly_rate_npr.toLocaleString()}/mo | ` +
    `${tutor.rating.toFixed(1)}⭐ | ${tutor.years_experience}yr | ` +
    `${tutor.city}${tutor.neighborhood ? `, ${tutor.neighborhood}` : ""}]`
  );

  if (tutor.bio) {
    parts.push(`Bio: "${tutor.bio.slice(0, 100)}${tutor.bio.length > 100 ? "..." : ""}"`);
  }

  return parts.join(" ");
}

/**
 * Format a tutor's location for display.
 */
export function formatTutorLocation(tutor: TutorResult): string {
  const parts: string[] = [];
  if (tutor.neighborhood) parts.push(tutor.neighborhood);
  if (tutor.city) parts.push(tutor.city);
  return parts.join(", ") || "Location not specified";
}

/**
 * Format price with NPR currency.
 */
export function formatPrice(amount: number): string {
  return `Rs ${amount.toLocaleString()}`;
}

/**
 * Get a short tagline for a tutor (for inline cards).
 */
export function getTutorTagline(tutor: TutorResult): string {
  if (tutor.headline) return tutor.headline;
  if (tutor.subjects.length > 0) return tutor.subjects.slice(0, 2).join(", ");
  return "Tutor";
}

/**
 * Determine if a tutor is a "budget match" based on constraints.
 */
export function isBudgetMatch(
  tutor: TutorResult,
  maxBudget?: number,
): boolean {
  if (!maxBudget) return true;
  return tutor.monthly_rate_npr <= maxBudget;
}

/**
 * Get a similarity label for display.
 */
export function getSimilarityLabel(similarity: number): string {
  // Cosine distance: 0 = identical, 2 = opposite
  // Convert to a human-friendly label
  if (similarity <= 0.3) return "Excellent match";
  if (similarity <= 0.6) return "Good match";
  if (similarity <= 1.0) return "Fair match";
  return "Partial match";
}
