/**
 * EdumentX — Firebase subscription repository
 *
 * Production impl. The tier lives on `users/{uid}/tutorProfile/default`
 * and is mirrored onto `tutors/{uid}` (discovery doc) so search/map can
 * rank + badge without N profile reads.
 *
 * ── SECURITY (Aug 24 audit): the tier is granted SERVER-SIDE only —
 * the `create-esewa-order` edge function patches both docs via a
 * service-role REST write after full payment verification. There is
 * deliberately NO client grant method: firestore.rules reject owner
 * writes to `subscriptionTier` / `subscriptionExpiresAt` on both
 * surfaces, so a tampered client cannot mint Pro.
 *
 * The eSewa order is created by the same edge function (HMAC-SHA256
 * signing server-side, secret never on the client). Callback
 * verification runs through it so a forged `data` param can't grant
 * Pro.
 */

import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";
import { getAuth, getIdToken } from "@react-native-firebase/auth";

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
    const idToken = auth.currentUser
      ? await getIdToken(auth.currentUser)
      : undefined;
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
    const idToken = auth.currentUser
      ? await getIdToken(auth.currentUser)
      : undefined;
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

  async readTier(tutorUid: string): Promise<SubscriptionTier> {
    const db = getFirestore(getApp());
    const snap = await getDoc(profileRef(db, tutorUid));
    const d = snap.data() as { subscriptionTier?: unknown } | undefined;
    return mapTier(d?.subscriptionTier);
  },
};
