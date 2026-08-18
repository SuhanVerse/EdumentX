/**
 * EdumentX — Firebase subscription repository
 *
 * Production impl. The tier lives on `users/{uid}/tutorProfile/default`
 * (owner-writable) and is mirrored onto `tutors/{uid}` (discovery doc)
 * via the same owner carve-out pattern as `isAvailableForNewStudents`
 * — so search/map can rank + badge without N profile reads.
 *
 * The eSewa order is created by the `create-esewa-order` Supabase
 * Edge Function (HMAC-SHA256 signing server-side, secret never on the
 * client). Callback verification runs through the same function so a
 * forged `data` param can't grant Pro.
 */

import {
  deleteField,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";

import type {
  EsewaFormFields,
  ProPlanId,
  SubscriptionTier,
  VerifyEsewaResult,
} from "@/services/subscription/types";
import type { SubscriptionRepository } from "./SubscriptionRepository";
import { getSupabase } from "@/services/supabase/client";

const EDGE_FUNCTION = "create-esewa-order";

/** `users/{uid}/tutorProfile/default` → tier field path. */
function profileRef(db: ReturnType<typeof getFirestore>, tutorUid: string) {
  return doc(db, "users", tutorUid, "tutorProfile", "default");
}

/** `tutors/{uid}` discovery doc (mirror). */
function discoveryRef(db: ReturnType<typeof getFirestore>, tutorUid: string) {
  return doc(db, "tutors", tutorUid);
}

function mapTier(raw: unknown): SubscriptionTier {
  return raw === "pro" ? "pro" : "free";
}

export const FirebaseSubscriptionRepository: SubscriptionRepository = {
  subscribeSubscription(tutorUid, onData, onError) {
    const db = getFirestore(getApp());
    const ref = profileRef(db, tutorUid);
    return onSnapshot(
      ref,
      (snap) => {
        const d = snap.data() as
          | { subscriptionTier?: unknown; subscriptionExpiresAt?: unknown }
          | undefined;
        onData({
          tier: mapTier(d?.subscriptionTier),
          expiresAt:
            typeof d?.subscriptionExpiresAt === "number"
              ? d.subscriptionExpiresAt
              : null,
        });
      },
      (err) => {
        console.warn(
          "FirebaseSubscriptionRepository.subscribeSubscription",
          err,
        );
        onError?.(err);
      },
    );
  },

  async createEsewaOrder(plan: ProPlanId): Promise<EsewaFormFields> {
    const auth = getAuth(getApp());
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error("You must be signed in to upgrade to Pro.");
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
      body: { plan },
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (error) {
      throw new Error(
        `Payment server error: ${(error as { message?: string }).message ?? "could not reach the payment server."}`,
      );
    }
    const fields = data as EsewaFormFields;
    if (!fields?.form_action_url || !fields?.signature) {
      throw new Error("Payment server returned an invalid order.");
    }
    return fields;
  },

  async verifyEsewaCallback(data: string) {
    const auth = getAuth(getApp());
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in.");
    const supabase = getSupabase();
    const { data: res, error } = await supabase.functions.invoke(
      EDGE_FUNCTION,
      {
        body: { verify: data },
        headers: { Authorization: `Bearer ${idToken}` },
      },
    );
    if (error) {
      throw new Error("Payment verification failed.");
    }
    return res as VerifyEsewaResult;
  },

  async applyProGrant(tutorUid: string, months: number) {
    const db = getFirestore(getApp());
    const now = Date.now();
    const expiresAt = now + months * 30 * 24 * 60 * 60 * 1000;
    // Owner writes BOTH docs. The discovery doc update is gated by the
    // `hasOnly(["subscriptionTier", "subscriptionExpiresAt", "updatedAt"])`
    // carve-out in firestore.rules — same shape as the availability flag.
    await setDoc(
      profileRef(db, tutorUid),
      {
        subscriptionTier: "pro",
        subscriptionExpiresAt: expiresAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await setDoc(
      discoveryRef(db, tutorUid),
      {
        subscriptionTier: "pro",
        subscriptionExpiresAt: expiresAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async readTier(tutorUid: string): Promise<SubscriptionTier> {
    const db = getFirestore(getApp());
    const snap = await getDoc(profileRef(db, tutorUid));
    const d = snap.data() as { subscriptionTier?: unknown } | undefined;
    return mapTier(d?.subscriptionTier);
  },
};

/** Re-exported so `deleteField` typing stays consistent if a revoke
 *  path is added later. */
export { deleteField };
