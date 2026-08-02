import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";

/**
 * EdumentX — Student bottom navigation
 *
 * Renders the 5-tab nav used by every authenticated student screen
 * (Home → Map → AI → Enrollments → Profile).
 *
 * Active-tab indicator — a compact pill that hugs only the icon:
 *   - The pill is a fixed 48×28 bubble (same footprint as the icon
 *     box) positioned `absolute` inside the measured tab row.
 *   - Its left offset is computed on the JS side
 *     (`tabWidth * index + (tabWidth − pillWidth) / 2`) and written
 *     to a shared value inside `useEffect`, then the worklet only
 *     reads the shared value. This is the same bulletproof pattern
 *     the tutor bar's underline uses — the centering math never
 *     depends on a stale worklet closure, so the pill stays dead
 *     center under the active icon at any screen width.
 *   - The pill is a background decoration (`pointerEvents="none"`,
 *     rendered before the tabs) — it never affects tab layout.
 *
 * Labels are single-line with capped font scaling so "Enrollments"
 * can never wrap, overflow its tab, or collide with a neighbor on
 * narrow screens or with large accessibility font settings.
 *
 * Tapping a tab calls `router.replace(route)` — `replace` (not
 * `navigate`) so the back stack doesn't grow with every tab switch
 * and users can't accidentally "back" into a screen they left.
 *
 * The `current` prop is optional: when omitted we fall back to
 * `usePathname()` so the active state is correct without screens
 * having to pass anything in.
 */

export type BottomNavRole = "student";

export type BottomNavTab = {
  /** Ionicons name (no `-outline` suffix — we add it ourselves). */
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: `/${string}`;
};

/** Active pill size — matches the icon box (`w-12 h-7`) exactly. */
const PILL_SIZE = 48;
const PILL_HEIGHT = 28;

const ACTIVE_COLOR = colors.brand.primary;
const INACTIVE_COLOR = colors.text.muted;

const STUDENT_TABS: BottomNavTab[] = [
  { icon: "home", label: "Home", route: "/student-home" },
  { icon: "map", label: "Map", route: "/map-search" },
  { icon: "sparkles", label: "AI", route: "/AI-chat" },
  { icon: "book", label: "Enrollments", route: "/enrollment" },
  { icon: "person", label: "Profile", route: "/stu-profile" },
];

/**
 * Single tab button. The active-pill background is rendered by the
 * parent row (a sliding `Animated.View` behind the tabs), so the
 * per-tab component only swaps icon fill + label color.
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
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;

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
      {/* Icon box — same footprint as the pill so the active
          background hugs exactly this box. */}
      <View className="w-12 h-7 items-center justify-center">
        <Ionicons
          name={active ? tab.icon : (`${tab.icon}-outline` as any)}
          size={20}
          color={color}
        />
      </View>
      {/* Single-line label: `adjustsFontSizeToFit` shrinks only when
          the text would overflow its tab; `maxFontSizeMultiplier`
          caps accessibility font scaling so labels never wrap. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.3}
        className={
          active ? "text-micro mt-0.5 font-semibold" : "text-micro mt-0.5"
        }
        style={{ color }}
      >
        {tab.label}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Renders the 5-tab row + the sliding active pill behind it. Each tab
 * is `flex-1` (exactly 1/5 of the measured row width — no hardcoded
 * screen width), and the pill is centered per tab on the JS side.
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
  const tabWidth = tabs.length > 0 ? width / tabs.length : 0;

  // Pill left edge = active tab's left edge + centering inset. All
  // math happens in plain React — the worklet below only reads the
  // shared value, so this can never go stale.
  const pillLeft =
    tabWidth * activeIndex + Math.max(0, (tabWidth - PILL_SIZE) / 2);
  const pillX = useSharedValue(0);
  React.useEffect(() => {
    pillX.value = withSpring(pillLeft, motion.spring.indicator);
  }, [pillLeft, pillX]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View
      className="flex-row relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            pillStyle,
            {
              position: "absolute",
              top: 0,
              width: PILL_SIZE,
              height: PILL_HEIGHT,
            },
          ]}
          className="rounded-pill bg-primary-light"
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
  const tabs = STUDENT_TABS;
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
   */
  function goTo(route: `/${string}`) {
    if (activeRoute === route) return;
    router.replace(route as any);
  }

  return (
    <View className="bg-surface border-t border-border pt-1.5 pb-2.5">
      <TabRow
        tabs={tabs}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onPress={(tab) => goTo(tab.route)}
      />
    </View>
  );
}
