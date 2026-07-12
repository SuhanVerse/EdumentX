import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { logout } from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Tutor Pending Review screen (`/tutor-pending`)
 *
 * Reached when a tutor signs in but their `users/{uid}/tutorProfile/default`
 * doc has `verificationStatus === "pending"`. The layout guard in
 * `app/_layout.tsx` redirects them here automatically; they cannot
 * reach the real tutor dashboard until an admin approves them.
 *
 * The screen is intentionally **not** destructive. The tutor can sit
 * on it freely — we don't auto-log-out on mount. We surface three
 * actions:
 *
 *   1. **"What we're checking"** — a static list of the items an admin
 *      reviews. This is documentation-as-UI: it tells the tutor
 *      exactly what the admin is looking at, so they don't email
 *      support asking "how long does this take?".
 *
 *   2. **"Contact support"** — a `mailto:` link. No email is sent
 *      automatically; the tutor has to tap through their mail app.
 *      We use `Linking.openURL` rather than embedding a `mailto:`
 *      anchor because React Native's `Text` doesn't render
 *      `href="mailto:..."` on iOS or Android.
 *
 *   3. **"Sign out"** — the only way to leave the page. The tutor
 *      can re-sign-in later and land back here if the admin still
 *      hasn't decided. We use a `ConfirmDialog`-style inline confirm
 *      (not a native `Alert.alert`) to match the rest of the app's
 *      destructive-action pattern.
 *
 * We deliberately do NOT poll the verification doc in the background.
 * When the admin flips the status, the layout guard re-renders and
 * either re-routes the tutor to `/tutor-home` (approved) or replaces
 * the banner copy (rejected / more_info). The tutor only has to pull-
 * to-refresh — actually, no, we don't have pull-to-refresh. Re-mounting
 * the screen by tapping Sign out → Sign in again will re-read the doc.
 * A more polished version would add a "Check now" button that calls
 * `auth.currentUser.reload()` like the email-verification panel does.
 * For the mid-term milestone, "sign out / sign in again" is the
 * documented workaround.
 */

const SUPPORT_EMAIL = "support@edumentx.example";

const REVIEW_CHECKLIST = [
  {
    icon: "person-outline" as const,
    label: "Identity & contact details",
    detail:
      "We confirm your name, email, and phone number match your account.",
  },
  {
    icon: "school-outline" as const,
    label: "Subjects and grade levels",
    detail:
      "Subjects you teach and the grade levels you cover are within the platform's scope.",
  },
  {
    icon: "cash-outline" as const,
    label: "Monthly rate",
    detail:
      "Your rate is in the marketplace's published range and clearly communicated to parents.",
  },
  {
    icon: "location-outline" as const,
    label: "Service area",
    detail:
      "Your city / neighborhood is within our current coverage (Kathmandu Valley).",
  },
  {
    icon: "ribbon-outline" as const,
    label: "Blue-Tick credentials (Phase 6)",
    detail:
      "Once you upload citizenship and degree documents we'll mark your profile with a Blue Tick.",
  },
];

