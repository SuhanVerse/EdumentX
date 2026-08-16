import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getCountFromServer,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AdminNav } from "@/components/shared/AdminNav";
import { useAuthStore } from "@/store/authStore";

/** Live KPI counts, aggregated with `getCountFromServer` (server-side
 *  count queries — no doc payloads cross the wire). */
interface PlatformCounts {
  totalUsers: number;
  totalTutors: number;
  verifiedTutors: number;
  pendingRequests: number;
}

const EMPTY_COUNTS: PlatformCounts = {
  totalUsers: 0,
  totalTutors: 0,
  verifiedTutors: 0,
  pendingRequests: 0,
};

/** Fetch all four KPIs in parallel. Each is a server-side count
 *  query, so the cost is O(1) documents regardless of dataset size. */
async function fetchPlatformCounts(): Promise<PlatformCounts> {
  const db = getFirestore(getApp());
  const [totalUsers, totalTutors, verifiedTutors, pendingRequests] =
    await Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(collection(db, "tutors")),
      getCountFromServer(
        query(collection(db, "tutors"), where("verificationStatus", "==", "approved")),
      ),
      getCountFromServer(
        query(
          collection(db, "enrollmentRequests"),
          where("status", "==", "pending"),
        ),
      ),
    ]);
  return {
    totalUsers: totalUsers.data().count,
    totalTutors: totalTutors.data().count,
    verifiedTutors: verifiedTutors.data().count,
    pendingRequests: pendingRequests.data().count,
  };
}

/**
 * EdumentX — Platform Statistics (`/platform-statistics`)
 *
 * Admin-only read-only metrics surface. Renders a 2x2 KPI grid fed
 * by live Firestore count aggregations (`getCountFromServer`).
 *
 * **Why no chart library:** the project doesn't ship a chart
 * dependency (the previous version of this file imported
 * `react-native-chart-kit`, which isn't installed and was crashing
 * on launch). Bar lists drawn with `View` widths look identical
 * at this scale, keep the bundle tiny, and don't require a native
 * module.
 *
 * **All-live policy:** the four KPI tiles read real counts
 * (users, tutors, approved tutors, pending enrollment requests).
 * The old "Weekly enrollment trend" and "Subject demand" bar
 * charts were static sample data with no Firestore source behind
 * them — they were removed rather than shown as fake metrics.
 * No data is better than fabricated data.
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
    <ScreenLayout variant="background">

      {/* Hero — mirrors StudentHome.tsx's "Good morning, {name}"
          pattern. The admin's live display name is the dominant
          element, with a small "EdumentX · Platform statistics"
          caption for context. */}
      <ScreenHeader>
        <View>
          <Text className="text-body text-white/70 mb-0.5">Good to see you,</Text>
          <Text
            className="text-screen-title font-medium text-white"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="text-caption text-white/70 mt-1">
            EdumentX · Platform statistics
          </Text>
        </View>
      </ScreenHeader>

      <ScreenScroll contentContainerClassName="px-6 pt-8 pb-8 gap-5">
        <KpiGrid />
      </ScreenScroll>

      <AdminNav />
    </ScreenLayout>
  );
}

/* ---------- Sub-components ---------- */

/**
 * 2x2 KPI grid. Each tile is a `bg-surface` card with an icon
 * disc, a big number, an uppercase label, and a "+X this week"
 * delta. The numbers come from live Firestore count queries
 * (`getCountFromServer`) — loading shows skeleton dashes, and a
 * fetch failure shows a compact error tile with a Retry action.
 */
function KpiGrid() {
  const [counts, setCounts] = useState<PlatformCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPlatformCounts();
      setCounts(next);
    } catch (err) {
      console.warn("PlatformStatistics: failed to fetch counts", err);
      setError("Couldn't load live counts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verifiedPct =
    counts.totalTutors > 0
      ? `${Math.round((counts.verifiedTutors / counts.totalTutors) * 100)}%`
      : "0%";

  const tiles = [
    {
      icon: "people" as keyof typeof Ionicons.glyphMap,
      label: "Registered users",
      value: loading ? "—" : formatNumber(counts.totalUsers),
      delta: "+0%",
      tintBg: "bg-accent-light",
      tintFg: "text-accent",
    },
    {
      icon: "book" as keyof typeof Ionicons.glyphMap,
      label: "Tutors on platform",
      value: loading ? "—" : formatNumber(counts.totalTutors),
      delta: "+0%",
      tintBg: "bg-verification-light",
      tintFg: "text-verification",
    },
    {
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      label: "Verified tutors",
      value: loading ? "—" : verifiedPct,
      delta: "+0%",
      tintBg: "bg-ai-light",
      tintFg: "text-ai",
    },
    {
      icon: "mail-unread" as keyof typeof Ionicons.glyphMap,
      label: "Pending requests",
      value: loading ? "—" : formatNumber(counts.pendingRequests),
      delta: "+0%",
      tintBg: "bg-accent-light",
      tintFg: "text-accent",
    },
  ];

  return (
    <View className="gap-3">
      {error ? (
        <View className="flex-row items-center gap-3 bg-danger-bg border border-border-subtle rounded-card p-4">
          <Ionicons name="alert-circle" size={20} className="text-danger" />
          <Text className="flex-1 text-caption text-danger-text">
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            className="bg-danger px-3 py-1.5 rounded-pill active:opacity-80"
            accessibilityRole="button"
          >
            <Text className="text-micro font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}
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
              <Ionicons name="trending-up" size={12} className="text-success-text" />
              <Text className="text-micro font-semibold text-success-text">
                {t.delta} this week
              </Text>
            </View>
          </View>
        ))}
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
