/**
 * EdumentX — My Enrollments (student)
 *
 * Phase 6 (Aug 3, 2026) — wired to live Firestore data.
 *
 * Three tabs: Active / Pending / Past.
 *
 *   - Pending tab = live `subscribeRequestsByStudent(studentUid)`
 *     collectionGroup query over `enrollmentRequests/*\/requests`.
 *     Filters by `status === "pending"`.
 *   - Active tab = live `subscribeEnrollmentsByStudent(studentUid)`
 *     filtered by `status === "active"`.
 *   - Past tab = same subscription, filtered by
 *     `status in ["removed", "expired"]`.
 *
 * Tapping a card navigates to `/tutor/{tutorUid}` so the student can
 * view the tutor's full profile (TutorDetailsScreen). When the card
 * is in the Pending tab, the tutor's other actions are read-only —
 * the student is waiting on the tutor's decision.
 *
 * Empty states per tab:
 *   - Pending:  "No pending requests" + helper
 *   - Active:   "No active enrollments" + "Find a tutor" CTA → /map-search
 *   - Past:     "No past enrollments" + helper
 *
 * Old mock data path (Phase 4) is preserved for offline / dev
 * parity but only used when `EXPO_PUBLIC_USE_MOCK_DATA=true` — the
 * repository selector at `services/enrollments/dataSource.ts`
 * already swaps implementations.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { ActivePill } from "@/components/motion";
import { BottomNav } from "@/components/shared/BottomNav";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
  ScreenSheet,
} from "@/components/shared/ScreenLayout";
import { colors } from "@/constants/colors";

import { useAuthStore } from "@/store/authStore";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import type {
  Enrollment as LiveEnrollment,
  EnrollmentRequest as LiveEnrollmentRequest,
} from "@/services/enrollments/types";
import { todayIsoInKtm } from "@/services/enrollments/derived";
import { ReviewModal } from "@/components/domain/ReviewModal";
import { EditRequestSheet } from "@/components/domain/EditRequestSheet";

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

// ─── Tab model ────────────────────────────────────────────────────────────────

type Tab = "active" | "pending" | "past";

const TAB_LABELS: Record<Tab, string> = {
  active: "Active",
  pending: "Pending",
  past: "Past",
};

// ─── Screen ─────────────────────────────────────────────────────────────────

export function MyEnrollments() {
  const router = useRouter();
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const [tab, setTab] = useState<Tab>("active");
  const [requests, setRequests] = useState<LiveEnrollmentRequest[]>([]);
  const [enrollments, setEnrollments] = useState<LiveEnrollment[]>([]);
  const [hasLoadedRequests, setHasLoadedRequests] = useState(false);
  const [hasLoadedEnrollments, setHasLoadedEnrollments] = useState(false);
  const [reviewModalFor, setReviewModalFor] = useState<{
    tutorUid: string;
    tutorName: string;
  } | null>(null);
  // The request the student has tapped "Edit" on. The sheet
  // pre-fills from this and writes back via the repo on save.
  const [editingRequest, setEditingRequest] =
    useState<LiveEnrollmentRequest | null>(null);

  // Live subscription — student's own requests
  useEffect(() => {
    if (!studentUid) {
      setRequests([]);
      setHasLoadedRequests(true);
      return;
    }
    const repo = getEnrollmentRepository();
    const unsub = repo.subscribeRequestsByStudent(
      studentUid,
      (list) => {
        setRequests(list);
        setHasLoadedRequests(true);
      },
      (err) => {
        console.warn("Enrollment.tsx: subscribeRequestsByStudent failed", err);
        setHasLoadedRequests(true);
      },
    );
    return unsub;
  }, [studentUid]);

  // Live subscription — student's own enrollments (active + past)
  useEffect(() => {
    if (!studentUid) {
      setEnrollments([]);
      setHasLoadedEnrollments(true);
      return;
    }
    const repo = getEnrollmentRepository();
    const unsub = repo.subscribeEnrollmentsByStudent(
      studentUid,
      (list) => {
        setEnrollments(list);
        setHasLoadedEnrollments(true);
      },
      (err) => {
        console.warn(
          "Enrollment.tsx: subscribeEnrollmentsByStudent failed",
          err,
        );
        setHasLoadedEnrollments(true);
      },
    );
    return unsub;
  }, [studentUid]);

  // Build the three list slices locally so the tabs stay independent
  // of subscription timing.
  const today = useMemo(() => todayIsoInKtm(), []);
  const pendingList = useMemo(
    () =>
      requests
        .filter((r) => r.status === "pending")
        .sort((a, b) => b.submittedAt - a.submittedAt),
    [requests],
  );
  const activeList = useMemo(
    () =>
      enrollments
        .filter((e) => e.status === "active")
        .sort((a, b) => b.acceptedAt - a.acceptedAt),
    [enrollments],
  );
  const pastList = useMemo(
    () =>
      enrollments
        .filter((e) => e.status === "removed" || e.status === "expired")
        .sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0)),
    [enrollments],
  );

  const list = (() => {
    switch (tab) {
      case "pending":
        return pendingList;
      case "past":
        return pastList;
      case "active":
      default:
        return activeList;
    }
  })();

  const counts: Record<Tab, number> = {
    active: activeList.length,
    pending: pendingList.length,
    past: pastList.length,
  };

  const hasLoaded = hasLoadedRequests && hasLoadedEnrollments;

  /**
   * Dev-only fast-forward. Rewrites the enrollment's `endDate` to
   * yesterday so the next `subscribeEnrollmentsByStudent` callback
   * triggers `sweepExpiredEnrollments` and the card flips from
   * Active → Past. Lets QA exercise the full state machine without
   * waiting weeks for a real enrollment to lapse.
   *
   * Gated by `__DEV__` so the button is hidden in production
   * builds — it directly mutates a Firestore field, which would be
   * a footgun for real students.
   */
  async function fastForwardToPast(e: LiveEnrollment) {
    if (!__DEV__) return;
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, "enrollments", e.tutorUid, "roster", e.enrollmentId);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await updateDoc(ref, {
        endDate: yesterday,
        updatedAt: serverTimestamp(),
      });
      Alert.alert(
        "Dev: fast-forwarded",
        `endDate set to ${yesterday}. The card will move to Past on the next refresh.`,
      );
    } catch (err) {
      console.warn("fastForwardToPast failed", err);
      Alert.alert(
        "Dev: fast-forward failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  async function fastForwardRequestAccepted(r: LiveEnrollmentRequest) {
    if (!__DEV__) return;
    // Synthetically creates an enrollment from the request — useful
    // for verifying the Past tab on a request that the tutor
    // accepted.
    Alert.alert(
      "Dev tip",
      "Use the tutor's inbox → Accept in dev mode to mirror the production flow. The auto-sweep then moves the accepted enrollment to Past once endDate is past.",
    );
    void r;
  }

  return (
    <ScreenLayout variant="background">
      {/* Header — slate hero, same shape as StudentHome / MapSearch
          / AIChat. */}
      <ScreenHeader>
        <Text className="text-body text-white/70 mb-0.5">Your learning</Text>
        <View
          style={{
            borderBottomWidth: 2,
            borderBottomColor: "#E5A03B",
            paddingBottom: 2,
            alignSelf: "flex-start",
          }}
        >
          <Text className="text-screen-title font-medium text-white">
            My Enrollments
          </Text>
        </View>
        <Text className="text-caption text-white/70 mt-1">
          {activeList.length + pendingList.length + pastList.length} total
          enrollments
        </Text>
      </ScreenHeader>

      {/* Tabs + list — light sheet overlapping the dark hero (premium
          dark→light seam, shared `ScreenSheet` pattern) */}
      <ScreenSheet>
        <EnrollmentTabs active={tab} onChange={setTab} counts={counts} />

      {/* List */}
      <ScreenScroll>
        {!hasLoaded ? (
          // First-snapshot skeleton
          <View className="items-center justify-center pt-16 px-6">
            <Ionicons name="sync-outline" size={26} color="#6B7268" />
            <Text className="text-caption text-text-muted mt-2">
              Loading enrollments…
            </Text>
          </View>
        ) : list.length === 0 ? (
          <EmptyStateByTab
            tab={tab}
            onCta={() => router.replace("/map-search")}
          />
        ) : (
          <View className="gap-3 mt-3">
            {tab === "pending" &&
              pendingList.map((r) => (
                <RequestCard
                  key={r.requestId}
                  request={r}
                  onPress={() => router.push(`/tutor/${r.tutorUid}`)}
                  onEdit={() => setEditingRequest(r)}
                />
              ))}
            {tab === "active" &&
              activeList.map((e) => (
                <EnrollmentCard
                  key={e.enrollmentId}
                  enrollment={e}
                  today={today}
                  onPress={() => router.push(`/tutor/${e.tutorUid}`)}
                  onRate={() =>
                    setReviewModalFor({
                      tutorUid: e.tutorUid,
                      tutorName: e.studentName || `Tutor ${e.tutorUid.slice(0, 4)}`,
                    })
                  }
                  onMessage={() =>
                    Alert.alert(
                      "Coming soon",
                      "In-app messaging will be available in a future update.",
                    )
                  }
                  onFastForward={__DEV__ ? () => fastForwardToPast(e) : undefined}
                />
              ))}
            {tab === "past" &&
              pastList.map((e) => (
                <EnrollmentCard
                  key={e.enrollmentId}
                  enrollment={e}
                  today={today}
                  onPress={() => router.push(`/tutor/${e.tutorUid}`)}
                  past
                  onRate={() =>
                    setReviewModalFor({
                      tutorUid: e.tutorUid,
                      tutorName: e.studentName || `Tutor ${e.tutorUid.slice(0, 4)}`,
                    })
                  }
                />
              ))}
          </View>
        )}
      </ScreenScroll>
      </ScreenSheet>

      <BottomNav role="student" current="/enrollment" />

      {/* Rate & Review modal — surfaced from any card's
          "Rate & Review" CTA on the Active or Past tab. */}
      {reviewModalFor ? (
        <ReviewModal
          visible
          tutorUid={reviewModalFor.tutorUid}
          tutorName={reviewModalFor.tutorName}
          onClose={() => setReviewModalFor(null)}
          onSubmitted={() => {
            setReviewModalFor(null);
            Alert.alert(
              "Thanks for your review",
              "Your rating helps other students find the right tutor.",
            );
          }}
        />
      ) : null}

      {/* Edit / remove a pending request. The sheet resolves the
          tutor's name + subjects from the live `enrollments` /
          `requests` stream; if we don't have that context yet we
          fall back to a trimmed version of the uid so the sheet
          still renders. */}
      <EditRequestSheet
        visible={editingRequest !== null}
        request={editingRequest}
        tutor={{
          name: editingRequest
            ? `Tutor ${editingRequest.tutorUid.slice(0, 6)}`
            : "",
          subjects: editingRequest?.subjects ?? [],
        }}
        onClose={() => setEditingRequest(null)}
        onSaved={() => setEditingRequest(null)}
        onRemoved={() => setEditingRequest(null)}
      />
    </ScreenLayout>
  );
}

