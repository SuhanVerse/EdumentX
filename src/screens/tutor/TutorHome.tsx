import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  doc,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { ReviewBanner } from "@/components/shared/ReviewBanner";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { SwitchThumb, ActivePill, FloatingEmptyIcon } from "@/components/motion";
import { RemoveEnrollmentDialog } from "@/components/domain/RemoveEnrollmentDialog";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { getReviewRepository } from "@/services/enrollments/reviewDataSource";
import { deriveTodaySessions } from "@/services/enrollments/derived";
import {
  DAY_LABELS,
  MAX_CAPACITY,
  TIME_SLOT_LABELS,
  parseSlotKey,
  type Enrollment,
  type EnrollmentRequest,
} from "@/services/enrollments/types";
import { setTutorAvailability } from "@/lib/tutor/firestoreTutorService";
import type { Review } from "@/lib/tutor/types";
import { useUnreadCount } from "@/services/messages/useUnreadCount";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Tutor Dashboard
 *
 * Live reads from `users/{uid}/tutorProfile/default`, the tutor's
 * pending `enrollmentRequests` (filtered to pending), and the live
 * roster — today's sessions are derived from active enrollments
 * whose slot day + date window cover today (Asia/Kathmandu).
 */

// Shape mirrors the fields the JSX reads from the tutorProfile doc.
// Optional fields default to zero/false so the UI renders an empty
// state instead of `NaN` while the doc-fetch is in flight or when a
// newer tutor hasn't yet set every metric.
interface TutorDashboardData {
  fullName: string;
  isVerifiedProfessional: boolean;
  capacity: number;
  currentStudents: number;
  /** Per-month rate — combined with the live roster count for the
   *  "Monthly revenue" metric (see the computed block in the
   *  render). */
  monthlyRateNpr: number;
  profileCompletion: number;
  // `verificationStatus` and `hasPendingUpdate` come from the same
  // tutorProfile doc and drive the under-review banner above the
  // dashboard. They are kept as raw strings / booleans (not narrowed
  // enums) so a doc that hasn't been migrated yet still renders
  // cleanly — the banner stays hidden when these fields are absent.
  verificationStatus?: "pending" | "approved" | "rejected" | "more_info";
  hasPendingUpdate?: boolean;
  rejectionReason?: string | null;
}

// `FALLBACK.fullName` is the empty string rather than a placeholder
// like "Tutor" — the dashboard renders a "Complete your profile"
// empty state when the name is empty, so a brand-new tutor (or any
// tutor whose profile hasn't been read yet) never sees a fake
// first-name as if it were real data. (Previously the literal
// "Tutor" was rendered, which masked the "user has no profile"
// bug as a cosmetic issue.)
const FALLBACK: TutorDashboardData = {
  fullName: "",
  isVerifiedProfessional: false,
  capacity: 0,
  currentStudents: 0,
  monthlyRateNpr: 0,
  profileCompletion: 0,
  verificationStatus: undefined,
  hasPendingUpdate: false,
  rejectionReason: null,
};

function toNum(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

type QuickAction = { label: string; route: string };

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "View inbox", route: "/tutor-inbox" },
  { label: "Manage batches", route: "/batches" },
  { label: "Set availability", route: "/tutor-capacity" },
  { label: "Messages", route: "/messages" },
];

type ReqTab = "enrollments" | "batches";

/**
 * Sign-out used to live here but moved to the tutor profile tab
 * (`screens/tutor/edit_profile.tsx`) on June 28, 2026 so the
 * affordance sits next to the user's account info — same place the
 * student has it. Removing the function also clears the
 * `'handleSignOut' is defined but never used` eslint warning.
 */

