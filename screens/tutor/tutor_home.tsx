import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { TutorBottomBar } from "@/components/TutorBottomBar";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Tutor Dashboard (UI-only milestone)
 *
 * Live reads from `users/{uid}/tutorProfile/default` via `onSnapshot`.
 * Empty-state copy stays for the sessions / pending-request cards —
 * those collections land in Phase 5. Numeric metric values
 * (rating, reviews, response rate, monthly earnings) now come from the
 * tutor profile doc so they reflect the saved `fullName` and not the
 * stale "Manoj Khadka" mock that lived here before.
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
  rating: number;
  reviews: number;
  responseRate: number;
  profileCompletion: number;
  thisMonthEarningsNpr: number;
}

const FALLBACK: TutorDashboardData = {
  fullName: "Tutor",
  isVerifiedProfessional: false,
  capacity: 0,
  currentStudents: 0,
  rating: 0,
  reviews: 0,
  responseRate: 0,
  profileCompletion: 0,
  thisMonthEarningsNpr: 0,
};

function toNum(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

// TODO(firebase): replace with a Firestore `sessions` query filtered by
// `tutorId == auth.uid && date == today`.
const TODAY_SESSIONS: readonly {
  time: string;
  student: string;
  subject: string;
  duration: string;
}[] = [
  { time: "4:00 PM", student: "Aarav Tamang",     subject: "Mathematics", duration: "60 min" },
  { time: "6:00 PM", student: "Priya Maharjan",   subject: "Physics",     duration: "60 min" },
];

type PendingRequest = {
  id: string;
  student: { name: string; grade: string; avatar: string };
  subjects: string[];
  plan: string;
  schedule: string;
  startDate: string;
};

// TODO(firebase): replace with a Firestore `enrollmentRequests` query
// filtered by `tutorId == auth.uid && status == "pending"`. The shape
// mirrors the planned document so the JSX consumer below doesn't need
// to change.
const PENDING_REQUESTS: readonly PendingRequest[] = [
  {
    id: "er1",
    student: { name: "Sita Karki",    grade: "Grade 9",  avatar: "https://i.pravatar.cc/100?img=47" },
    subjects: ["Mathematics", "Physics"],
    plan: "2x / week",
    schedule: "Mon · Wed · 5–6 PM",
    startDate: "Aug 12",
  },
  {
    id: "er2",
    student: { name: "Bishal Thapa",  grade: "Grade 11", avatar: "https://i.pravatar.cc/100?img=12" },
    subjects: ["Chemistry"],
    plan: "1x / week",
    schedule: "Sat · 10–11 AM",
    startDate: "Aug 17",
  },
];

type BatchRequest = {
  id: string;
  kind: "join" | "conversion";
  student: { name: string; grade: string; avatar: string };
  subject: string;
  slotId: string;
  sessionCode: string;
  message?: string;
  submittedAt: string;
};

// TODO(firebase): replace with a Firestore `batchRequests` query
// filtered by `tutorId == auth.uid && status == "pending"`. Includes
// both "join" (existing batch) and "conversion" (1:1 trial) requests.
const BATCH_REQUESTS: readonly BatchRequest[] = [
  {
    id: "br1",
    kind: "join",
    student: { name: "Anish Pradhan", grade: "Grade 10", avatar: "https://i.pravatar.cc/100?img=33" },
    subject: "Mathematics",
    slotId: "slot-a",
    sessionCode: "MATH-A2F",
    submittedAt: "Submitted 2h ago",
  },
  {
    id: "br2",
    kind: "conversion",
    student: { name: "Sneha Adhikari", grade: "Grade 8", avatar: "https://i.pravatar.cc/100?img=20" },
    subject: "Science",
    slotId: "slot-b",
    sessionCode: "SCI-91K",
    message: "Loved the trial last week. Can we make this weekly?",
    submittedAt: "Submitted yesterday",
  },
];

type SessionSlot = {
  id: string;
  label: string;
  students: number;
  capacity: number;
  currentStudents: number;
  rating: number;
  reviews: number;
  responseRate: number;
  profileCompletion: number;
  thisMonthEarningsNpr: number;
};

// TODO(firebase): replace with a Firestore `sessions` query filtered by
// `tutorId == auth.uid`. Three entries are enough for the demo.
const SESSION_SLOTS: readonly SessionSlot[] = [
  {
    id: "slot-a",
    label: "Morning batch · 7–8 AM",
    students: 5,
    capacity: 8,
    currentStudents: 5,
    rating: 4.8,
    reviews: 47,
    responseRate: 92,
    profileCompletion: 75,
    thisMonthEarningsNpr: 12_000,
  },
  {
    id: "slot-b",
    label: "Afternoon batch · 2–3 PM",
    students: 4,
    capacity: 6,
    currentStudents: 4,
    rating: 4.6,
    reviews: 31,
    responseRate: 88,
    profileCompletion: 75,
    thisMonthEarningsNpr: 9_000,
  },
  {
    id: "slot-c",
    label: "Evening batch · 5–6 PM",
    students: 3,
    capacity: 6,
    currentStudents: 3,
    rating: 4.7,
    reviews: 22,
    responseRate: 90,
    profileCompletion: 75,
    thisMonthEarningsNpr: 7_000,
  },
];

type QuickAction = { label: string; feature: string };

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "View inbox",     feature: "Inbox"        },
  { label: "Manage batches", feature: "Batch manager" },
  { label: "Set availability", feature: "Availability" },
];

