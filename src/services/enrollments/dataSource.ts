/**
 * EdumentX — Enrollment Repository selector
 *
 * Single source of truth for "which EnrollmentRepository should the
 * app use?" Selected once at module load from
 * `EXPO_PUBLIC_USE_MOCK_DATA`. Mirrors `services/tutors/dataSource.ts`
 * exactly so the two toggles stay in lockstep.
 *
 * Default (production): `FirebaseEnrollmentRepository`. Selected by
 * setting `EXPO_PUBLIC_USE_MOCK_DATA=true` in `.env`.
 *
 * Callers should use `getEnrollmentRepository()` (singleton accessor)
 * rather than importing `FirebaseEnrollmentRepository` or
 * `MockEnrollmentRepository` directly.
 */

import { FirebaseEnrollmentRepository } from "./FirebaseEnrollmentRepository";
import { MockEnrollmentRepository } from "./MockEnrollmentRepository";
import type { EnrollmentRepository } from "./EnrollmentRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  // eslint-disable-next-line no-console
  console.log(
    "[enrollments] USE_MOCK_DATA=true — using MockEnrollmentRepository.",
  );
} else {
  // eslint-disable-next-line no-console
  console.log(
    "[enrollments] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseEnrollmentRepository (production).",
  );
}

export function getEnrollmentRepository(): EnrollmentRepository {
  return isMockEnabled ? MockEnrollmentRepository : FirebaseEnrollmentRepository;
}

/** Convenience for `isMockDataEnabled` (same name as the tutor
 *  module exposes). Both selectors share the same env var. */
export function isMockDataEnabled(): boolean {
  return isMockEnabled;
}