export function TutorDashboard() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  // Live unread message count for the header chat icon badge.
  const unreadMessages = useUnreadCount(user?.uid);
  // Search visibility — backed by the tutor's own
  // `tutors/{uid}.isAvailableForNewStudents` flag (see
  // `setTutorAvailability` + the rules carve-out). `null` while the
  // first snapshot is in flight; once loaded it reflects the doc.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [availableToggleBusy, setAvailableToggleBusy] = useState(false);
  // Transient "Visibility paused" notice shown right after the tutor
  // flips the availability switch OFF — auto-dismisses after a few
  // seconds so the dashboard doesn't nag. The timer lives in a ref so
  // a rapid second toggle (or an unmount) can't leave a stale timeout
  // clearing the notice early or firing after the screen is gone.
  const [visibilityNotice, setVisibilityNotice] = useState(false);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [reqTab, setReqTab] = useState<ReqTab>("enrollments");
  // Live pending enrollment requests addressed to this tutor. The
  // subscription returns the full list (pending + decided history);
  // we filter to pending so decided rows drop off the dashboard
  // automatically.
  const [pendingRequests, setPendingRequests] = useState<EnrollmentRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  // Live roster (`enrollments/{tutorUid}/roster`) — today's sessions
  // are derived from it (see `deriveTodaySessions` below).
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  // Live reviews — drive the Avg rating + Reviews metric tiles
  // (average of the review docs in `reviews/{uid}/reviews`).
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  // Derived from ALL requests (pending + decided history): the share
  // the tutor has already responded to. `null` until the first
  // snapshot, and stays null when there are no requests at all.
  const [responseRate, setResponseRate] = useState<number | null>(null);
  // The under-review banner is dismissable for the current session
  // — once the tutor has read it, the "Got it" button hides the
  // banner without affecting the underlying `verificationStatus`
  // field. A fresh sign-in (or a real status change in the
  // snapshot) brings the banner back. We keep the dismissed state
  // local because (a) the snapshot already drives re-render, and
  // (b) persisting a "banner seen" flag to Firestore would be
  // more work than it's worth for a UI affordance.
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Active-students removal — the only UI entry to `removeEnrollment`
  // (soft-delete by direct path + capacity decrement + batch-member
  // cascade). `removeTarget` holds the roster row the tutor tapped;
  // the dialog collects the reason and drives the `removing` spinner.
  const [removeTarget, setRemoveTarget] = useState<Enrollment | null>(null);
  const [removing, setRemoving] = useState(false);

  // Live read from the tutorProfile subcollection. We subscribe via
  // `onSnapshot` so future Phase-5 "Edit profile" writes propagate to
  // the dashboard without a reload. The student's home screen uses
  // the same pattern (see `StudentHome.tsx`).
  const [data, setData] = useState<TutorDashboardData>(FALLBACK);
  // `hasLoaded` flips true once the first `onSnapshot` callback has
  // returned (with any data — even `undefined`). It distinguishes
  // "we're still waiting for the first read" from "we read the
  // doc and it's empty / missing". The dashboard's empty-state
  // branch (further down) only renders when `hasLoaded && data has
  // no name`, so a fresh mount doesn't flash a "Complete your
  // profile" CTA while the read is still in flight.
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setData(FALLBACK);
      setHasLoaded(true);
      return;
    }
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        const d = snap.data() as Partial<TutorDashboardData> | undefined;
        if (!d) {
          setData(FALLBACK);
          setHasLoaded(true);
          return;
        }
        setData({
          // Empty string is intentional: the dashboard's empty-state
          // branch (line 320 / 372) detects `fullName === ""` and
          // renders a "Complete your profile" CTA instead of
          // pretending an empty profile is a real tutor. The
          // previous fallback to "Tutor" was a placeholder from the
          // mock-data era that masked the "no profile yet" bug as
          // a cosmetic glitch.
          fullName:
            typeof d.fullName === "string" && d.fullName.trim().length > 0
              ? d.fullName.trim()
              : "",
          isVerifiedProfessional: !!(d as { isVerifiedProfessional?: boolean })
            .isVerifiedProfessional,
          // `studentCapacity` is the canonical cap (acceptRequest +
          // the capacity screen both read it; the rules enforce
          // `max(studentCapacity, 6)`). Fall back to MAX_CAPACITY
          // when the legacy field is missing or zero so the card
          // never renders "1 of — filled" (the reported bug).
          capacity: Math.max(
            toNum((d as { studentCapacity?: number }).studentCapacity),
            MAX_CAPACITY,
          ),
          currentStudents: toNum((d as { currentStudents?: number }).currentStudents),
          monthlyRateNpr: toNum(
            (d as { monthlyRateNpr?: number }).monthlyRateNpr,
          ),
          profileCompletion: toNum(
            (d as { profileCompletion?: number }).profileCompletion,
          ),
          // Verification state — read but not yet written by the
          // tutor-side flows (those land in the next phase). The
          // dashboard uses these to render the ReviewBanner and to
          // disable new enrollment requests when the profile is
          // hidden from discovery.
          verificationStatus:
            (d as { verificationStatus?: TutorDashboardData["verificationStatus"] })
              .verificationStatus,
          hasPendingUpdate: !!(d as { hasPendingUpdate?: boolean })
            .hasPendingUpdate,
          rejectionReason:
            (d as { rejectionReason?: string | null }).rejectionReason ?? null,
        });
        setHasLoaded(true);
      },
      (err) => {
        console.warn("TutorDashboard: profile read failed", err);
        setData(FALLBACK);
        setHasLoaded(true);
      },
    );
    return () => unsub();
  }, [user]);

  // Live enrollment requests — the same `enrollmentRequests/{uid}/requests`
  // collection the inbox screen subscribes to. Filtered to `pending` so
  // accepted/declined rows drop off the dashboard automatically.
  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      setRequestsLoaded(true);
      return;
    }
    const repo = getEnrollmentRepository();
    const unsub = repo.subscribeRequests(
      user.uid,
      (list) => {
        setPendingRequests(list.filter((r) => r.status === "pending"));
        const total = list.length;
        const responded = list.filter(
          (r) => r.status === "accepted" || r.status === "declined",
        ).length;
        setResponseRate(
          total > 0 ? Math.round((responded / total) * 100) : null,
        );
        setRequestsLoaded(true);
      },
      (err) => {
        console.warn("TutorDashboard: subscribeRequests failed", err);
        setRequestsLoaded(true);
      },
    );
    return unsub;
  }, [user]);

  // Live roster — today's sessions are derived from active
  // enrollments whose slot day + date window cover today (no
  // `sessions` collection exists; see `deriveTodaySessions`).
  useEffect(() => {
    if (!user) {
      setRoster([]);
      setRosterLoaded(true);
      return;
    }
    const repo = getEnrollmentRepository();
    const unsub = repo.subscribeEnrollments(
      user.uid,
      (list) => {
        setRoster(list);
        setRosterLoaded(true);
      },
      (err) => {
        console.warn("TutorDashboard: subscribeEnrollments failed", err);
        setRosterLoaded(true);
      },
    );
    return unsub;
  }, [user]);

  // Live reviews — the `reviews/{uid}/reviews` collection is the
  // source of truth for rating + count (the profile doc's `rating`/
  // `reviewCount` are just a running mirror written by submitReview).
  useEffect(() => {
    if (!user) {
      setReviews([]);
      setReviewsLoaded(true);
      return;
    }
    const unsub = getReviewRepository().subscribeReviews(
      user.uid,
      (list) => {
        setReviews(list);
        setReviewsLoaded(true);
      },
      (err) => {
        console.warn("TutorDashboard: subscribeReviews failed", err);
        setReviewsLoaded(true);
      },
    );
    return unsub;
  }, [user]);

  // Live search-visibility flag from the tutor's own `tutors/{uid}`
  // discovery doc. Defaults to visible (true) when the doc is
  // missing or predates the flag — same default as the backfill.
  useEffect(() => {
    if (!user) {
      setAvailable(null);
      return;
    }
    const db = getFirestore(getApp());
    const tutorRef = doc(db, "tutors", user.uid);
    const unsub = onSnapshot(
      tutorRef,
      (snap) => {
        const data = snap.data() as { isAvailableForNewStudents?: boolean } | undefined;
        setAvailable(data?.isAvailableForNewStudents !== false);
      },
      (err) => {
        console.warn("TutorDashboard: availability flag read failed", err);
        setAvailable(true);
      },
    );
    return unsub;
  }, [user]);

  async function handleRemoveEnrollment(reason: string) {
    if (!user || !removeTarget || removing) return;
    setRemoving(true);
    try {
      await getEnrollmentRepository().removeEnrollment(
        user.uid,
        removeTarget.enrollmentId,
        reason,
      );
      // The roster snapshot re-emits and the row drops off
      // automatically; close the dialog on success.
      setRemoveTarget(null);
    } catch (err) {
      console.warn("TutorDashboard: removeEnrollment failed", err);
      Alert.alert(
        "Couldn't remove",
        "We couldn't remove this student. Try again in a moment.",
      );
    } finally {
      setRemoving(false);
    }
  }

  async function handleToggleAvailability() {
    if (!user || available == null || availableToggleBusy) return;
    const next = !available;
    setAvailableToggleBusy(true);
    // Optimistic flip so the switch feels instant; the snapshot
    // re-confirms from the doc on the next write.
    setAvailable(next);
    try {
      await setTutorAvailability(user.uid, next);
      if (!next) {
        // Paused — show the "hidden from search" notice; auto-clear
        // so it reads as a toast, not a permanent banner. Any
        // pending timer is cleared first so a rapid re-toggle
        // restarts the 4s window instead of letting the older
        // timeout hide the fresh notice early.
        if (visibilityTimerRef.current) {
          clearTimeout(visibilityTimerRef.current);
        }
        setVisibilityNotice(true);
        visibilityTimerRef.current = setTimeout(
          () => setVisibilityNotice(false),
          4000,
        );
      }
    } catch (err) {
      console.warn("TutorDashboard: setTutorAvailability failed", err);
      // Revert the optimistic flip — the doc still has the old value.
      setAvailable(!next);
      Alert.alert(
        "Couldn't update",
        "We couldn't change your search visibility. Try again in a moment.",
      );
    } finally {
      setAvailableToggleBusy(false);
    }
  }

  const capacity = data.capacity;
  const currentStudents = data.currentStudents;
  const activeRoster = roster.filter((e) => e.status === "active");
  const capPct = capacity > 0 ? (currentStudents / capacity) * 100 : 0;
  const capColor =
    capPct >= 100
      ? "bg-danger"
      : capPct > 80
        ? "bg-warning"
        : "bg-verification";

  // Live-derived metrics. Rating + count come straight from the
  // reviews collection.
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  // When the underlying verification status changes (e.g. admin
  // approval, a new edit goes pending, or a fresh "more_info"
  // request), re-show the banner even if the tutor had dismissed
  // it. Without this, a dismissed banner would stay hidden through
  // subsequent state changes — the dismiss only "absorbs" a
  // *seen* state, not future changes.
  // Clear any pending visibility-notice timer on unmount so a
  // stray timeout never fires against a screen that's gone.
  useEffect(() => {
    return () => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setBannerDismissed(false);
  }, [data.verificationStatus, data.hasPendingUpdate]);

  // **Empty-state guard.** The dashboard only renders its full
  // content once we have a profile doc with a populated `fullName`.
  // If the snapshot fired but the doc is missing or has no name,
  // the user is "not a real tutor yet" (e.g. they closed the app
  // mid-onboarding, or a partial write lost atomicity). Show a
  // "Complete your profile" CTA instead of an empty dashboard
  // with placeholder zeros.
  //
  // We deliberately do *not* redirect to /profile-tutor from
  // here — the layout guard already handles the
  // `verificationStatus === "pending"` case by routing to
  // /tutor-pending, and that screen's back-button takes the tutor
  // to the role-selection or profile-tutor flow. This empty state
  // is the last line of defense.
  if (hasLoaded && data.fullName === "") {
    return <TutorDashboardEmptyState />;
  }

  return (
    <ScreenLayout variant="background">

      {/* Header — standard ScreenHeader slot */}
      <ScreenHeader variant="light">
        <View className="flex-row justify-between items-start gap-3">
          {/* `flex-1 min-w-0` lets the greeting column shrink when
              the bell takes space on long names (e.g. "Suhan Dongol").
              Without it the screen-title clips to the bell's width
              and reads as "Suh…" in the screenshots. */}
          <View className="flex-1 min-w-0">
            <Text className="text-body text-text-secondary">Good to see you,</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.brand.accent, paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text
                className="text-screen-title font-medium text-text-primary mt-0.5"
                numberOfLines={1}
              >
                {data.fullName}
              </Text>
            </View>
            {data.isVerifiedProfessional ? (
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-pill bg-verification-light mt-2 self-start">
                <Ionicons name="shield-checkmark" size={12} color={colors.brand.verification} />
                <Text className="text-caption text-success font-medium">
                  Verified Professional
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  unreadMessages > 0
                    ? `Messages, ${unreadMessages} unread`
                    : "Messages"
                }
                onPress={() => router.push("/messages" as never)}
                className="w-10 h-10 rounded-pill bg-surface border border-border items-center justify-center active:opacity-80"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.brand.primary} />
              </Pressable>
              {unreadMessages > 0 && (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-danger items-center justify-center"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }}
                >
                  <Text className="text-[10px] font-semibold text-white leading-none">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </Text>
                </View>
              )}
            </View>
            <NotificationBell tone="light" />
          </View>
        </View>

        {/* Availability toggle — backed by the tutor's own
            `tutors/{uid}.isAvailableForNewStudents` flag. The switch
            is disabled until the first snapshot lands so it never
            renders a stale optimistic default. */}
        <View className="bg-surface rounded-card px-3.5 py-2.5 mt-3.5 flex-row justify-between items-center border border-border">
          <View className="flex-1 pr-3">
            <Text className="text-body font-medium text-text-primary">
              {available === false ? "Hidden from search" : "Available for new students"}
            </Text>
            <Text className="text-caption text-text-secondary mt-0.5">
              {available == null
                ? "Loading search visibility…"
                : `Toggle to ${available ? "pause" : "resume"} appearing in search results`}
            </Text>
          </View>
          <AvailabilitySwitch
            checked={available !== false}
            disabled={available == null || availableToggleBusy}
            onToggle={handleToggleAvailability}
          />
        </View>

        {/* Toast-style notice when the tutor pauses search
            visibility — confirms the effect of the flip without
            permanently occupying dashboard space. */}
        {visibilityNotice && (
          <View className="mt-3 flex-row items-center gap-2 rounded-card bg-warning-bg border border-warning/30 px-3.5 py-2.5">
            <Ionicons name="eye-off-outline" size={16} color={colors.semantic.warning} />
            <Text className="flex-1 text-caption font-medium text-warning-text">
              Visibility paused — you are hidden from new searches.
            </Text>
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss visibility notice"
              onPress={() => setVisibilityNotice(false)}
            >
              <Ionicons name="close" size={16} color={colors.semantic.warning} />
            </Pressable>
          </View>
        )}
      </ScreenHeader>

      {/* Under-review banner — surfaces when (a) the tutor's signup
          verification is still pending, (b) the admin requested more
          info, (c) the admin rejected the submission, or (d) the
          tutor has a `tutorProfileUpdates/{uid}` doc in `pending`
          state (i.e. an edit is being reviewed). The banner sits
          flush between the dark hero and the white dashboard body
          (no `mx-5` gutter) so the dark night background doesn't
          bleed through on the sides — that bleed is what made the
          banner look "blended" with the availability toggle
          above it. The banner's own `border-t` paints a clean
          amber/blue/red line under the hero, and the dismiss
          button is a clear visual affordance rather than a piece
          of body text. */}
      {!bannerDismissed && data.verificationStatus === "pending" ? (
        <ReviewBanner
          tone="pending"
          message="Your account is being reviewed. You'll get full access once an admin approves your profile."
          onDismiss={() => setBannerDismissed(true)}
        />
      ) : !bannerDismissed && data.verificationStatus === "more_info" ? (
        <ReviewBanner
          tone="info"
          message="An admin has asked for more information. Please update your profile and re-submit."
          onDismiss={() => setBannerDismissed(true)}
        />
      ) : !bannerDismissed && data.verificationStatus === "rejected" ? (
        <ReviewBanner
          tone="rejected"
          message={
            data.rejectionReason
              ? `Reason: ${data.rejectionReason}. Please update your profile and re-submit.`
              : "Your submission was rejected. Please update your profile and re-submit."
          }
          onDismiss={() => setBannerDismissed(true)}
        />
      ) : !bannerDismissed && data.hasPendingUpdate ? (
        <ReviewBanner
          tone="pending"
          message="Your recent profile changes are under review. Your profile isn't being shown to students right now."
          onDismiss={() => setBannerDismissed(true)}
        />
      ) : null}

      <ScreenScroll className="flex-1 bg-background">
        {/* Metric cards — all live. Active students + capacity come
            from the profile doc (maintained by acceptRequest); Avg
            rating + Reviews from the reviews collection; Response
            rate from the full request history. */}
        <View className="flex-row flex-wrap justify-between mb-3.5">
          <Metric
            iconName="people"
            label="Active students"
            value={String(currentStudents)}
          />
          <Metric
            iconName="star"
            label="Avg rating"
            value={
              !reviewsLoaded
                ? "…"
                : reviewCount === 0
                  ? "—"
                  : avgRating.toFixed(1)
            }
          />
          <Metric
            iconName="chatbox-ellipses-outline"
            label="Reviews"
            value={!reviewsLoaded ? "…" : String(reviewCount)}
          />
          <Metric
            iconName="flash-outline"
            label="Response rate"
            value={
              responseRate == null ? "—" : `${responseRate}%`
            }
          />
          <Metric
            iconName="time"
            label="Pending requests"
            value={String(pendingRequests.length)}
          />
        </View>

        {/* Capacity — tappable, routes to the capacity & schedule
            editor (live availability grid) */}
        <Pressable
          onPress={() => router.push("/tutor-capacity")}
          className="bg-surface border border-border rounded-card p-4 mb-3.5 active:opacity-70"
        >
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="people" size={16} color={colors.text.muted} />
            <Text className="flex-1 text-button-sm font-medium text-text-primary">
              Capacity
            </Text>
            <Text
              className={`text-button-sm font-medium ${
                capPct >= 100 ? "text-danger" : "text-verification"
              }`}
            >
              {currentStudents} of {capacity} filled
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </View>
          <View className="h-2 rounded-pill bg-border overflow-hidden">
            <View
              className={`h-full rounded-pill ${capColor}`}
              style={{ width: `${capPct}%` }}
            />
          </View>
        </Pressable>

        {/* Profile completion */}
        <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
          <Text className="text-button-sm font-medium text-text-primary mb-1.5">
            Profile completion
          </Text>
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 h-1.5 rounded-pill bg-border overflow-hidden">
              <View
                className="h-full bg-accent rounded-pill"
                style={{ width: `${data.profileCompletion}%` }}
              />
            </View>
            <Text className="text-button-sm text-accent font-medium">
              {data.profileCompletion}%
            </Text>
          </View>
        </View>

        {/* Today's sessions — derived live from the roster (active
            enrollments on today's weekday within their date window),
            not a `sessions` collection. */}
        <View className="bg-surface border border-border rounded-card p-6 mb-3.5 items-center">
          <View className="w-14 h-14 rounded-pill bg-background border border-border items-center justify-center mb-3">
            <Ionicons name="briefcase-outline" size={26} color={colors.brand.accent} />
          </View>
          {!rosterLoaded ? (
            <Text className="text-caption text-text-muted py-2">
              Loading sessions…
            </Text>
          ) : deriveTodaySessions(roster).length === 0 ? (
            <Text className="text-caption text-text-muted py-2">
              No sessions scheduled today.
            </Text>
          ) : (
            deriveTodaySessions(roster).map((s, i) => (
              <View
                key={s.key}
                className={`flex-row items-center gap-3 py-2.5 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <Text className="w-[60px] text-caption font-medium text-accent">{s.time}</Text>
                <View className="flex-1">
                  <Text className="text-button-sm text-text-primary">{s.student}</Text>
                  <Text className="text-caption text-text-muted mt-0.5">
                    {s.subject}
                    {s.duration ? ` · ${s.duration}` : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Active students — the live roster (same stream the
            capacity screen reads). Removing a student soft-deletes
            the enrollment by direct path, frees a capacity slot,
            and cascades to the batch member doc when the
            enrollment sits in a group batch. */}
        <View className="mb-3.5">
          <View className="flex-row justify-between items-center mb-2.5">
            <Text className="text-card-title font-medium text-text-primary">
              Active students
            </Text>
            <Text className="text-caption text-text-muted">
              {activeRoster.length} of {capacity} filled
            </Text>
          </View>
          {!rosterLoaded ? (
            <Text className="text-caption text-text-muted py-2">
              Loading students…
            </Text>
          ) : activeRoster.length === 0 ? (
            <View className="bg-surface border border-border rounded-card p-5 items-center">
              <Ionicons name="person-outline" size={22} color={colors.text.muted} />
              <Text className="text-caption text-text-muted mt-2 text-center">
                No active students yet. Accepted requests appear here.
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-2.5">
              {activeRoster.map((e) => (
                <View
                  key={e.enrollmentId}
                  className="bg-surface rounded-card p-3.5 border border-border"
                >
                  <View className="flex-row gap-2.5 items-start">
                    <AvatarCircle uri={e.studentAvatar} name={e.studentName} />
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center gap-2">
                        <Text
                          className="text-card-title font-medium text-text-primary flex-1"
                          numberOfLines={1}
                        >
                          {e.studentName}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${e.studentName}`}
                          onPress={() => setRemoveTarget(e)}
                          // 32px visual — hitSlop 8 expands the touch
                          // area to 48px (iOS 44 / Android 48 minimum).
                          hitSlop={8}
                          className="w-8 h-8 rounded-pill bg-danger-bg items-center justify-center active:opacity-70"
                        >
                          <Ionicons name="close" size={16} color={colors.semantic.danger} />
                        </Pressable>
                      </View>
                      <Text className="text-caption text-text-muted mt-0.5">
                        {e.studentGrade} · {formatRosterSlot(e.slotKey)}
                      </Text>
                      <View className="flex-row gap-1 mt-1.5 flex-wrap items-center">
                        {e.subjects.slice(0, 3).map((s) => (
                          <SubjectChip key={s} label={s} />
                        ))}
                        {e.batchId ? (
                          <View className="px-2 py-0.5 rounded-sm bg-ai-light">
                            <Text className="text-micro font-medium text-ai">
                              In batch
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-1.5 text-micro text-text-muted">
                        From {e.startDate}
                        {e.endDate ? ` to ${e.endDate}` : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Pending requests */}
        <View className="mb-3.5">
          <View className="flex-row justify-between items-center mb-2.5">
            <Text className="text-card-title font-medium text-text-primary">
              Pending requests
            </Text>
            <Pressable
              onPress={() => router.push("/tutor-inbox")}
              className="flex-row items-center gap-0.5 active:opacity-70"
            >
              <Text className="text-button-sm text-amber">See all</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.brand.primary} />
            </Pressable>
          </View>

          {/* Sub-tabs */}
          <RequestsSubTabs
            activeKey={reqTab}
            onChange={setReqTab}
            tabs={[
              { key: "enrollments", label: "New enrollments", count: pendingRequests.length },
              { key: "batches", label: "Batch requests", count: 0 },
            ]}
          />

          {reqTab === "enrollments" && (
            <View className="flex-col gap-2.5">
              {!requestsLoaded ? (
                <Text className="text-caption text-text-muted py-2">
                  Loading requests…
                </Text>
              ) : pendingRequests.length === 0 ? (
                <Text className="text-caption text-text-muted py-2">
                  No new enrollment requests.
                </Text>
              ) : (
                pendingRequests.map((req) => (
                  <Pressable
                    key={req.requestId}
                    onPress={() => router.push("/tutor-inbox")}
                    className="bg-surface rounded-card p-3.5 border border-border active:opacity-70"
                  >
                    <View className="flex-row gap-2.5 items-start">
                      <AvatarCircle uri={req.studentAvatar} name={req.studentName} />
                      <View className="flex-1">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-card-title font-medium text-text-primary">
                            {req.studentName}
                          </Text>
                          <StatusBadge status="pending" />
                        </View>
                        <Text className="text-caption text-text-muted mt-0.5">
                          {req.studentGrade}
                        </Text>
                        <View className="flex-row gap-1 mt-1.5 flex-wrap">
                          {req.subjects.map((s) => (
                            <SubjectChip key={s} label={s} />
                          ))}
                        </View>
                        <Text className="mt-1.5 text-micro text-text-muted">
                          {req.schedule} · From {req.startDate}
                        </Text>
                        {req.message.trim().length > 0 ? (
                          <Text
                            className="mt-1.5 text-caption text-text-secondary"
                            numberOfLines={2}
                          >
                            {req.message}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {reqTab === "batches" && (
            <View className="flex-col gap-2.5">
              <View className="bg-surface rounded-card p-4 border border-border items-center">
                <Ionicons name="people-outline" size={22} color={colors.text.muted} />
                <Text className="text-caption text-text-muted mt-2 text-center">
                  No batch requests right now.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Group batch CTA */}
        <Pressable
          onPress={() => router.push("/batches")}
          className="w-full flex-row items-center gap-3 p-3.5 bg-surface border border-border rounded-card active:opacity-70"
        >
          <View className="w-10 h-10 rounded-lg bg-ai items-center justify-center">
            <Ionicons name="people" size={20} color={colors.text.inverse} />
          </View>
          <View className="flex-1">
            <Text className="text-card-title font-medium text-ai">Create a group batch</Text>
            <Text className="text-caption text-text-muted mt-0.5">
              Combine 2–6 students into a shared batch
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brand.ai} />
        </Pressable>

        {/* Quick actions row */}
        <View className="flex-row flex-wrap justify-between mt-3.5">
          {QUICK_ACTIONS.map(({ label, route }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => router.push(route as never)}
              style={{ width: "48%" }}
              className="bg-surface border border-border rounded-card p-3.5 mb-2.5 active:opacity-70"
            >
              <Text className="text-button-sm font-medium text-text-primary">{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScreenScroll>
      <RemoveEnrollmentDialog
        visible={removeTarget !== null}
        studentName={removeTarget?.studentName ?? ""}
        loading={removing}
        onConfirm={(reason) => void handleRemoveEnrollment(reason)}
        onCancel={() => setRemoveTarget(null)}
      />
      <TutorBottomBar tone="light" />
    </ScreenLayout>
  );
}

type MetricProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Optional footer text (e.g. "+12% MoM"). */
  trend?: string;
  /** Whether the trend arrow points up. */
  trendUp?: boolean;
};


/**
 * Dashboard metric tiles are intentionally monochrome surface cards —
 * the icons render in brand green and the status pop comes from the
 * trend arrow. (No per-tile color accents; amber is reserved for CTAs.)
 */

function Metric({ iconName, label, value, trend, trendUp }: MetricProps) {
  return (
    <View
      className="bg-surface border border-border rounded-card p-3.5 mb-2.5"
      style={{ width: "48%" }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="w-8 h-8 rounded-lg items-center justify-center bg-background border border-border">
          <Ionicons
            name={iconName}
            size={16}
            color={colors.brand.primary}
          />
        </View>
        {trendUp ? <Ionicons name="trending-up" size={14} color={colors.brand.verification} /> : null}
      </View>
      <Text className="text-label text-text-muted mb-1">{label}</Text>
      <Text className="text-heading text-text-primary leading-tight">{value}</Text>
      <Text
        className={`text-caption mt-1 ${trendUp ? "text-verification" : "text-text-muted"}`}
      >
        {trend}
      </Text>
    </View>
  );
}

/** `day:slot` → "Mon · 5–7 PM" — used by the roster rows. */
function formatRosterSlot(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} · ${TIME_SLOT_LABELS[parsed.slot]}`;
}

type SubjectChipProps = {
  label: string;
};

/**
 * Pill chip used inside enrollment / batch request cards. Inline
 * because the data is inline and we don't have a shared chip
 * primitive yet.
 */
function SubjectChip({ label }: SubjectChipProps) {
  return (
    <View className="px-2 py-0.5 rounded-sm bg-accent-light">
      <Text className="text-micro text-accent-dark font-medium">{label}</Text>
    </View>
  );
}

type StatusBadgeProps = {
  status: "pending" | "accepted" | "rejected";
};

function StatusBadge({ status }: StatusBadgeProps) {
  const palette: Record<StatusBadgeProps["status"], { bg: string; text: string; label: string }> = {
    pending:  { bg: "bg-warning-bg",  text: "text-warning",  label: "Pending"  },
    accepted: { bg: "bg-success-bg",  text: "text-success",  label: "Accepted" },
    rejected: { bg: "bg-danger-bg",   text: "text-danger",   label: "Declined" },
  };
  const { bg, text, label } = palette[status];
  return (
    <View className={`px-2 py-0.5 rounded-sm ${bg}`}>
      <Text className={`text-micro font-semibold ${text}`}>{label}</Text>
    </View>
  );
}

type AvatarCircleProps = { uri?: string | null; name?: string };

/**
 * Renders the student's avatar when a real URL exists; otherwise
 * falls back to the student's initial on a tinted tile. The truthy
 * guard is required: `<Image source={{ uri: "" }}>` throws on
 * Android, and live requests may carry a null avatar.
 */
function AvatarCircle({ uri, name }: AvatarCircleProps) {
  const hasImage = typeof uri === "string" && uri.length > 0;
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  if (!hasImage) {
    return (
      <View className="w-10 h-10 rounded-pill bg-background border border-border items-center justify-center">
        <Text className="text-card-title font-medium text-text-muted">{initial}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      className="w-10 h-10 rounded-pill bg-background border border-border"
    />
  );
}

/**
 * Empty-state shown when the dashboard's `onSnapshot` returned but
 * the profile doc is missing or has no `fullName`. The layout
 * guard's primary fix is to route these users to /tutor-pending
 * (which the user navigates back through to re-submit), but this
 * is the last line of defense in case the guard ever lets a
 * partially-onboarded user slip through to /tutor-home. The
 * "Complete your profile" CTA takes them to /profile-tutor.
 */
function TutorDashboardEmptyState() {
  const router = useRouter();
  return (
    <ScreenLayout variant="background">
      <View className="flex-1 items-center justify-center px-8">
        <FloatingEmptyIcon
          iconName="document-text-outline"
          iconColor="#E5A03B"
          iconBgClass="bg-accent-soft"
          size={28}
          sizeClass="w-16 h-16"
        />
        <Text className="text-section-title font-medium text-text-primary text-center">
          Your tutor profile isn&apos;t set up yet
        </Text>
        <Text className="text-body text-text-secondary text-center mt-2 leading-relaxed">
          Finish your tutor profile to unlock the dashboard. You&apos;ll
          add your subjects, rate, location, and verification
          documents.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Complete your tutor profile"
          onPress={() => router.replace("/profile-tutor")}
          className="mt-6 min-h-btn-lg rounded-card bg-accent items-center justify-center px-8 active:opacity-90"
        >
          <Text className="text-button text-text-inverse font-semibold">
            Complete your profile
          </Text>
        </Pressable>
        <Text className="text-caption text-text-muted text-center mt-5">
          Already submitted? You may be under admin review — check
          the &quot;Under review&quot; page.
        </Text>
      </View>
    </ScreenLayout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const TRACK_WIDTH = 44;
const THUMB_SIZE = 20;

/**
 * Animated availability switch. Replaces the previous class-swap
 * (`bg-verification` vs `bg-white/20` + `left-5` vs `left-0.5`) with
 * a spring-sliding thumb and a smoothly interpolated track color
 * (white/20 → verification green). Wrapped in a `Pressable` so the
 * tap target stays tappable on the full 44×24 area.
 */
function AvailabilitySwitch({
  checked,
  onToggle,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  // Track bg color — interpolated between the off (white/20) and on
  // (verification green) tokens. Using the same hex lookups that
  // exist elsewhere in the codebase so we don't introduce new colors.
  const TRACK_OFF = "#E7E1D3";
  const TRACK_ON = colors.brand.verification;
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: motion.duration.medium,
    });
  }, [checked, progress]);

  const trackStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [TRACK_OFF, TRACK_ON],
      ),
    };
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel="Toggle availability"
      onPress={disabled ? undefined : onToggle}
      // `overflow-hidden` clips the sliding thumb (and its shadow)
      // to the rounded track so it never bleeds outside the 44×24
      // pill while animating.
      className="w-11 h-6 rounded-pill px-0.5 justify-center overflow-hidden"
    >
      <Animated.View
        style={trackStyle}
        className="absolute inset-0 rounded-pill"
      />
      <SwitchThumb
        checked={checked}
        trackWidth={TRACK_WIDTH}
        thumbSize={THUMB_SIZE}
        thumbClassName="w-5 h-5 rounded-pill bg-white border border-border shadow-sm"
        style={{ elevation: 2 }}
      />
    </Pressable>
  );
}

/**
 * Two-tab segmented control for the requests section ("New
 * enrollments" / "Batch requests"). The active tab is signaled by
 * a single sliding `ActivePill` behind the labels (and the count
 * chip), instead of a per-tab `bg-primary` class-swap.
 */
function RequestsSubTabs<TKey extends string>({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: { key: TKey; label: string; count: number }[];
  activeKey: TKey;
  onChange: (key: TKey) => void;
}) {
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeKey),
  );
  return (
    <View
      className="flex-row bg-surface-muted rounded-pill p-1 mb-2.5 relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ActivePill
          count={tabs.length}
          activeIndex={activeIndex}
          itemWidth={width / tabs.length}
          pillClassName="absolute top-1 h-9 rounded-pill bg-primary"
          style={{
            top: 4,
            height: 36,
            width: width / tabs.length - 8,
            marginLeft: 4,
            backgroundColor: colors.brand.primary,
          }}
        />
      ) : null}
      {tabs.map((t, i) => {
        const on = i === activeIndex;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className="flex-1 h-9 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-80 z-10"
          >
            <Text
              className={`text-caption font-medium ${
                on ? "text-white" : "text-text-secondary"
              }`}
            >
              {t.label}
            </Text>
            <View
              className={`px-1.5 py-[1px] rounded-pill ${
                on ? "bg-white/25" : "bg-border"
              }`}
            >
              <Text
                className={`text-micro font-semibold ${
                  on ? "text-white" : "text-text-muted"
                }`}
              >
                {t.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}