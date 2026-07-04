import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { AdminNav } from "@/components/shared/AdminNav";
import { useAuthStore } from "@/store/authStore";
import { MOCK_ADMIN_STATS } from "@/data/adminStats";

/**
 * EdumentX — Platform Statistics (`/platform-statistics`)
 *
 * Admin-only read-only metrics surface. Renders a 2x2 KPI grid, a
 * weekly enrollment bar list, and a subject-demand bar list.
 *
 * **Why no chart library:** the project doesn't ship a chart
 * dependency (the previous version of this file imported
 * `react-native-chart-kit`, which isn't installed and was crashing
 * on launch). Bar lists drawn with `View` widths look identical
 * at this scale, keep the bundle tiny, and don't require a native
 * module. If the project ever needs a real chart lib, swap the
 * `<BarList>` instances for a chart — the rest of the screen is
 * already shaped for it.
 *
 * **Why the greeting is live:** admins want to land on a screen
 * that feels personal. We read `adminProfile.fullName` via
 * `onSnapshot` (same pattern as `StudentHome`) so the hero
 * re-renders the moment the admin saves their profile from
 * `/admin-profile`.
 */
export function PlatformStatistics() {
  const user = useAuthStore((state) => state.user);
  // `displayName` resolves to: adminProfile.fullName → user.displayName
  // → email localpart → "Admin". We re-read the profile doc on
  // snapshot so the hero stays in sync if the admin edits their
  // profile while this screen is mounted.
  const [displayName, setDisplayName] = useState<string>(() =>
    resolveDisplayName(null, user?.displayName ?? null, user?.email ?? null),
  );

  useEffect(() => {
    if (!user) {
      setDisplayName("Admin");
      return;
    }
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "adminProfile", "default");
    const unsub = onSnapshot(profileRef, (snap) => {
      const data = snap.data() as { fullName?: string | null } | undefined;
      setDisplayName(
        resolveDisplayName(
          data?.fullName ?? null,
          user.displayName ?? null,
          user.email ?? null,
        ),
      );
    });
    return unsub;
  }, [user]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="light" />

      {/* Hero — mirrors StudentHome.tsx's "Good morning, {name}"
          pattern. The admin's live display name is the dominant
          element, with a small "EdumentX · July 2026" caption for
          context. */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <View className="mt-2">
          <Text className="text-body text-white/70 mb-0.5">Good to see you,</Text>
          <Text
            className="text-screen-title font-medium text-white"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="text-caption text-white/70 mt-1">
            EdumentX · July 2026 · Platform statistics
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <KpiGrid />
        <WeeklyEnrollmentCard />
        <SubjectDemandCard />
      </ScrollView>

      <AdminNav />
    </SafeAreaView>
  );
}

/* ---------- Sub-components ---------- */

/**
 * 2x2 KPI grid. Each tile is a `bg-surface` card with an icon
 * disc, a big number, an uppercase label, and a "+X this week"
 * delta. The data is sourced from `MOCK_ADMIN_STATS` (Phase 5
 * will replace this with a Firestore aggregation).
 */
