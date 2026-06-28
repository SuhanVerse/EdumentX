import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/shared/BottomNav";
import {
  BATCH_INVITATIONS,
  ENROLLMENTS,
  initials,
  type BatchInvitation,
  type Enrollment,
  type EnrollmentStatus,
} from "@/data/mockData";

/**
 * EdumentX — My Enrollments (student)
 *
 * Stage 4 (June 27, 2026):
 *   - Three tabs: Active / Pending / Past. Each renders a card list
 *     with mock data sourced from `@/data/mockData` until the real
 *     `enrollments` collection lands in Phase 5.
 *   - Active tab also surfaces a single batch invitation card at the
 *     top (per the spec — batch / session invitations show here with
 *     Accept and Decline action buttons).
 *   - Card style matches StudentHome: `bg-surface` cards, slate &
 *     amber accents, verification green for verified tutors, no raw
 *     hex.
 *   - Status badges are inline (no missing `StatusBadge` import).
 *   - Subject chips are inline (no missing `SubjectChip` import).
 *   - Rate & Review and Message tutor are placeholders that show
 *     a "Coming soon" alert — Stage 1 spec is strict that any
 *     feature not explicitly listed must alert, not be built out.
 */

type Tab = EnrollmentStatus;

const TAB_LABELS: Record<Tab, string> = {
  active: "Active",
  pending: "Pending",
  past: "Past",
};