/* ----------------------------- cards ----------------------------- */

/**
 * Pending-tab card — the student is waiting on the tutor's decision.
 * Tapping the card body navigates to the tutor's profile. Below
 * the read-only summary, two action buttons let the student edit
 * the request (schedule / dates / message) or remove it entirely
 * without waiting for the tutor's decision.
 */
function RequestCard({
  request,
  onPress,
  onEdit,
}: {
  request: LiveEnrollmentRequest;
  onPress: () => void;
  onEdit: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pending request to ${request.tutorUid}`}
      onPress={onPress}
      className="bg-surface border border-border rounded-card p-4 border-l-4 border-l-accent active:opacity-80"
    >
      <View className="flex-row gap-3 items-start">
        {/* Initial avatar — the request doc doesn't carry a tutor
            avatar, so we render a placeholder dot for now. A future
            enhancement can pull the avatar from the tutor's profile
            subdoc in the same render pass. */}
        <View className="w-avatar-card h-avatar-card rounded-pill bg-surface-muted border border-border items-center justify-center">
          <Ionicons name="school-outline" size={22} color={colors.text.muted} />
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-2 mb-1">
            <View className="flex-1 min-w-0 flex-row items-center gap-1.5">
              <Text
                className="text-card-title font-medium text-text-primary"
                numberOfLines={1}
              >
                Request to tutor
              </Text>
            </View>
            <StatusBadge status="pending" />
          </View>

          {/* Subject chips */}
          {request.subjects.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-2">
              {request.subjects.map((s) => (
                <SubjectChip key={s} label={s} />
              ))}
            </View>
          )}

          {/* Schedule */}
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
            <Text className="text-caption text-text-muted" numberOfLines={1}>
              {request.schedule}
            </Text>
          </View>

          {/* Dates */}
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name="calendar-outline"
              size={12}
              color={colors.text.muted}
            />
            <Text className="text-caption text-text-muted">
              {request.startDate} → {request.endDate}
            </Text>
          </View>

          {/* Message preview */}
          {request.message && (
            <View className="mt-2 bg-sand rounded-md p-2">
              <Text
                className="text-caption text-text-secondary"
                numberOfLines={2}
              >
                {request.message}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Edit + remove actions — the student can amend or cancel
          their own request at any time before the tutor decides. */}
      <View className="flex-row gap-2 mt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit request"
          onPress={onEdit}
          className="flex-1 h-10 rounded-md bg-accent-light flex-row items-center justify-center gap-1.5 active:opacity-80"
        >
          <Ionicons name="create-outline" size={14} color="#92400E" />
          <Text className="text-button font-medium text-accent-dark">
            Edit
          </Text>
        </Pressable>
        {/* Remove is in the sheet (with confirm Alert) — no direct
            button on the card so the destructive action is one
            tap further from the user's thumb. */}
      </View>
    </Pressable>
  );
}

/**
 * Active / Past card. The active variant shows the rate + message
 * tutor CTAs (placeholders today). The past variant shows the
 * outcome (removed reason or expired).
 */
function EnrollmentCard({
  enrollment,
  today: _today,
  onPress,
  onRate,
  onMessage,
  onFastForward,
  past = false,
}: {
  enrollment: LiveEnrollment;
  today: string;
  onPress: () => void;
  onRate?: () => void;
  onMessage?: () => void;
  onFastForward?: () => void;
  past?: boolean;
}) {
  const status = past
    ? enrollment.status === "expired"
      ? "past"
      : "past"
    : "active";
  const statusStripe =
    status === "active"
      ? "border-l-4 border-l-verification"
      : "border-l-4 border-l-border";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        past ? "Past enrollment" : "Active enrollment"
      }
      onPress={onPress}
      className={`bg-surface border border-border rounded-card p-4 ${statusStripe} active:opacity-80`}
    >
      <View className="flex-row gap-3 items-start">
        <View className="w-avatar-card h-avatar-card rounded-pill bg-surface-muted border border-border items-center justify-center">
          <Ionicons name="person-outline" size={22} color={colors.text.muted} />
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-2 mb-1">
            <View className="flex-1 min-w-0 flex-row items-center gap-1.5">
              <Text
                className="text-card-title font-medium text-text-primary"
                numberOfLines={1}
              >
                Enrollment #{enrollment.enrollmentId.slice(0, 6)}
              </Text>
            </View>
            <StatusBadge status={status} />
          </View>

          {/* Subject chips */}
          {enrollment.subjects.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-2">
              {enrollment.subjects.map((s) => (
                <SubjectChip key={s} label={s} />
              ))}
            </View>
          )}

          {/* Dates */}
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="calendar-outline"
              size={12}
              color={colors.text.muted}
            />
            <Text className="text-caption text-text-muted">
              {enrollment.startDate} → {enrollment.endDate}
            </Text>
          </View>

          {/* Slot */}
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
            <Text className="text-caption text-text-muted" numberOfLines={1}>
              Slot: {enrollment.slotKey || "flexible"}
            </Text>
          </View>
        </View>
      </View>

      {/* Active CTAs */}
      {!past && onRate && onMessage && (
        <View className="mt-3 gap-2">
          <View className="flex-row gap-2">
            <Pressable
              onPress={onRate}
              className="flex-1 h-10 bg-accent-light rounded-md items-center justify-center active:opacity-80"
            >
              <Text className="text-button-sm font-medium text-accent-dark">
                Rate &amp; Review
              </Text>
            </Pressable>
            <Pressable
              onPress={onMessage}
              className="flex-1 h-10 bg-sand rounded-md items-center justify-center active:opacity-80"
            >
              <Text className="text-button-sm font-medium text-text-secondary">
                Message tutor
              </Text>
            </Pressable>
          </View>
          {/* Dev-only fast-forward: rewrites endDate to yesterday so
              the auto-sweep moves the card to Past on next refresh.
              Hidden in production builds. */}
          {__DEV__ && onFastForward ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dev: fast-forward to past"
              onPress={onFastForward}
              className="h-9 bg-ai-light border border-ai-border rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
            >
              <Ionicons name="flash-outline" size={12} color="#4A7FA5" />
              <Text className="text-micro text-ai font-medium">
                Dev: fast-forward to past
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Past outcome */}
      {past && enrollment.removeReason && (
        <View className="mt-3 flex-row items-center gap-1.5 bg-success-bg rounded-md px-3 py-2">
          <Ionicons
            name={
              enrollment.status === "expired"
                ? "checkmark-done-outline"
                : "information-circle-outline"
            }
            size={14}
            color={colors.text.secondary}
          />
          <Text className="text-caption text-success-text font-medium">
            {enrollment.removeReason}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* --------------------------- helpers --------------------------- */

function EmptyStateByTab({
  tab,
  onCta,
}: {
  tab: Tab;
  onCta: () => void;
}) {
  const config: Record<
    Tab,
    {
      icon: keyof typeof Ionicons.glyphMap;
      title: string;
      subtitle: string;
      cta?: string;
      onCta?: () => void;
    }
  > = {
    active: {
      icon: "school-outline",
      title: "No active enrollments",
      subtitle: "Find a verified tutor to start your first session.",
      cta: "Find a tutor",
      onCta,
    },
    pending: {
      icon: "mail-open-outline",
      title: "No pending requests",
      subtitle:
        "Requests you send to tutors will appear here while you wait for their reply.",
    },
    past: {
      icon: "checkmark-done-outline",
      title: "No past enrollments",
      subtitle:
        "Enrollments that end or are removed by the tutor will appear here.",
    },
  };
  const c = config[tab];
  return (
    <View className="items-center justify-center pt-16 px-6">
      <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
        <Ionicons name={c.icon} size={26} color="#E5A03B" />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center">
        {c.title}
      </Text>
      <Text className="text-body text-text-secondary text-center mt-1.5">
        {c.subtitle}
      </Text>
      {c.cta && c.onCta && (
        <Pressable
          onPress={c.onCta}
          className="mt-5 min-h-btn px-6 rounded-card bg-accent items-center justify-center active:opacity-80"
        >
          <Text className="text-button text-text-inverse font-semibold">
            {c.cta}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: "active" | "pending" | "past" }) {
  const map: Record<
    "active" | "pending" | "past",
    {
      label: string;
      bg: string;
      fg: string;
      icon: keyof typeof Ionicons.glyphMap;
    }
  > = {
    active: {
      label: "Active",
      bg: "bg-success-bg",
      fg: "text-success-text",
      icon: "radio-button-on",
    },
    pending: {
      label: "Pending",
      bg: "bg-warning-bg",
      fg: "text-warning-text",
      icon: "hourglass-outline",
    },
    past: {
      label: "Past",
      bg: "bg-sand",
      fg: "text-text-secondary",
      icon: "checkmark-done-outline",
    },
  };
  const m = map[status];
  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 rounded-pill ${m.bg}`}
    >
      <Ionicons
        name={m.icon}
        size={11}
        color={
          m.fg === "text-text-secondary"
            ? colors.text.muted
            : m.fg === "text-warning-text"
              ? "#92400E"
              : "#3F8A5A"
        }
      />
      <Text className={`text-micro font-medium ${m.fg}`}>{m.label}</Text>
    </View>
  );
}

