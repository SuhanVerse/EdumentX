/**
 * EdumentX — Seed tutor profile adapter
 *
 * Since `MOCK_TUTORS` in `lib/mock/tutors.ts` already conforms to the
 * canonical `TutorProfile` shape (no parallel "Tutor" type), this
 * adapter is a passthrough. It exists so that legacy callers can keep
 * using `getMockTutorProfile(id)` without changing their imports.
 *
 * If the mock dataset is ever slimmed down to a subset of the
 * canonical type, restore the field-mapping logic here.
 *
 * Reusable pattern: any future fixture file can adopt the same shape
 * — write `const FIXTURES: readonly TutorProfile[]` and skip the
 * adapter.
 */

import { MOCK_TUTORS, type TutorProfile } from "@/lib/mock/tutors";

/** Re-export the canonical TutorProfile type for callers that
 *  previously imported it from here. */
export type { TutorProfile };

/**
 * Identity passthrough. MOCK_TUTORS is already typed as
 * `readonly TutorProfile[]`, so no field mapping is needed.
 */
export function buildTutorProfile(tutor: TutorProfile): TutorProfile {
  return tutor;
}

/**
 * Get a tutor profile by ID from the mock seed. Returns undefined
 * when the id is not present.
 */
export function getMockTutorProfile(id: string): TutorProfile | undefined {
  return MOCK_TUTORS.find((t) => t.id === id);
}