export function TutorPendingReview() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  /**
   * Live watch on the verification status. The admin's
   * `applyVerificationDecision` handler
   * (`screens/admin/VerificationQueue.tsx`) flips
   * `users/{uid}/tutorProfile/default.verificationStatus` from
   * `"pending"` to `"approved"` (or `"rejected"` / `"more_info"`)
   * inside the same `writeBatch` that updates the source-of-truth
   * `tutorVerifications/{uid}` doc. When the admin approves, the
   * tutor is sitting on this screen — we need to auto-advance them
   * to `/tutor-home` so they don't have to sign out / sign in
   * again to see the dashboard.
   *
   * We deliberately subscribe to the *denormalized* profile doc
   * (not the source-of-truth `tutorVerifications/{uid}`) because
   * the layout guard also reads it. Mirroring the new status into
   * the auth store on the same callback keeps the two in lockstep
   * — the layout guard's pending branch (line 204-211 in
   * `app/_layout.tsx`) won't fire on the next render because the
   * store now says "approved" instead of "pending".
   *
   * For `rejected` / `more_info` we don't auto-navigate — the
   * tutor needs to see the rejection reason or the info request
   * prompt, and the dashboard's `ReviewBanner` surfaces those.
   * Sending them to `/tutor-home` is the right call: the
   * dashboard is now reachable (status is no longer "pending")
   * and the banner explains what changed.
   *
   * If the doc disappears (e.g. an admin deletes the profile
   * out from under the tutor), we leave the screen alone and let
   * the layout guard route them.
   */
  useEffect(() => {
    if (!user) return;
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        const data = snap.data() as
          | { verificationStatus?: string | null }
          | undefined;
        const status = data?.verificationStatus ?? null;
        // Mirror into the store so the layout guard sees the new
        // value on its next render. Without this the tutor would
        // see the live update on the dashboard *and* be bounced
        // back to /tutor-pending on the next layout re-render.
        const current = useAuthStore.getState().tutorVerificationStatus;
        if (current !== status) {
          useAuthStore.getState().setTutorVerificationStatus(
            (status as
              | "pending"
              | "approved"
              | "rejected"
              | "more_info"
              | null) ?? null,
          );
        }
        if (status === "approved") {
          // The admin approved. Advance the tutor to the real
          // dashboard. The layout guard's "pending" branch will
          // not fire on the next render because the store now
          // mirrors "approved".
          router.replace("/tutor-home");
        } else if (status === "rejected" || status === "more_info") {
          // Admin decided, but needs the tutor to take action.
          // Send them to the dashboard — the ReviewBanner
          // explains the rejection / info request. The layout
          // guard allows /tutor-home for any non-pending tutor.
          router.replace("/tutor-home");
        }
      },
      (err) => {
        // Read failure is non-fatal. The next auth-state change
        // (sign-out / sign-in) will retry the read.
        console.warn("TutorPendingReview: profile watch failed", err);
      },
    );
    return () => unsub();
  }, [user, router]);

  async function handleSignOut() {
    setConfirmSignOut(false);
    try {
      await logout();
      useAuthStore.getState().reset();
    } catch (err) {
      console.error("TutorPendingReview: sign-out failed", err);
      Alert.alert("Could not sign out", "Please try again.");
      return;
    }
    router.replace("/email-signup");
  }

  function openSupport() {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        "Tutor account review — status check",
      )}`,
    ).catch(() => {
      Alert.alert(
        "Could not open mail",
        `Please email us at ${SUPPORT_EMAIL} and we'll get back to you within 24 hours.`,
      );
    });
  }

  return (
    <ScreenLayout variant="night">

      {/* Hero — slate, matches the 5 other tutor surfaces so the
          "this is still the tutor side of the app" feeling is
          preserved. */}
      <View className="px-5 pb-7 shrink-0">
        <View className="flex-row items-center gap-2 mb-2 mt-1">
          <View className="w-2 h-2 rounded-full bg-warning" />
          <Text className="text-caption text-white/70 uppercase tracking-wider">
            Under review
          </Text>
        </View>
        <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
          <Text className="text-screen-title font-medium text-white">
            Your account is being reviewed
          </Text>
        </View>
        <Text className="text-body text-white/65 mt-1.5">
          We&apos;re checking the details you submitted. You&apos;ll get
          full access to the tutor dashboard once an admin approves
          your profile — usually within 24–48 hours.
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Status card — surface the fact that there's a queue item.
            The amber tint matches the "pending" tone in the tutor
            dashboard's ReviewBanner so the language is consistent
            across the app. */}
        <View className="flex-row items-start gap-3 p-4 rounded-card bg-warning-bg border border-warning/30 mb-5">
          <View className="w-9 h-9 rounded-pill bg-warning/20 items-center justify-center mt-0.5">
            <Ionicons name="time-outline" size={18} color="#E5A03B" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-card-title font-medium text-warning-text">
              In the admin queue
            </Text>
            <Text className="text-caption text-warning-text/80 mt-1 leading-relaxed">
              An admin will look at your subjects, rate, and location
              and either approve your account or send you a short note
              with what to update.
            </Text>
          </View>
        </View>

        {/* What we're checking — documentation-as-UI. */}
        <Text className="text-label text-ink-muted mb-2 px-1">
          What we&apos;re checking
        </Text>
        <View className="bg-surface border border-border rounded-card overflow-hidden mb-5">
          {REVIEW_CHECKLIST.map((item, i) => (
            <View
              key={item.label}
              className={`flex-row items-start gap-3 px-4 py-3.5 ${
                i < REVIEW_CHECKLIST.length - 1
                  ? "border-b border-border"
                  : ""
              }`}
            >
              <View className="w-9 h-9 rounded-pill bg-accent-soft items-center justify-center mt-0.5">
                <Ionicons name={item.icon} size={16} color="#E5A03B" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-body font-medium text-text-primary">
                  {item.label}
                </Text>
                <Text className="text-caption text-text-muted mt-0.5 leading-relaxed">
                  {item.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Help row — mailto fallback. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          onPress={openSupport}
          className="flex-row items-center gap-3 p-4 rounded-card bg-surface border border-border active:opacity-70"
        >
          <View className="w-9 h-9 rounded-pill bg-ai-light items-center justify-center">
            <Ionicons name="mail-outline" size={18} color="#4A7FA5" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-body font-medium text-text-primary">
              Have a question?
            </Text>
            <Text className="text-caption text-text-muted mt-0.5">
              Email us at {SUPPORT_EMAIL} and we&apos;ll get back to you
              within 24 hours.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#6B7268" />
        </Pressable>

        {/* Sign-out — last, visually separated. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => setConfirmSignOut(true)}
          className="mt-7 min-h-btn rounded-card bg-danger-bg border border-danger/30 flex-row items-center justify-center gap-2 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color="#C1503D" />
          <Text className="text-button font-semibold text-danger">
            Sign out
          </Text>
        </Pressable>

        <Text className="text-caption text-text-muted text-center mt-6">
          You can sign back in any time to check your review status.
        </Text>
      </ScrollView>

      {/* Inline sign-out confirm. Matches the ConfirmDialog pattern
          used in edit_profile.tsx (not a native Alert). We render
          it inline rather than via a Modal so the existing
          ConfirmDialog primitive stays in its single use site. */}
      {confirmSignOut ? (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-surface rounded-xl p-5 w-full max-w-[360px] shadow-lg">
            <Text className="text-section-title font-medium text-text-primary text-center">
              Sign out?
            </Text>
            <Text className="text-body-sm text-text-secondary text-center mt-1.5">
              You can sign back in any time to check your review status.
            </Text>
            <View className="mt-4 gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm sign out"
                onPress={handleSignOut}
                className="min-h-btn rounded-card bg-danger items-center justify-center active:opacity-80"
              >
                <Text className="text-button text-text-inverse font-semibold">
                  Sign out
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stay signed in"
                onPress={() => setConfirmSignOut(false)}
                className="min-h-btn rounded-card bg-sand items-center justify-center active:opacity-80"
              >
                <Text className="text-button text-text-secondary font-medium">
                  Stay signed in
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScreenLayout>
  );
}
