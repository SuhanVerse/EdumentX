import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AdminNav } from "@/components/shared/AdminNav";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Admin Home Dashboard
 *
 * Landing page for admin users. Shows quick access to the three
 * main admin sections: Platform Statistics, Verification Queue,
 * and User Management. Each card surfaces a live count badge so
 * the admin can see the work backlog at a glance.
 *
 * The hero greets the admin by name — we read
 * `users/{uid}/adminProfile/default.fullName` via `onSnapshot`
 * (same pattern as `StudentHome`) so it re-renders the moment
 * the admin saves their profile. The right-hand side of the
 * hero used to host a "My profile" pill, but Profile is now a
 * bottom-nav tab (see `AdminNav.tsx`), so the slot stays empty.
 */
export function AdminHome() {
  const router = useRouter();
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

  // Live user counts fetched from Firestore on mount. Includes
  // all users (students, tutors, and admins). Falls back to 0
  // while loading or on error.
  const [totalUsers, setTotalUsers] = useState(0);
  const [suspendedUsers, setSuspendedUsers] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCounts() {
      try {
        const db = getFirestore(getApp());
        const usersRef = collection(db, "users");
        // One-shot read of all user docs — no composite index needed.
        const snap = await getDocs(usersRef);
        if (cancelled) return;

        let total = 0;
        let suspended = 0;
        snap.forEach((d) => {
          const data = d.data() as { status?: string } | undefined;
          total++;
          if (data?.status === "suspended") suspended++;
        });
        setTotalUsers(total);
        setSuspendedUsers(suspended);
      } catch (err) {
        console.warn("AdminHome: failed to fetch user counts", err);
        if (!cancelled) {
          setTotalUsers(0);
          setSuspendedUsers(0);
        }
      }
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  const sections = [
    {
      title: "Platform Statistics",
      subtitle: "App-wide metrics & trends",
      icon: "analytics" as keyof typeof Ionicons.glyphMap,
      color: "text-ai",
      bgClass: "bg-ai-light",
      route: "/platform-statistics",
      // No count badge — Statistics doesn't have a backlog; live
      // numbers appear on the next screen.
      count: null as number | null,
      countLabel: "",
      countBg: "",
      countFg: "",
    },
    {
      title: "Verification Queue",
      subtitle: "Review pending tutor verifications",
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      color: "text-verification",
      bgClass: "bg-verification-light",
      route: "/verification-queue",
      // The queue screen owns its live counts; the home card keeps
      // the tap-through clean without a backlog badge.
      count: null as number | null,
      countLabel: "",
      countBg: "",
      countFg: "",
    },
    {
      title: "User Management",
      subtitle: "View & manage all registered users",
      icon: "people" as keyof typeof Ionicons.glyphMap,
      color: "text-accent",
      bgClass: "bg-accent-light",
      route: "/user-management",
      // Show the active + suspended counts so the admin sees
      // actionable user state at a glance. We deliberately don't
      // show "X deleted" — deleted users are audit-only.
      count: totalUsers - suspendedUsers,
      countLabel: suspendedUsers > 0
        ? `${totalUsers - suspendedUsers} active · ${suspendedUsers} suspended`
        : `${totalUsers} users`,
      countBg: "bg-accent",
      countFg: "text-text-inverse",
    },
  ];

  return (
    <ScreenLayout variant="background">

      {/* Hero header — mirrors StudentHome.tsx's "Good morning, {name}"
          pattern. The right-hand slot is intentionally empty; profile
          is reachable from the bottom nav. */}
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
              Manage platform, verifications & users
            </Text>
          </View>
          <NotificationBell tone="dark" />
        </View>
      </ScreenHeader>

      <ScreenScroll>
        {sections.map((section) => (
          <Pressable
            key={section.route}
            onPress={() => router.push(section.route as any)}
            className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-4 mb-4 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={
              section.count
                ? `${section.title}, ${section.countLabel}`
                : section.title
            }
          >
            <View className={`w-12 h-12 rounded-pill items-center justify-center ${section.bgClass}`}>
              <Ionicons name={section.icon} size={24} className={section.color} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="text-card-title font-medium text-text-primary">
                  {section.title}
                </Text>
                {section.count !== null ? (
                  <View className={`px-2 py-0.5 rounded-pill ${section.countBg}`}>
                    <Text
                      className={`text-micro font-semibold ${section.countFg}`}
                      numberOfLines={1}
                    >
                      {section.count}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-caption text-text-muted mt-0.5">
                {section.subtitle}
              </Text>
              {section.count !== null ? (
                <Text className="text-micro text-text-muted mt-1" numberOfLines={1}>
                  {section.countLabel}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-text-muted" />
          </Pressable>
        ))}
      </ScreenScroll>

      <AdminNav />
    </ScreenLayout>
  );
}

/**
 * Resolve the display name shown in the dashboard greeting.
 *   1. `profile.fullName` from the adminProfile subcollection.
 *   2. `user.displayName` from Firebase Auth (set by Google Sign-In).
 *   3. The local part of the email address (e.g. "asimdkt63" from
 *      "asimdkt63@gmail.com").
 *   4. The literal string "Admin" as a last resort.
 *
 * This is the same priority chain used by `StudentHome.tsx` and
 * `PlatformStatistics.tsx` — keeping the resolution rules in sync
 * means an admin sees the same name in every header across the
 * app.
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