export function MyEnrollments() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");
  const [batchDecision, setBatchDecision] = useState<{
    id: string;
    state: "accepted" | "declined";
  } | null>(null);

  const list = ENROLLMENTS.filter((e) => e.status === tab);
  const counts: Record<Tab, number> = {
    active: ENROLLMENTS.filter((e) => e.status === "active").length,
    pending: ENROLLMENTS.filter((e) => e.status === "pending").length,
    past: ENROLLMENTS.filter((e) => e.status === "past").length,
  };

  function showComingSoon(feature: string) {
    Alert.alert(
      "Coming soon",
      `${feature} will be available in a future update.`,
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header — slate hero, same shape as StudentHome / MapSearch
          / AIChat. */}
      <View className="bg-night px-5 pb-5 shrink-0">
        <Text className="text-body text-white/70 mb-0.5 mt-2">
          Your learning
        </Text>
        <Text className="text-screen-title font-medium text-white">
          My Enrollments
        </Text>
        <Text className="text-caption text-white/70 mt-1">
          {ENROLLMENTS.length} total enrollments
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-surface border-b border-border-subtle shrink-0">
        {(["active", "pending", "past"] as Tab[]).map((t) => {
          const isActive = tab === t;
          const count = counts[t];
          return (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityLabel={TAB_LABELS[t]}
              accessibilityState={{ selected: isActive }}
              onPress={() => setTab(t)}
              className={
                isActive
                  ? "flex-1 h-12 flex-row items-center justify-center gap-1.5 border-b-2 border-amber active:opacity-70"
                  : "flex-1 h-12 flex-row items-center justify-center gap-1.5 border-b-2 border-transparent active:opacity-70"
              }
            >
              <Text
                className={
                  isActive
                    ? "text-button font-medium text-text-primary"
                    : "text-button font-medium text-text-muted"
                }
              >
                {TAB_LABELS[t]}
              </Text>
              {count > 0 && (
                <View
                  className={
                    isActive
                      ? "min-w-[20px] h-5 px-1.5 rounded-pill bg-amber items-center justify-center"
                      : "min-w-[20px] h-5 px-1.5 rounded-pill bg-sand items-center justify-center"
                  }
                >
                  <Text
                    className={
                      isActive
                        ? "text-micro text-text-inverse font-semibold"
                        : "text-micro text-text-muted font-semibold"
                    }
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 && tab !== "active" && (
          <EmptyState
            icon="mail-open-outline"
            title={`No ${TAB_LABELS[tab].toLowerCase()} enrollments`}
            subtitle="Nothing here yet."
            cta={null}
            onCta={null}
          />
        )}

        {list.length === 0 && tab === "active" && (
          <EmptyState
            icon="school-outline"
            title="No active enrollments"
            subtitle="Find a verified tutor to start your first session."
            cta="Find a tutor"
            onCta={() => router.replace("/map-search")}
          />
        )}

        {/* Batch invitation — pinned to top of the active tab only,
            and only when no decision has been made yet. */}
        {tab === "active" &&
          BATCH_INVITATIONS.map((inv) =>
            batchDecision?.id === inv.id ? (
              <BatchDecisionCard
                key={inv.id}
                invitation={inv}
                state={batchDecision.state}
              />
            ) : (
              <BatchInvitationCard
                key={inv.id}
                invitation={inv}
                onAccept={() => {
                  setBatchDecision({ id: inv.id, state: "accepted" });
                }}
                onDecline={() => {
                  setBatchDecision({ id: inv.id, state: "declined" });
                }}
              />
            ),
          )}

        <View className="gap-3 mt-3">
          {list.map((e) => (
            <EnrollmentCard
              key={e.id}
              enrollment={e}
              onRate={() => showComingSoon("Rating & reviews")}
              onMessage={() => showComingSoon("In-app messaging")}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNav role="student" current="/enrollment" />
    </SafeAreaView>
  );
}

/* ----------------------------- cards ----------------------------- */

function EnrollmentCard({
  enrollment,
  onRate,
  onMessage,
}: {
  enrollment: Enrollment;
  onRate: () => void;
  onMessage: () => void;
}) {
  const { tutor, subjects, startDate, endDate, schedule, plan, rate, status } =
    enrollment;

  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4">
      <View className="flex-row gap-3 items-start">
        {/* Initials avatar */}
        <View className="w-avatar-card h-avatar-card rounded-pill bg-amber-light items-center justify-center">
          <Text className="text-section-title font-medium text-amber">
            {initials(tutor.name)}
          </Text>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-2 mb-1">
            <View className="flex-1 min-w-0 flex-row items-center gap-1.5">
              <Text
                className="text-card-title font-medium text-text-primary"
                numberOfLines={1}
              >
                {tutor.name}
              </Text>
              {tutor.verified && (
                <Ionicons name="checkmark-circle" size={14} color="#047857" />
              )}
            </View>
            <StatusBadge status={status} />
          </View>

          {/* Subject chips */}
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {subjects.map((s) => (
              <SubjectChip key={s} label={s} />
            ))}
          </View>

          {/* Dates */}
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="calendar-outline" size={12} color="#64748B" />
            <Text className="text-caption text-text-muted">
              {startDate} → {endDate}
            </Text>
          </View>

          {/* Schedule */}
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={12} color="#64748B" />
            <Text className="text-caption text-text-muted" numberOfLines={1}>
              {schedule} · {plan}
            </Text>
          </View>

          {/* Rate */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border-subtle">
            <Text className="text-caption text-text-muted">Monthly rate</Text>
            <Text className="text-button font-semibold text-amber">
              Rs {rate.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {status === "active" && (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={onRate}
            className="flex-1 h-10 bg-amber-light rounded-md items-center justify-center active:opacity-80"
          >
            <Text className="text-button-sm font-medium text-amber-dark">
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
      )}

      {status === "past" && enrollment.outcomeNote && (
        <View className="mt-3 flex-row items-center gap-1.5 bg-success-bg rounded-md px-3 py-2">
          <Ionicons name="checkmark-circle" size={14} color="#047857" />
          <Text className="text-caption text-success-text font-medium">
            {enrollment.outcomeNote}
          </Text>
        </View>
      )}
    </View>
  );
}

function BatchInvitationCard({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: BatchInvitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const savings = invitation.currentRate - invitation.batchRate;
  const savingsPct = Math.round((savings / invitation.currentRate) * 100);
  return (
    <View className="bg-ai-light border border-ai-border rounded-card p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-9 h-9 rounded-pill bg-ai items-center justify-center">
          <Ionicons name="people" size={18} color="#FFFFFF" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-card-title font-medium text-ai-dark">
            Batch invitation
          </Text>
          <Text className="text-caption text-ai mt-0.5">
            From {invitation.tutor} · {invitation.subject}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 bg-warning-bg px-2 py-1 rounded-pill">
          <Ionicons name="time-outline" size={11} color="#B45309" />
          <Text className="text-micro text-warning-text font-medium">
            {invitation.expiresIn}
          </Text>
        </View>
      </View>

      <View className="bg-surface/70 rounded-md p-3 mb-3">
        <View className="flex-row items-end justify-between mb-2">
          <View>
            <Text className="text-micro text-text-muted uppercase tracking-wide">
              Your rate
            </Text>
            <Text className="text-body-sm text-text-muted line-through">
              Rs {invitation.currentRate.toLocaleString()}/mo
            </Text>
          </View>
          <View>
            <Text className="text-micro text-verification-dark uppercase tracking-wide">
              Batch rate
            </Text>
            <Text className="text-section-title font-medium text-verification-dark">
              Rs {invitation.batchRate.toLocaleString()}/mo
            </Text>
          </View>
          <View className="flex-row items-center gap-1 bg-verification px-2.5 py-1 rounded-pill">
            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
            <Text className="text-caption text-text-inverse font-medium">
              Save {savingsPct}%
            </Text>
          </View>
        </View>
        <Text className="text-caption text-text-secondary">
          {invitation.batchSize} students · {invitation.schedule}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept batch invitation"
          onPress={onAccept}
          className="flex-1 h-11 bg-ai rounded-md items-center justify-center active:opacity-80"
        >
          <Text className="text-button font-medium text-text-inverse">
            Accept invitation
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decline batch invitation"
          onPress={onDecline}
          className="flex-1 h-11 bg-surface border border-border rounded-md items-center justify-center active:opacity-80"
        >
          <Text className="text-button font-medium text-text-secondary">
            Decline
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function BatchDecisionCard({
  invitation,
  state,
}: {
  invitation: BatchInvitation;
  state: "accepted" | "declined";
}) {
  const isAccepted = state === "accepted";
  return (
    <View
      className={
        isAccepted
          ? "bg-success-bg border border-verification rounded-card p-4 flex-row items-center gap-3"
          : "bg-sand border border-border rounded-card p-4 flex-row items-center gap-3"
      }
    >
      <View
        className={
          isAccepted
            ? "w-10 h-10 rounded-pill bg-verification items-center justify-center"
            : "w-10 h-10 rounded-pill bg-border-strong items-center justify-center"
        }
      >
        <Ionicons
          name={isAccepted ? "checkmark" : "close"}
          size={20}
          color="#FFFFFF"
        />
      </View>
      <View className="flex-1">
        <Text
          className={
            isAccepted
              ? "text-card-title font-medium text-success-text"
              : "text-card-title font-medium text-text-secondary"
          }
        >
          {isAccepted ? "Invitation accepted" : "Invitation declined"}
        </Text>
        <Text className="text-caption text-text-secondary">
          {invitation.tutor} · {invitation.subject}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  cta,
  onCta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  cta: string | null;
  onCta: (() => void) | null;
}) {
  return (
    <View className="items-center justify-center pt-16 px-6">
      <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
        <Ionicons name={icon} size={26} color="#B45309" />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center">
        {title}
      </Text>
      <Text className="text-body text-text-secondary text-center mt-1.5">
        {subtitle}
      </Text>
      {cta && onCta && (
        <Pressable
          onPress={onCta}
          className="mt-5 min-h-btn px-6 rounded-card bg-amber items-center justify-center active:opacity-80"
        >
          <Text className="text-button text-text-inverse font-semibold">
            {cta}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* --------------------------- inline bits --------------------------- */

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const map: Record<
    EnrollmentStatus,
    { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
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
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-pill ${m.bg}`}>
      <Ionicons name={m.icon} size={11} color={m.fg === "text-text-secondary" ? "#475569" : m.fg === "text-warning-text" ? "#92400E" : "#064E3B"} />
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