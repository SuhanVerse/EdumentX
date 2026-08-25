/**
 * EdumentX — Subscription repository selector
 *
 * Same pattern as `services/enrollments/dataSource.ts` etc. — chosen
 * once at module load from `EXPO_PUBLIC_USE_MOCK_DATA`.
 */

import { FirebaseSubscriptionRepository } from "./FirebaseSubscriptionRepository";
import { MockSubscriptionRepository } from "./MockSubscriptionRepository";
import type { SubscriptionRepository } from "./SubscriptionRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  console.log(
    "[subscription] USE_MOCK_DATA=true — using MockSubscriptionRepository.",
  );
} else {
  console.log(
    "[subscription] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebaseSubscriptionRepository (production).",
  );
}

/** True when mock mode is active — gates the "Demo — Skip eSewa"
 *  grant button (production never shows it; see ProUpgradeScreen). */
export const isMockSubscriptionEnabled = isMockEnabled;

/** Returns the active `SubscriptionRepository` singleton (chosen once
 *  at module load — restart the app to change it). */
export function getSubscriptionRepository(): SubscriptionRepository {
  return isMockEnabled
    ? MockSubscriptionRepository
    : FirebaseSubscriptionRepository;
}
