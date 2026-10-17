/**
 * EdumentX — Mock subscription repository
 *
 * Used when `EXPO_PUBLIC_USE_MOCK_DATA=true`. Returns a fake Pro grant
 * (no network, no eSewa) so the Upgrade screen can be exercised in
 * mock mode. The tier state lives in a module-level Map (not
 * persisted) — restarting the app resets it, same as the other mock
 * domains.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type {
  EsewaFormFields,
  ProPlanId,
  SubscriptionState,
  SubscriptionTier,
} from "@/services/subscription/types";
import { PRO_PLANS } from "@/services/subscription/types";
import type { SubscriptionRepository } from "./SubscriptionRepository";

const tierStore = new Map<string, SubscriptionState>();

function stateFor(tutorUid: string): SubscriptionState {
  return (
    tierStore.get(tutorUid) ?? { tier: "free", expiresAt: null }
  );
}

export const MockSubscriptionRepository: SubscriptionRepository = {
  subscribeSubscription(tutorUid, onData) {
    onData(stateFor(tutorUid));
    return () => {};
  },

  async createEsewaOrder(plan: ProPlanId): Promise<EsewaFormFields> {
    const p = PRO_PLANS[plan];
    const transactionUuid = `${Date.now()}-mock`;
    return {
      amount: String(p.priceNpr),
      tax_amount: "0",
      total_amount: String(p.priceNpr),
      transaction_uuid: transactionUuid,
      product_code: "EPAYTEST",
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: "edumentx://payment-success",
      failure_url: "edumentx://payment-failed",
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: "mock-signature",
      form_action_url: "about:blank",
    };
  },

  async verifyEsewaCallback(data: string) {
    try {
      const payload = JSON.parse(
        decodeURIComponent(atob(data.replace(/-/g, "+").replace(/_/g, "/"))),
      ) as Record<string, unknown>;
      return {
        valid: payload.status === "COMPLETE",
        alreadyGranted: false,
        transaction_uuid: payload.transaction_uuid as string | undefined,
        payload,
      };
    } catch {
      return { valid: false, reason: "invalid_payload", payload: {} };
    }
  },

  async readTier(tutorUid: string): Promise<SubscriptionTier> {
    return stateFor(tutorUid).tier;
  },
};

/** Keep the unused-import lint happy (Unsubscribe is used in the
 *  interface only). */
export type { Unsubscribe };

/**
 * MOCK-ONLY demo grant (the "Demo — Skip eSewa" button). Deliberately
 * NOT part of `SubscriptionRepository`: in production the Pro tier is
 * granted exclusively by the `create-esewa-order` edge function after
 * payment verification (firestore.rules reject client tier writes —
 * Aug 24 audit fix), so a grant method on the Firebase impl would be
 * a standing invitation to bypass payment. Mock mode has no rules and
 * no edge function, so a local store write is correct there.
 */
export async function applyDemoProGrant(
  tutorUid: string,
  months: number,
): Promise<void> {
  const now = Date.now();
  tierStore.set(tutorUid, {
    tier: "pro",
    expiresAt: now + months * 30 * 24 * 60 * 60 * 1000,
  });
}