function SubjectChip({ label }: { label: string }) {
  return (
    <View className="bg-sand rounded-sm px-2 py-0.5">
      <Text className="text-micro text-text-secondary font-medium">
        {label}
      </Text>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const TABS_ORDER: Tab[] = ["active", "pending", "past"];

/**
 * Three-tab top bar (Active / Pending / Past). The active tab is
 * signaled by a single sliding `ActivePill` behind the labels, with
 * the count chip and label color swapping to match. Replaces the
 * per-tab `bg-primary` class-swap.
 */
function EnrollmentTabs({
  active,
  onChange,
  counts,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  counts: Record<Tab, number>;
}) {
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(0, TABS_ORDER.indexOf(active));
  return (
    <View
      className="flex-row bg-surface border-b border-border shrink-0 relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ActivePill
          count={TABS_ORDER.length}
          activeIndex={activeIndex}
          itemWidth={width / TABS_ORDER.length}
          pillClassName="absolute top-0 h-12 bg-primary"
          style={{
            top: 0,
            height: 48,
            width: width / TABS_ORDER.length,
            backgroundColor: "#2F5D50",
          }}
        />
      ) : null}
      {TABS_ORDER.map((t, i) => {
        const isActive = i === activeIndex;
        const count = counts[t];
        return (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityLabel={TAB_LABELS[t]}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(t)}
            className="flex-1 h-12 flex-row items-center justify-center gap-1.5 active:opacity-70 z-10"
          >
            <Text
              className={
                // The Active pill sits on `bg-primary` (#2F5D50 — dark
                // forest green) so the label needs white to stay
                // legible. Black-on-green was the bug surfaced in the
                // August 9 screenshots.
                isActive
                  ? "text-button font-medium text-white"
                  : "text-button font-medium text-text-muted"
              }
            >
              {TAB_LABELS[t]}
            </Text>
            {count > 0 ? (
              <View
                className={
                  isActive
                    ? "min-w-[20px] h-5 px-1.5 rounded-pill bg-white/25 items-center justify-center"
                    : "min-w-[20px] h-5 px-1.5 rounded-pill bg-sand items-center justify-center"
                }
              >
                <Text
                  className={
                    isActive
                      ? "text-micro text-white font-semibold"
                      : "text-micro text-text-muted font-semibold"
                  }
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}