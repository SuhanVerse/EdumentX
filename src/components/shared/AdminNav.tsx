import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { ActivePill, AnimatedPressable, usePressScale } from "@/components/motion";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * EdumentX — Admin Bottom Navigation
 *
 * Persistent 5-tab nav for admin screens, mirroring the student's
 * `BottomNav` pattern (Home · Map · AI · Enrollments · Profile →
 * Home · Statistics · Verification · Users · Profile).
 *
 * Tab order is intentional:
 *   1. **Home** is leftmost — the entry point the admin lands on
 *      after sign-in and the surface they return to when they're
 *      done with a task.
 *   2. The three work surfaces (Statistics, Verification, Users)
 *      sit in the middle. These are the "do work" tabs.
 *   3. **Profile** is rightmost — account/identity lives at the
 *      far end so it's discoverable but not in the way.
 *
 * **Why a separate component from the student `BottomNav`:** the
 * student nav accepts a `role` prop and switches between tab sets
 * (`STUDENT_TABS` vs `TUTOR_TABS`). The admin nav has its own
 * fixed 5-tab set and its own setup-state carve-out
 * (see "First-time setup hide" below), so reusing the student
 * component with another `role` value would force a third branch
 * into the same file. Cleaner to keep them separate.
 *
 * **First-time setup hide.** When the admin's `adminProfile` doc
 * is empty (i.e. they're on `/admin-profile` for first-time
 * setup), the nav returns `null` — we don't want a brand-new
 * admin to see a tab row that lets them escape the setup form
 * and land on an empty dashboard. Once they save the profile
 * (`hasAdminProfile` flips to `true` in the auth store), the
 * nav reappears.
 */
export type AdminTab = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: `/${string}`;
};

const ADMIN_TABS: AdminTab[] = [
  { icon: "home", label: "Home", route: "/admin-home" },
  { icon: "analytics", label: "Statistics", route: "/platform-statistics" },
  { icon: "shield-checkmark", label: "Verification", route: "/verification-queue" },
  { icon: "people", label: "Users", route: "/user-management" },
  { icon: "person", label: "Profile", route: "/admin-profile" },
];

function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: AdminTab;
  active: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-1 items-center justify-center"
    >
      <View className="w-12 h-7 items-center justify-center">
        <Ionicons
          name={active ? tab.icon : (`${tab.icon}-outline` as any)}
          size={20}
          color={active ? colors.brand.accent : colors.text.muted}
        />
      </View>
      <Text
        className={
          active
            ? "text-micro mt-0.5 font-semibold text-accent"
            : "text-micro mt-0.5 text-text-muted"
        }
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </AnimatedPressable>
  );
}

function TabRow({
  tabs,
  activeIndex,
  onPress,
}: {
  tabs: AdminTab[];
  activeIndex: number;
  onPress: (tab: AdminTab) => void;
}) {
  const [width, setWidth] = React.useState(0);
  return (
    <View
      className="flex-row relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ActivePill
          count={tabs.length}
          activeIndex={activeIndex}
          itemWidth={width / tabs.length}
          pillClassName="absolute top-1.5 w-1/5 h-7 rounded-pill bg-accent/10"
          style={{ width: width / tabs.length, height: 28, top: 6 }}
        />
      ) : null}
      {tabs.map((tab, i) => (
        <TabButton
          key={tab.route}
          tab={tab}
          active={i === activeIndex}
          onPress={() => onPress(tab)}
        />
      ))}
    </View>
  );
}

export function AdminNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const role = useAuthStore((state) => state.role);
  const hasAdminProfile = useAuthStore((state) => state.hasAdminProfile);

  // First-time setup hide — see the file docstring for the
  // rationale. We deliberately render *nothing* (not an empty
  // `<View>`) so the underlying screen's bottom safe-area inset
  // doesn't reserve space for a hidden tab row.
  if (role === "admin" && !hasAdminProfile) {
    return null;
  }

  /**
   * Tap handler — mirrors the student `BottomNav` exactly.
   *
   * `router.replace` (not `router.navigate`) is mandatory here.
   * `navigate` resolves the href relative to the current stack
   * position, and because every admin tab is at the route-tree
   * root, expo-router would match the existing entry by tail
   * segment and stay put — every tab would "go to" whichever
   * admin screen is already in the stack. `replace` walks the
   * route tree by absolute URL and replaces the current screen,
   * no pop dance, no stack-position matching. The same pattern is
   * used by the auth guard in `app/_layout.tsx`.
   */
  function goTo(route: `/${string}`) {
    if (pathname === route) return;
    router.replace(route as any);
  }

  const activeIndex = ADMIN_TABS.findIndex((t) => t.route === pathname);
  return (
    <View
      className="bg-surface border-t border-border"
      style={{ paddingBottom: 12 + insets.bottom, paddingTop: 8 }}
    >
      <TabRow
        tabs={ADMIN_TABS}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onPress={(tab) => goTo(tab.route)}
      />
    </View>
  );
}
