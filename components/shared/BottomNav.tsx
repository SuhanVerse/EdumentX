import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { ActivePill } from "@/components/motion";

/**
 * EdumentX — Persistent bottom navigation bar
 *
 * Stage 6 (June 27, 2026):
 *   - Renders a 5-tab nav used by every authenticated student screen
 *     (Home → Map → AI → Enrollments → Profile).
 *   - Active tab is visually distinct: chalkboard-green pill behind the
 *     icon and green-tinted label. Amber is reserved for ratings and
 *     highlights; the nav uses the primary green active state instead.
 *   - Tapping a tab calls `router.replace(route)` — `replace` (not
 *     `navigate`) so the back stack doesn't grow with every tab switch
 *     and users can't accidentally "back" into a screen they left.
 *   - The `current` prop is optional: when omitted we fall back to
 *     `usePathname()` so the active state is correct without
 *     screens having to pass anything in.
 *   - Tutor screens reuse the same component by passing `role="tutor"`
 *     and overriding the tab set in a future iteration. For now we
 *     only ship the student nav; tutor dashboards continue to use
 *     their existing in-file sign-out until Phase 4.5.
 */

export type BottomNavRole = "student";

export type BottomNavTab = {
  /** Ionicons name (no `-outline` suffix — we add it ourselves). */
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: `/${string}`;
};

const STUDENT_TABS: BottomNavTab[] = [
  { icon: "home", label: "Home", route: "/student-home" },
  { icon: "map", label: "Map", route: "/map-search" },
  { icon: "sparkles", label: "AI", route: "/AI-chat" },
  { icon: "book", label: "Enrollments", route: "/enrollment" },
  { icon: "person", label: "Profile", route: "/stu-profile" },
];

/**
 * Single tab button. The active-pill background is no longer rendered
 * here — the parent row mounts a single sliding `ActivePill` behind
 * the tabs, so the visual weight of "active" comes from the pill
 * slide + the label color swap, not a per-tab class flip.
 */
function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: BottomNavTab;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-70"
    >
      <View className="w-12 h-6 items-center justify-center">
        <Ionicons
          name={active ? tab.icon : (`${tab.icon}-outline` as any)}
          size={20}
          color={active ? "#2F5D50" : "#6B7268"}
        />
      </View>
      <Text
        className={
          active
            ? "text-micro mt-0.5 font-semibold text-primary tracking-wide"
            : "text-micro mt-0.5 text-text-muted"
        }
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

/**
 * Renders the 5-tab row + the sliding `ActivePill` behind it. The
 * pill width is set to exactly one-fifth of the row's measured
 * width — measured via `onLayout` so the row can be rendered at
 * `flex-1` (filling the bottom nav) without us needing a hard-coded
 * `SCREEN_WIDTH / 5` constant that breaks on tablets.
 */
function TabRow({
  tabs,
  activeIndex,
  onPress,
}: {
  tabs: BottomNavTab[];
  activeIndex: number;
  onPress: (tab: BottomNavTab) => void;
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
          pillClassName="absolute top-1.5 w-1/5 h-7 rounded-pill bg-primary-light"
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

export function BottomNav({
  role = "student",
  current,
}: {
  role?: BottomNavRole;
  /**
   * Optional override for the active route. When omitted, the active
   * state is derived from `usePathname()`. Pass this in when the
   * pathname doesn't match a tab route (e.g. inside the FiltersSheet
   * Modal where the underlying route is still `/map-search`).
   */
  current?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = role === "student" ? STUDENT_TABS : STUDENT_TABS;
  const activeRoute = current ?? pathname;
  const activeIndex = tabs.findIndex((t) => t.route === activeRoute);

  /**
   * Tap handler for a tab button.
   *
   * We deliberately do **not** call `router.navigate(tab.route)`.
   * `navigate` resolves the href relative to the current stack
   * position (see expo-router's `resolveHref` util). When the user is
   * already at `/student-home` and the stack contains
   * `[..., /map-search, /student-home]` (because the auth guard
   * replaced them in), `navigate('/AI-chat')` resolves against the
   * current URL — but because every tab is at the root, expo-router
   * matches the existing `/student-home` entry by its tail segment
   * and stays put. The user sees "every tab routes to Student Home"
   * because the auth guard keeps re-installing `/student-home` at the
   * bottom of the stack.
   *
   * The fix: `router.replace(tab.route)` walks the route tree by
   * absolute URL rather than resolving against the current stack
   * position, and replaces the current screen with the target — no
   * pop dance, no stack-position matching. This is the same pattern
   * the auth guard uses in `app/_layout.tsx`.
   *
   * Source: https://docs.expo.dev/router/navigating-pages/ — "Use
   * `router.replace` for paths starting with `/`".
   */
  function goTo(route: `/${string}`) {
    if (activeRoute === route) return;
    router.replace(route as any);
  }

  return (
    <View
      className="bg-surface border-t border-border"
      style={{ paddingBottom: 16, paddingTop: 6 }}
    >
      <TabRow
        tabs={tabs}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onPress={(tab) => goTo(tab.route)}
      />
    </View>
  );
}
