import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  collectionGroup,
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
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Admin Home Dashboard
 *
 * Single landing page for admin users: a live greeting plus the
 * platform KPI grid (users, tutors, verified tutors, pending
 * requests). Statistics live here so the bottom nav stays lean —
 * the three work surfaces in the nav are Verification and Users
 * (Profile is the account tab).
 *
 * The hero greets the admin by name — we read
 * `users/{uid}/adminProfile/default.fullName` via `onSnapshot`
 * (same pattern as `StudentHome`) so it re-renders the moment
 * the admin saves their profile.
 */

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
      // Requests live at `enrollmentRequests/{tutorUid}/requests/*`
      // (a nested per-tutor subcollection), NOT as top-level docs —
      // the top-level `enrollmentRequests/{tutorUid}` docs are just
      // `_namespaceAnchor` markers. Aggregating the real rows needs a
      // collectionGroup across every tutor's `requests` subcollection.
      // The rules allow any signed-in user to list them (matching the
      // `match /enrollmentRequests/{tutorUid}/requests/{requestId}`
      // read rule), and the single-field collectionGroup index is
      // already deployed (see firebase/firestore.indexes.json).
      getCountFromServer(
        query(
          collectionGroup(db, "requests"),
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

export function AdminHome() {
  const user = useAuthStore((state) => state.user);

  // Live display name. Resolved in the same priority order as
  // `StudentHome`: profile.fullName → user.displayName → email
  // localpart → "Admin". The `onSnapshot` re-reads on every
  // profile save, so editing the name on `/admin-profile` and
  // returning here shows the new name without a hard reload.
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

      {/* Hero header — mirrors StudentHome.tsx's "Good morning, {name}"
          pattern. The right-hand slot hosts the notification bell;
          Profile is reachable from the bottom nav. */}
      <ScreenHeader>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-body text-white/70 mb-0.5">Dashboard</Text>
            <Text
              className="text-screen-title font-medium text-white"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text className="text-caption text-white/70 mt-1">
              Platform overview · verifications & users
            </Text>
          </View>
          <NotificationBell tone="dark" />
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
 * disc, a big number, an uppercase label, and a delta caption.
 * The numbers come from live Firestore count queries
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
      console.warn("AdminHome: failed to fetch counts", err);
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
      delta: "Live",
      tintBg: "bg-accent-light",
      tintFg: "text-accent",
    },
    {
      icon: "book" as keyof typeof Ionicons.glyphMap,
      label: "Tutors on platform",
      value: loading ? "—" : formatNumber(counts.totalTutors),
      delta: "Live",
      tintBg: "bg-verification-light",
      tintFg: "text-verification",
    },
    {
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      label: "Verified tutors",
      value: loading ? "—" : verifiedPct,
      delta: "Live",
      tintBg: "bg-ai-light",
      tintFg: "text-ai",
    },
    {
      icon: "mail-unread" as keyof typeof Ionicons.glyphMap,
      label: "Pending requests",
      value: loading ? "—" : formatNumber(counts.pendingRequests),
      delta: "Live",
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
              <Ionicons name="pulse" size={12} className="text-success-text" />
              <Text className="text-micro font-semibold text-success-text">
                {t.delta}
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
 * Resolve the display name shown in the dashboard greeting.
 *   1. `profile.fullName` from the adminProfile subcollection.
 *   2. `user.displayName` from Firebase Auth (set by Google Sign-In).
 *   3. The local part of the email address (e.g. "asimdkt63" from
 *      "asimdkt63@gmail.com").
 *   4. The literal string "Admin" as a last resort.
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
  return n.toLocaleString("en-US");
}
