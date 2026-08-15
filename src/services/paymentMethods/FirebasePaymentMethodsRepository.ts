/**
 * EdumentX — Firebase Payment methods repository
 *
 * Reads/writes `paymentMethods` (student) / `payoutMethod` (tutor)
 * on the user's own profile subcollection doc. The owner-only
 * subcollection rules already cover both paths — no rule edits
 * required.
 */

import { getApp } from "@react-native-firebase/app";
import {
  deleteField,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import type {
  PaymentMethod,
  PaymentMethodsRepository,
  ProfileKind,
} from "./PaymentMethodsRepository";

function profileDoc(uid: string, kind: ProfileKind) {
  const db = getFirestore(getApp());
  const sub = kind === "student" ? "studentProfile" : "tutorProfile";
  return doc(db, "users", uid, sub, "default");
}

export const FirebasePaymentMethodsRepository: PaymentMethodsRepository = {
  subscribePaymentMethods(uid, profileKind, onData, onError) {
    const ref = profileDoc(uid, profileKind);

    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as
          | {
              paymentMethods?: Record<string, Omit<PaymentMethod, "id">>;
              payoutMethod?: Omit<PaymentMethod, "id">;
            }
          | undefined;

        if (profileKind === "student") {
          const map = data?.paymentMethods;
          const methods: PaymentMethod[] = map
            ? Object.entries(map).map(([id, entry]) => ({
                id,
                provider: entry.provider,
                identifier: entry.identifier,
                addedAt: entry.addedAt,
              }))
            : [];
          onData(methods);
          return;
        }

        // Tutor — single payout method.
        const payout = data?.payoutMethod;
        const methods: PaymentMethod[] = payout
          ? [
              {
                id: "default",
                provider: payout.provider,
                identifier: payout.identifier,
                addedAt: payout.addedAt,
              },
            ]
          : [];
        onData(methods);
      },
      (err) => {
        console.warn(
          "PaymentMethods: subscribePaymentMethods failed",
          err,
        );
        onError?.(err);
      },
    );
  },

  async savePaymentMethod(uid, profileKind, provider, identifier) {
    const ref = profileDoc(uid, profileKind);

    if (profileKind === "student") {
      // New map key per method — keeps them addressable for removal.
      const methodId = `${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      await setDoc(
        ref,
        {
          paymentMethods: {
            [methodId]: { provider, identifier, addedAt: Date.now() },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    // Tutor — single payout method, replace in place.
    await setDoc(
      ref,
      {
        payoutMethod: { provider, identifier, updatedAt: Date.now() },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async removePaymentMethod(uid, profileKind, methodId) {
    const ref = profileDoc(uid, profileKind);

    if (profileKind === "student") {
      await setDoc(
        ref,
        {
          paymentMethods: { [methodId]: deleteField() },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    // Tutor — clear the single payout method.
    await setDoc(
      ref,
      {
        payoutMethod: deleteField(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
