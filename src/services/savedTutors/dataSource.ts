/**
 * EdumentX — Saved Tutors repository selector
 *
 * Single source of truth for "which SavedTutorsRepository should the
 * app use?" Mirrors `services/messages/dataSource.ts` — same
 * `EXPO_PUBLIC_USE_MOCK_DATA` gate, same singleton accessor.
 */

import { FirebaseSavedTutorsRepository } from "./FirebaseSavedTutorsRepository";
import { MockSavedTutorsRepository } from "./MockSavedTutorsRepository";
import type { SavedTutorsRepository } from "./SavedTutorsRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  console.log(
    "[savedTutors] USE_MOCK_DATA=true — using MockSavedTutorsRepository.",
  );
} else {
  console.log(
    "[savedTutors] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseSavedTutorsRepository (production).",
  );
}

export function getSavedTutorsRepository(): SavedTutorsRepository {
  return isMockEnabled
    ? MockSavedTutorsRepository
    : FirebaseSavedTutorsRepository;
}
