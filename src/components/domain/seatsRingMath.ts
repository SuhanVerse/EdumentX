/**
 * EdumentX — SeatsRing math
 *
 * Pure helpers for the `SeatsRing` capacity ring, kept OUT of the
 * component file so they're unit-testable in plain node (the
 * component imports react-native, which the node:test runner can't
 * load). The component maps the color key to token hexes.
 */

/** Status color keys for the ring arc — mapped to design tokens by
 *  the component (`colors.semantic.danger`, `colors.brand.accent`,
 *  `colors.brand.verification`). */
export type SeatsRingColorKey = "danger" | "accent" | "verification";

/** Clamp `seatsLeft / max` to [0, 1] — the fraction of the ring's
 *  circumference the remaining-seats arc covers. Negative seats
 *  (over-capacity) → 0 (empty arc); overflow → 1 (full ring); a
 *  degenerate `max <= 0` → 0. */
export function seatsRingFrac(seatsLeft: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, seatsLeft / max));
}

/** Center label — "Full" at zero (or below), otherwise the count. */
export function seatsRingLabel(seatsLeft: number): string {
  return seatsLeft <= 0 ? "Full" : `${seatsLeft}`;
}

/** Arc color: danger red at 0 seats, amber at exactly 1, verification
 *  green while seats remain. */
export function seatsRingColorKey(seatsLeft: number): SeatsRingColorKey {
  if (seatsLeft <= 0) return "danger";
  if (seatsLeft === 1) return "accent";
  return "verification";
}
