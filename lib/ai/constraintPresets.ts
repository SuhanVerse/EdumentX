/**
 * EdumentX — AI Quick-Chip Presets
 *
 * Each chip carries:
 *   - id           — stable identifier for analytics
 *   - label        — text the chip displays AND sends to the bot
 *   - constraints  — direct constraint updates applied to the Zustand
 *                    store BEFORE the message is sent, so the pill strip
 *                    shows them immediately and the bot never re-asks.
 *   - resolve      — optional hook called at tap time for chips that
 *                    need student-profile data not available at module
 *                    load (e.g. saved location).
 *
 * Bug #13: chips used to be tapped as raw text, so the assistant
 * re-asked for the very constraint the chip already implied. The fix
 * is to make the chip's `constraints` authoritative — the chip "taps
 * as" { subject, budget_max, ... } not as text.
 */

import type { ClientSearchConstraints } from "./minimumConstraints.ts";

export interface ConstraintPreset {
  id: string;
  label: string;
  constraints: Partial<ClientSearchConstraints>;
  /**
   * Optional hook to resolve constraints at tap time. Used by
   * `saved-location` which needs the student's saved profile city.
   * Receives the current constraints and returns the resolved patch.
   */
  resolve?: (
    current: ClientSearchConstraints,
    context: { savedCity?: string; savedNeighborhood?: string },
  ) => Partial<ClientSearchConstraints>;
}

export const QUICK_CHIPS: ReadonlyArray<ConstraintPreset> = [
  {
    id: "maths-cheap",
    label: "Maths tutor under Rs 7,000",
    constraints: { subject: "Mathematics", budget_max: 7000 },
  },
  {
    id: "physics-plus2",
    label: "Physics for +2 Science",
    constraints: { subject: "Physics", grade_level: "+2" },
  },
  {
    id: "saved-location",
    label: "Near my saved location",
    constraints: {},
    resolve: (_current, ctx) => {
      // Prefer neighborhood over city — it's more specific. Falls back
      // to city if the student only saved the city.
      if (ctx.savedNeighborhood) return { location_text: ctx.savedNeighborhood };
      if (ctx.savedCity) return { location_text: ctx.savedCity };
      return {};
    },
  },
  {
    id: "verified-only",
    label: "Verified tutors only",
    constraints: { verified_only: true },
  },
  {
    // Quick-relief chip surfaced when the bot returns "No tutors match".
    // The label is parsed by `clientConstraintParser` to set
    // `location_preference: "anywhere"` (and clear any pre-set
    // `location_text`), satisfying the minimum-constraint gate so the
    // search proceeds without re-asking.
    id: "any-location",
    label: "Anywhere is fine",
    constraints: {
      location_preference: "anywhere",
      location_text: undefined,
    },
  },
  {
    // Quick-relief chip for users who want to broaden the grade range.
    // Clears any specific grade so the search runs across all grades.
    id: "any-grade",
    label: "Any grade",
    constraints: { grade_level: undefined },
  },
];