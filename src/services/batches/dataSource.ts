/**
 * EdumentX — Batches Repository selector
 *
 * Single source of truth for "which BatchesRepository should the
 * app use?" Selected once at module load from
 * `EXPO_PUBLIC_USE_MOCK_DATA` — same pattern as
 * `services/tutors/dataSource.ts` and
 * `services/enrollments/dataSource.ts`, so all three toggles stay in
 * lockstep.
 *
 * Callers should use `getBatchesRepository()` (singleton accessor)
 * rather than importing `FirebaseBatchesRepository` or
 * `MockBatchesRepository` directly.
 */

import { FirebaseBatchesRepository } from "./FirebaseBatchesRepository";
import { MockBatchesRepository } from "./MockBatchesRepository";
import type { BatchesRepository } from "./BatchesRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  console.log("[batches] USE_MOCK_DATA=true — using MockBatchesRepository.");
} else {
  console.log(
    "[batches] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseBatchesRepository (production).",
  );
}

/** Returns the active `BatchesRepository` singleton (chosen once at
 *  module load — restart the app to change it). */
export function getBatchesRepository(): BatchesRepository {
  return isMockEnabled ? MockBatchesRepository : FirebaseBatchesRepository;
}