function KpiGrid() {
  const tiles = [
    {
      icon: "people" as keyof typeof Ionicons.glyphMap,
      label: "Registered users",
      value: formatNumber(MOCK_ADMIN_STATS.totalUsers * 200 + 48),
      delta: "+14%",
      tintBg: "bg-amber-light",
      tintFg: "text-amber",
    },
    {
      icon: "book" as keyof typeof Ionicons.glyphMap,
      label: "Active enrollments",
      value: formatNumber(MOCK_ADMIN_STATS.totalUsers * 60 + 87),
      delta: "+8%",
      tintBg: "bg-verification-light",
      tintFg: "text-verification",
    },
    {
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      label: "Verified tutors",
      value: "68%",
      delta: "+5%",
      tintBg: "bg-ai-light",
      tintFg: "text-ai",
    },
    {
      icon: "star" as keyof typeof Ionicons.glyphMap,
      label: "Platform rating",
      value: "4.7",
      delta: "+0.1",
      tintBg: "bg-amber-light",
      tintFg: "text-amber",
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-3">
      {tiles.map((t) => (
        <View
          key={t.label}
          className="flex-1 min-w-[45%] bg-surface border border-border-subtle rounded-card p-4"
        >
          <View
            className={`w-10 h-10 rounded-pill items-center justify-center mb-3 ${t.tintBg}`}
          >
            <Ionicons name={t.icon} size={20} className={t.tintFg} />
          </View>
          <Text className="text-screen-title font-medium text-text-primary">
            {t.value}
          </Text>
          <Text
            className="text-overline text-text-muted uppercase mt-0.5"
            numberOfLines={1}
          >
            {t.label}
          </Text>
          <View className="flex-row items-center gap-1 mt-2">
            <Ionicons name="trending-up" size={12} color="#16A34A" />
            <Text className="text-micro font-semibold text-success-text">
              {t.delta} this week
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Weekly enrollment trend — rendered as a horizontal-bar list
 * inside a `bg-surface` card. No chart lib required: each row is
 * a flex row of (day, bar track, value). The bar fill width is
 * `(value / max) * 100%`.
 */
function WeeklyEnrollmentCard() {
  const data = [
    { day: "Mon", value: 12 },
    { day: "Tue", value: 18 },
    { day: "Wed", value: 9 },
    { day: "Thu", value: 24 },
    { day: "Fri", value: 31 },
    { day: "Sat", value: 38 },
    { day: "Sun", value: 22 },
  ];
  const max = Math.max(...data.map((d) => d.value));

  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-section-title font-medium text-text-primary">
          Weekly enrollment trend
        </Text>
        <View className="bg-amber-light px-2 py-0.5 rounded-pill">
          <Text className="text-micro font-semibold text-amber">+22%</Text>
        </View>
      </View>
      <View className="gap-2.5">
        {data.map((row) => {
          const pct = Math.round((row.value / max) * 100);
          return (
            <View key={row.day} className="flex-row items-center gap-3">
              <Text className="text-caption text-text-secondary w-8">
                {row.day}
              </Text>
              <View className="flex-1 h-2.5 bg-sand rounded-pill overflow-hidden">
                <View
                  className="h-full bg-amber rounded-pill"
                  style={{ width: `${pct}%` }}
                />
              </View>
              <Text className="text-caption font-medium text-text-primary w-7 text-right">
                {row.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Subject demand — same bar-list pattern, with the subject name
 * on the left of the bar instead of a weekday. Sorted by demand
 * (descending) so the most-requested subject is always at the top.
 */
function SubjectDemandCard() {
  const data = [
    { subject: "Math", value: 142 },
    { subject: "Science", value: 98 },
    { subject: "English", value: 76 },
    { subject: "Physics", value: 65 },
    { subject: "Chemistry", value: 54 },
    { subject: "Computer Science", value: 41 },
  ];
  const max = Math.max(...data.map((d) => d.value));

  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4">
      <Text className="text-section-title font-medium text-text-primary mb-3">
        Subject demand
      </Text>
      <View className="gap-2.5">
        {data.map((row) => {
          const pct = Math.round((row.value / max) * 100);
          return (
            <View key={row.subject} className="flex-row items-center gap-3">
              <Text
                className="text-caption text-text-secondary w-24"
                numberOfLines={1}
              >
                {row.subject}
              </Text>
              <View className="flex-1 h-2.5 bg-sand rounded-pill overflow-hidden">
                <View
                  className="h-full bg-amber rounded-pill"
                  style={{ width: `${pct}%` }}
                />
              </View>
              <Text className="text-caption font-medium text-text-primary w-9 text-right">
                {row.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Helpers ---------- */

/**
 * Same display-name resolution used in `StudentHome.tsx` and
 * `AdminHome.tsx`. We use the *most-personal* source first
 * (the adminProfile doc) and fall back to progressively less
 * personal sources.
 */
function resolveDisplayName(
  profileFullName: string | null,
  authDisplayName: string | null,
  email: string | null,
): string {
  if (profileFullName && profileFullName.trim().length > 0) {
    return profileFullName.trim();
  }
  if (authDisplayName && authDisplayName.trim().length > 0) {
    return authDisplayName.trim();
  }
  if (email && email.includes("@")) {
    return email.split("@")[0];
  }
  return "Admin";
}

function formatNumber(n: number): string {
  // 1248 → "1,248". Localized grouping is unnecessary for the
  // current audience; a plain comma separator is fine.
  return n.toLocaleString("en-US");
}