type ReqTab = "enrollments" | "batches";

function showComingSoon(feature: string) {
  Alert.alert("Coming soon", `${feature} will be added in a future update.`);
}

/**
 * Sign-out used to live here but moved to the tutor profile tab
 * (`screens/tutor/edit_profile.tsx`) on June 28, 2026 so the
 * affordance sits next to the user's account info — same place the
 * student has it. Removing the function also clears the
 * `'handleSignOut' is defined but never used` eslint warning.
 */

export function TutorDashboard() {
  const user = useAuthStore((state) => state.user);
  const [available, setAvailable] = useState(true);
  const [reqTab, setReqTab] = useState<ReqTab>("enrollments");
  const [batchActions, setBatchActions] = useState<Record<string, "accepted" | "rejected">>({});

  // Live read from the tutorProfile subcollection. We subscribe via
  // `onSnapshot` so future Phase-5 "Edit profile" writes propagate to
  // the dashboard without a reload. The student's home screen uses
  // the same pattern (see `StudentHome.tsx`).
  const [data, setData] = useState<TutorDashboardData>(FALLBACK);

  useEffect(() => {
    if (!user) {
      setData(FALLBACK);
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
          return;
        }
        setData({
          fullName:
            typeof d.fullName === "string" && d.fullName.trim().length > 0
              ? d.fullName.trim()
              : "Tutor",
          isVerifiedProfessional: !!(d as { isVerifiedProfessional?: boolean })
            .isVerifiedProfessional,
          capacity: toNum((d as { capacity?: number }).capacity),
          currentStudents: toNum((d as { currentStudents?: number }).currentStudents),
          rating: toNum((d as { rating?: number }).rating),
          reviews: toNum((d as { reviews?: number }).reviews),
          responseRate: toNum((d as { responseRate?: number }).responseRate),
          profileCompletion: toNum(
            (d as { profileCompletion?: number }).profileCompletion,
          ),
          thisMonthEarningsNpr: toNum(
            (d as { thisMonthEarningsNpr?: number }).thisMonthEarningsNpr,
          ),
        });
      },
      (err) => {
        console.warn("TutorDashboard: profile read failed", err);
        setData(FALLBACK);
      },
    );
    return () => unsub();
  }, [user]);

  const capacity = data.capacity;
  const currentStudents = data.currentStudents;
  const capPct = capacity > 0 ? (currentStudents / capacity) * 100 : 0;
  const capColor =
    capPct >= 100
      ? "bg-danger"
      : capPct > 80
        ? "bg-warning"
        : "bg-verification";

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-night px-4 pb-5 shrink-0">
        <View className="flex-row justify-between items-start pt-2">
          <View>
            <Text className="text-body text-white/70">Welcome back,</Text>
            <Text className="text-screen-title font-medium text-white mt-0.5">
              {data.fullName || "Tutor"}
            </Text>
            {data.isVerifiedProfessional ? (
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-pill bg-verification-light mt-2 self-start">
                <Ionicons name="shield-checkmark" size={12} color="#A7F3D0" />
                <Text className="text-caption text-success font-medium">
                  Verified Professional
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Availability toggle */}
        <View className="bg-white/15 rounded-lg px-3.5 py-2.5 mt-3.5 flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-body font-medium text-white">
              {available ? "Available for new students" : "Hidden from search"}
            </Text>
            <Text className="text-caption text-white/65 mt-0.5">
              Toggle to {available ? "pause" : "resume"} appearing in search
              results
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: available }}
            accessibilityLabel="Toggle availability"
            onPress={() => setAvailable(!available)}
            className={`w-11 h-6 rounded-full px-0.5 active:opacity-80 ${
              available ? "bg-verification" : "bg-white/20"
            }`}
          >
            <View
              className={`w-[22px] h-[22px] rounded-full bg-white
              ${
                available ? "left-5" : "left-0.5"
              }`}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-9"
        showsVerticalScrollIndicator={false}
      >
        {/* Metric cards 2x2 */}
        <View className="flex-row flex-wrap justify-between mb-3.5">
          <Metric
            iconName="people"
            colorClass="bg-amber-light"
            iconColor="amber"
            label="Active students"
            value={String(currentStudents)}
          />
          <Metric
            iconName="star"
            colorClass="bg-warning-bg"
            iconColor="warning"
            label="Avg rating"
            value={data.rating.toFixed(1)}
          />
          <Metric
            iconName="time"
            colorClass="bg-verification-light"
            iconColor="verification"
            label="Pending requests"
            value="0"
          />
          <Metric
            iconName="cash"
            colorClass="bg-ai-light"
            iconColor="ai"
            label="This month"
            value={
              data.thisMonthEarningsNpr > 0
                ? `Rs ${data.thisMonthEarningsNpr.toLocaleString("en-IN")}`
                : "Rs 0"
            }
          />
        </View>

        {/* Capacity */}
        <Pressable
          onPress={() => showComingSoon("Capacity management")}
          className="bg-surface border border-border rounded-card p-4 mb-3.5 active:opacity-70"
        >
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="people" size={16} color="#B45309" />
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
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
          <View className="h-2 rounded-full bg-background overflow-hidden">
            <View
              className={`h-full rounded-full ${capColor}`}
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
            <View className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
              <View
                className="h-full bg-amber rounded-full"
                style={{ width: `${data.profileCompletion}%` }}
              />
            </View>
            <Text className="text-button-sm text-amber font-medium">
              {data.profileCompletion}%
            </Text>
          </View>
        </View>

        {/* Empty state — sessions, requests, and batch tooling
            land in Phase 5 alongside the collections that back
            them. We deliberately don't show fake names or stats
            here. */}
        <View className="bg-surface border border-border-subtle rounded-card p-6 mb-3.5 items-center">
          <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
            <Ionicons name="briefcase-outline" size={26} color="#B45309" />
          </View>
          {TODAY_SESSIONS.length === 0 ? (
            <Text className="text-caption text-text-muted py-2">
              No sessions scheduled today.
            </Text>
          ) : (
            TODAY_SESSIONS.map((s, i) => (
              <View
                key={s.time}
                className={`flex-row items-center gap-3 py-2.5 ${
                  i > 0 ? "border-t border-border-subtle" : ""
                }`}
              >
                <Text className="w-[60px] text-caption font-medium text-amber">{s.time}</Text>
                <View className="flex-1">
                  <Text className="text-button-sm text-text-primary">{s.student}</Text>
                  <Text className="text-caption text-text-muted mt-0.5">
                    {s.subject} · {s.duration}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Pending requests */}
        <View className="mb-3.5">
          <View className="flex-row justify-between items-center mb-2.5">
            <Text className="text-card-title font-medium text-text-primary">
              Pending requests
            </Text>
            <Pressable
              onPress={() => showComingSoon("Inbox")}
              className="flex-row items-center gap-0.5 active:opacity-70"
            >
              <Text className="text-button-sm text-amber">See all</Text>
              <Ionicons name="chevron-forward" size={14} color="amber" />
            </Pressable>
          </View>

          {/* Sub-tabs */}
          <View className="flex-row bg-surface border border-border rounded-xl p-1 mb-2.5">
            {(
              [
                { key: "enrollments", label: "New enrollments", count: PENDING_REQUESTS.length },
                { key: "batches",     label: "Batch requests",  count: BATCH_REQUESTS.length },
              ] as const
            ).map((t) => {
              const on = reqTab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setReqTab(t.key)}
                  className={`flex-1 h-9 rounded-lg flex-row items-center justify-center gap-1.5 ${
                    on ? "bg-night" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-caption font-medium ${
                      on ? "text-white" : "text-text-secondary"
                    }`}
                  >
                    {t.label}
                  </Text>
                  <View
                    className={`px-1.5 py-[1px] rounded-full ${
                      on ? "bg-white/25" : "bg-background"
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

          {reqTab === "enrollments" && (
            <View className="flex-col gap-2.5">
              {PENDING_REQUESTS.length === 0 ? (
                <Text className="text-caption text-text-muted py-2">
                  No new enrollment requests.
                </Text>
              ) : (
                PENDING_REQUESTS.map((req) => (
                  <Pressable
                    key={req.id}
                    onPress={() => showComingSoon("Request details")}
                    className="bg-surface rounded-card p-3.5 border border-border active:opacity-70"
                  >
                    <View className="flex-row gap-2.5 items-start">
                      <AvatarCircle uri={req.student.avatar} />
                      <View className="flex-1">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-card-title font-medium text-text-primary">
                            {req.student.name}
                          </Text>
                          <StatusBadge status="pending" />
                        </View>
                        <Text className="text-caption text-text-muted mt-0.5">
                          {req.student.grade}
                        </Text>
                        <View className="flex-row gap-1 mt-1.5 flex-wrap">
                          {req.subjects.map((s) => (
                            <SubjectChip key={s} label={s} />
                          ))}
                        </View>
                        <Text className="mt-1.5 text-micro text-text-muted">
                          {req.plan} · {req.schedule} · From {req.startDate}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {reqTab === "batches" && (
            <View className="flex-col gap-2.5">
              {BATCH_REQUESTS.length === 0 ? (
                <Text className="text-caption text-text-muted py-2">
                  No batch requests right now.
                </Text>
              ) : (
                BATCH_REQUESTS.map((br) => {
                  const slot = SESSION_SLOTS.find((s) => s.id === br.slotId);
                  const isFull = !!(slot && slot.students >= slot.capacity);
                  const blocked = br.kind === "join" && isFull;
                  const action = batchActions[br.id];
                  const accent = statusAccent(br.kind);

                  return (
                    <View
                      key={br.id}
                      className={`bg-surface rounded-card p-3.5 border ${
                        action === "accepted"
                          ? "border-verification"
                          : action === "rejected"
                            ? "border-danger-bg"
                            : "border-border"
                      }`}
                      style={{ opacity: action ? 0.85 : 1 }}
                    >
                      <View
                        className={`self-start flex-row items-center gap-1.5 px-2 py-1 rounded-pill border mb-2.5 ${accent.bg} ${accent.border}`}
                      >
                        <Ionicons name={accent.icon} size={11} color={accent.iconColor} />
                        <Text className={`text-micro font-semibold tracking-wider ${accent.color}`}>
                          {accent.label}
                        </Text>
                      </View>

                      <View className="flex-row gap-2.5 items-start">
                        <AvatarCircle uri={br.student.avatar} />
                        <View className="flex-1">
                          <Text className="text-card-title font-medium text-text-primary">
                            {br.student.name}
                          </Text>
                          <Text className="text-caption text-text-muted mt-0.5">
                            {br.student.grade} · {br.subject}
                          </Text>

                          {br.kind === "join" && slot ? (
                            <View className="mt-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
                              <View className="flex-row items-center gap-1.5">
                                <Ionicons name="lock-closed" size={11} color="#4F46E5" />
                                <Text className="text-caption font-medium text-text-secondary">
                                  {slot.label}
                                </Text>
                              </View>
                              <Text className="text-caption text-text-muted mt-0.5">
                                Code: {br.sessionCode} · {slot.students}/{slot.capacity} students
                              </Text>
                            </View>
                          ) : null}

                          {br.message ? (
                            <Text className="mt-2 text-caption text-text-secondary leading-relaxed italic">
                              &ldquo;{br.message}&rdquo;
                            </Text>
                          ) : null}
                          <Text className="mt-1.5 text-micro text-text-muted">{br.submittedAt}</Text>
                        </View>
                      </View>

                      {blocked && !action ? (
                        <View className="mt-2.5 flex-row items-center gap-1.5 px-2.5 py-2 bg-danger-bg border border-danger-bg rounded-lg">
                          <Ionicons name="alert-circle" size={13} color="#B91C1C" />
                          <Text className="text-caption text-danger-text">
                            Session is full ({slot?.students}/{slot?.capacity}). Approval is blocked.
                          </Text>
                        </View>
                      ) : null}

                      {!action ? (
                        <View className="flex-row gap-2 mt-3">
                          <Pressable
                            disabled={blocked}
                            onPress={() =>
                              !blocked && setBatchActions((p) => ({ ...p, [br.id]: "accepted" }))
                            }
                            className={`flex-1 h-9 rounded-xl flex-row items-center justify-center gap-1.5 ${
                              blocked ? "bg-background" : "bg-verification active:opacity-80"
                            }`}
                          >
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color={blocked ? "#9CA3AF" : "#FFFFFF"}
                            />
                            <Text
                              className={`text-caption font-medium ${
                                blocked ? "text-text-muted" : "text-white"
                              }`}
                            >
                              Accept
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              setBatchActions((p) => ({ ...p, [br.id]: "rejected" }))
                            }
                            className="flex-1 h-9 bg-surface border border-danger-bg rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                          >
                            <Ionicons name="close" size={13} color="#DC2626" />
                            <Text className="text-caption font-medium text-danger">Decline</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text
                          className={`mt-2.5 text-center text-caption ${
                            action === "accepted" ? "text-verification" : "text-text-muted"
                          }`}
                        >
                          {action === "accepted"
                            ? br.kind === "conversion"
                              ? "Accepted — session code generated for student"
                              : "Accepted — student added to batch"
                            : "Declined"}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* Group batch CTA */}
        <Pressable
          onPress={() => showComingSoon("Group batch creation")}
          className="w-full flex-row items-center gap-3 p-3.5 bg-ai-light border border-ai-border rounded-card active:opacity-70"
        >
          <View className="w-10 h-10 rounded-xl bg-ai items-center justify-center">
            <Ionicons name="people" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-card-title font-medium text-ai">Create a group batch</Text>
            <Text className="text-caption text-ai mt-0.5">
              Combine 2–6 students into a shared batch
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#4F46E5" />
        </Pressable>

        {/* Quick actions row */}
        <View className="flex-row flex-wrap justify-between mt-3.5">
          {QUICK_ACTIONS.map(({ label, feature }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => showComingSoon(feature)}
              style={{ width: "48%" }}
              className="bg-surface border border-border rounded-card p-3.5 mb-2.5 active:opacity-70"
            >
              <Text className="text-button-sm font-medium text-text-primary">{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <TutorBottomBar />
    </SafeAreaView>
  );
}

type MetricProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  /** Background class for the icon tile (Tailwind token). */
  colorClass: string;
  /** Ionicons color name (matches `colors` palette or token). */
  iconColor: keyof typeof ICON_COLOR_MAP;
  label: string;
  value: string;
  /** Optional footer text (e.g. "+12% MoM"). */
  trend?: string;
  /** Whether the trend arrow points up. */
  trendUp?: boolean;
};

/**
 * Pill styling for a batch-request card header. Two kinds currently:
 *   - "join":       student wants to join a slot (amber).
 *   - "conversion": student wants to upgrade from trial to weekly
 *                   (verification green).
 */
function statusAccent(kind: "join" | "conversion") {
  if (kind === "join") {
    return {
      bg: "bg-amber/10",
      border: "border-amber/30",
      icon: "person-add-outline" as const,
      iconColor: "#B45309",
      color: "text-amber",
      label: "Join request",
    };
  }
  return {
    bg: "bg-verification/10",
    border: "border-verification/30",
    icon: "swap-horizontal-outline" as const,
    iconColor: "#047857",
    color: "text-verification",
    label: "Conversion",
  };
}

/**
 * Local fallback colors for the metric icon. Most of the project
 * reads `colors.semantic.*` for SVG fills, but Ionicons accepts a
 * raw color string and these match the visual intent of the
 * `colorClass` token we use for the tile background.
 */
const ICON_COLOR_MAP = {
  amber: "#B45309",
  verification: "#047857",
  warning: "#B45309",
  danger: "#DC2626",
  ai: "#4F46E5",
  success: "#047857",
} as const;

function Metric({ iconName, colorClass, iconColor, label, value, trend, trendUp }: MetricProps) {
  return (
    <View
      className="bg-surface border border-border rounded-card p-3.5 mb-2.5"
      style={{ width: "48%" }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View
          className={`w-8 h-8 rounded-lg items-center justify-center ${colorClass}`}
        >
          <Ionicons
            name={iconName}
            size={16}
            color={ICON_COLOR_MAP[iconColor]}
          />
        </View>
        {trendUp ? <Ionicons name="trending-up" size={14} color="#047857" /> : null}
      </View>
      <Text className="text-caption text-text-muted uppercase tracking-wider mb-1">{label}</Text>
      <Text className="text-section-title font-medium text-text-primary leading-tight">{value}</Text>
      <Text
        className={`text-caption mt-1 ${trendUp ? "text-verification" : "text-text-muted"}`}
      >
        {trend}
      </Text>
    </View>
  );
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
    <View className="px-2 py-0.5 rounded-pill bg-amber-light">
      <Text className="text-micro text-amber font-medium">{label}</Text>
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
    <View className={`px-2 py-0.5 rounded-pill ${bg}`}>
      <Text className={`text-micro font-semibold ${text}`}>{label}</Text>
    </View>
  );
}

type AvatarCircleProps = { uri: string };

/**
 * Faux avatar — the mock student list uses `i.pravatar.cc` URLs but
 * the network may be offline. We render the first letter of the name
 * over a tinted tile, which is the same fallback the student card
 * uses, so the UI looks coherent whether the image loads or not.
 */
function AvatarCircle({ uri }: AvatarCircleProps) {
  return (
    <View className="w-10 h-10 rounded-full bg-amber-light items-center justify-center">
      <Ionicons name="person-outline" size={20} color="#B45309" />
      {/* Network image would render here in the wired version:
            <Image source={{ uri }} className="w-10 h-10 rounded-full" /> */}
      <Text className="sr-only">{uri}</Text>
    </View>
  );
}