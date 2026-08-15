/**
 * EdumentX — Payment methods repository abstraction
 *
 * The single contract between the student "Payment methods" screen
 * (`/payment-methods`), the tutor "Payouts" screen (`/payouts`) and
 * the underlying data source.
 *
 * Storage — both live on the user's own profile subcollection doc
 * (owner read/write, already covered by the existing rules):
 *   - student: `users/{uid}/studentProfile/default.paymentMethods`
 *     — a map of `{ [methodId]: { provider, identifier, addedAt } }`,
 *     so the student can keep several (eSewa + bank + Khalti).
 *   - tutor:   `users/{uid}/tutorProfile/default.payoutMethod`
 *     — a single `{ provider, identifier, updatedAt }` object (the
 *     account tutors receive money into).
 *
 * `profileKind` selects the path ("student" | "tutor"); the rest of
 * the API stays symmetric.
 *
 * Two concrete implementations:
 *   - `FirebasePaymentMethodsRepository` — production default.
 *   - `MockPaymentMethodsRepository` — in-memory, fully offline.
 *
 * Selection is gated by `EXPO_PUBLIC_USE_MOCK_DATA` and performed by
 * `services/paymentMethods/dataSource.ts` at module load.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

export type ProfileKind = "student" | "tutor";

/** One saved payment detail. `id` is the map key on the doc
 *  ("default" for the tutor's single payout method). */
export interface PaymentMethod {
  id: string;
  /** PaymentProviderId ("esewa" | "khalti" | "imepay" | "bank"). */
  provider: string;
  /** eWallet number / bank + account name. */
  identifier: string;
  addedAt?: number;
}

export interface PaymentMethodsRepository {
  /**
   * Live list of the user's saved payment methods. Fires immediately
   * with the current set, then again on every change. For tutors the
   * list is at most one entry (the payout method). Returns an
   * Unsubscribe handle that the caller MUST invoke on cleanup.
   */
  subscribePaymentMethods(
    uid: string,
    profileKind: ProfileKind,
    onData: (methods: PaymentMethod[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /**
   * Add (student) or replace (tutor) a payment method.
   */
  savePaymentMethod(
    uid: string,
    profileKind: ProfileKind,
    provider: string,
    identifier: string,
  ): Promise<void>;

  /**
   * Remove a payment method. Students pass the method's map-key id;
   * tutors pass "default" (removes the single payout method).
   */
  removePaymentMethod(
    uid: string,
    profileKind: ProfileKind,
    methodId: string,
  ): Promise<void>;
}
