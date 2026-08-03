/**
 * EdumentX — Tutor Repository selector
 *
 * Single source of truth for "which TutorRepository should the app
 * use?" Selected once at module load from
 * `EXPO_PUBLIC_USE_MOCK_DATA`.
 *
 * Default (production): `FirebaseTutorRepository`. Selected by
 * setting `EXPO_PUBLIC_USE_MOCK_DATA=true` in `.env`.
 *
 * Switching back to the live path requires only flipping the env var
 * to `false` (or removing it) and restarting the Expo dev client. No
 * in-app toggle, no Zustand flag — the choice is statically resolved
 * at module load.
 *
 * Callers should use `getTutorRepository()` (singleton accessor)
 * rather than importing `FirebaseTutorRepository` or
 * `MockTutorRepository` directly, so the toggle stays in one place.
 */

import { FirebaseTutorRepository } from "@/services/tutors/FirebaseTutorRepository";
import { MockTutorRepository } from "@/services/tutors/MockTutorRepository";
import type {
  TutorListing,
  TutorRepository,
} from "@/services/tutors/TutorRepository";

// Re-export the listing type so callers can
// `import type { TutorListing } from "@/services/tutors/dataSource"`
// without reaching into the interface module.
export type { TutorListing };

// ─── Module-load singleton ──────────────────────────────────────────────────

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  // eslint-disable-next-line no-console
  console.log(
    "[dataSource] USE_MOCK_DATA=true — using MockTutorRepository " +
      "(all tutor reads bypass Firebase; chat bypasses the Edge Function).",
  );
} else {
  // eslint-disable-next-line no-console
  console.log(
    "[dataSource] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseTutorRepository (production).",
  );
}

/**
 * Returns the active `TutorRepository` singleton. Always returns the
 * same instance for the lifetime of the JS context (the toggle is
 * read once at module load — restart the app to change it).
 */
export function getTutorRepository(): TutorRepository {
  return isMockEnabled ? MockTutorRepository : FirebaseTutorRepository;
}

/**
 * Convenience pass-through to the active repository's
 * `fetchTutorProfile`. Lets existing call sites keep using
 * `fetchTutorProfile(uid)` without importing the repository.
 */
export function fetchTutorProfile(uid: string) {
  return getTutorRepository().fetchTutorProfile(uid);
}

/**
 * Returns `true` when the mock repository is active. Useful for
 * debugging banners / dev-only UI hints. Don't gate production
 * behavior on this — the right thing to gate is the
 * `getTutorRepository()` accessor above.
 */
export function isMockDataEnabled(): boolean {
  return isMockEnabled;
}