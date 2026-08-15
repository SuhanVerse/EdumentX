/**
 * EdumentX — Payment methods repository selector
 *
 * Single source of truth for "which PaymentMethodsRepository should
 * the app use?" Mirrors the other service dataSource selectors —
 * same `EXPO_PUBLIC_USE_MOCK_DATA` gate, same singleton accessor.
 */

import { FirebasePaymentMethodsRepository } from "./FirebasePaymentMethodsRepository";
import { MockPaymentMethodsRepository } from "./MockPaymentMethodsRepository";
import type { PaymentMethodsRepository } from "./PaymentMethodsRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

if (isMockEnabled) {
  console.log(
    "[paymentMethods] USE_MOCK_DATA=true — using MockPaymentMethodsRepository.",
  );
} else {
  console.log(
    "[paymentMethods] USE_MOCK_DATA=" +
      (rawFlag ?? "unset") +
      " — using FirebasePaymentMethodsRepository (production).",
  );
}

export function getPaymentMethodsRepository(): PaymentMethodsRepository {
  return isMockEnabled
    ? MockPaymentMethodsRepository
    : FirebasePaymentMethodsRepository;
}
