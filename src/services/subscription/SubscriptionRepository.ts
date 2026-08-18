/**
 * EdumentX — Subscription repository interface
 *
 * The data layer for the "Pro Tutor" subscription. Two impls exist
 * (Firebase + Mock) behind the `EXPO_PUBLIC_USE_MOCK_DATA` toggle —
 * same selector pattern as the other domains.
 *
 * The eSewa SIGNING happens in the Supabase Edge Function
 * (`create-esewa-order`) so the HMAC secret key never touches the
 * client. The client only:
 *   1. calls the function with a plan id → gets signed form fields
 *   2. renders them in a WebView (auto-submitting form)
 *   3. intercepts the `edumentx://payment-success` deep-link redirect
 *   4. writes the granted tier to the profile + discovery doc
 *
 * ⚠️ SANDBOX ONLY — see `types.ts` + ARCHITECTURE.md §0.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type {
  EsewaFormFields,
  ProPlanId,
  SubscriptionState,
  SubscriptionTier,
  VerifyEsewaResult,
} from "@/services/subscription/types";

export type SubscriptionCallback = (state: SubscriptionState) => void;

export interface SubscriptionRepository {
  /** Live tier for a tutor (profile doc + expiry). */
  subscribeSubscription(
    tutorUid: string,
    onData: SubscriptionCallback,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /** Calls the `create-esewa-order` Edge Function for the plan and
   *  returns the signed eSewa form fields (server-side HMAC). */
  createEsewaOrder(plan: ProPlanId): Promise<EsewaFormFields>;

  /** Verifies an eSewa callback payload (base64 `data` param): HMAC
   *  signature + ledger one-time-use + amount/product cross-check +
   *  server-to-server status API. `alreadyGranted` means a replay —
   *  the caller must not re-grant. */
  verifyEsewaCallback(data: string): Promise<VerifyEsewaResult>;

  /** Applies a verified Pro grant: writes `subscriptionTier` +
   *  `subscriptionExpiresAt` on the tutor profile AND mirrors onto
   *  the `tutors/{uid}` discovery doc (owner carve-out in rules). */
  applyProGrant(tutorUid: string, months: number): Promise<void>;

  /** Local-only read of the tier (for instant UI feedback) — the
   *  subscription itself stays in Firestore. */
  readTier(tutorUid: string): Promise<SubscriptionTier>;
}
