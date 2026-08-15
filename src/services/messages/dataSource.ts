/**
 * EdumentX — Messages repository selector
 *
 * Single source of truth for \"which MessagesRepository should the app
 * use?\" Mirrors `services/enrollments/dataSource.ts` — same
 * `EXPO_PUBLIC_USE_MOCK_DATA` gate, same singleton accessor.
 */

import { FirebaseMessagesRepository } from "./FirebaseMessagesRepository";
import { MockMessagesRepository } from "./MockMessagesRepository";
import type { MessagesRepository } from "./MessagesRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  console.log(
    "[messages] USE_MOCK_DATA=true — using MockMessagesRepository.",
  );
} else {
  console.log(
    "[messages] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseMessagesRepository (production).",
  );
}

export function getMessagesRepository(): MessagesRepository {
  return isMockEnabled
    ? MockMessagesRepository
    : FirebaseMessagesRepository;
}
