import { getApp } from "@react-native-firebase/app";
import {
  doc,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AdminNav } from "@/components/shared/AdminNav";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Admin Home Dashboard
 *
 * Clean landing page for admin users. The three work surfaces
 * (Platform Statistics, Verification Queue, User Management) already
 * live in the bottom nav (`AdminNav.tsx`), so this screen deliberately
 * stays a high-level greeting instead of duplicating navigation
 * links.
 *
 * The hero greets the admin by name — we read
 * `users/{uid}/adminProfile/default.fullName` via `onSnapshot`
 * (same pattern as `StudentHome`) so it re-renders the moment
 * the admin saves their profile.
 */
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
              Manage platform, verifications & users
            </Text>
          </View>
          <NotificationBell tone="dark" />
        </View>
      </ScreenHeader>

      <ScreenScroll>
        <View className="bg-surface border border-border rounded-card p-5">
          <Text className="text-section-title font-medium text-text-primary">
            Admin console
          </Text>
          <Text className="text-body text-text-secondary mt-2 leading-relaxed">
            Use the tabs below to review verification requests, monitor
            platform statistics, and manage users.
          </Text>
        </View>
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
