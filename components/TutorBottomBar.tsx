import { router, usePathname } from "expo-router";
import { LayoutDashboard, Inbox, Users, User } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ActivePill } from "@/components/motion";
import { motion } from "@/lib/motion";

type TutorTabKey = "dashboard" | "inbox" | "batches" | "profile";

type TutorTabDef = {
  key: TutorTabKey;
  label: string;
  // `Href` matches expo-router's full registered-routes union. The
  // string literal values in TUTOR_TABS still get widened to `string`
  // at the array level, so we need to cast at the call sites instead.
  path: string;
  icon: typeof LayoutDashboard;
};

const TUTOR_TABS: readonly TutorTabDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/tutor-home",
    icon: LayoutDashboard,
  },
  { key: "inbox", label: "Inbox", path: "/tutor-inbox", icon: Inbox },
  { key: "batches", label: "Batches", path: "/batches", icon: Users },
  { key: "profile", label: "Profile", path: "/tutor_edit_profile", icon: User },
] as const;

const ACTIVE_COLOR = "#2F5D50";
const INACTIVE_COLOR = "#6B7268";

type TutorBottomBarProps = {
  inboxBadgeCount?: number;
};

const UNDERLINE_WIDTH = 32;

const AnimatedView = Animated.createAnimatedComponent(View);

export function TutorBottomBar({ inboxBadgeCount = 0 }: TutorBottomBarProps) {
  const pathname = usePathname();
  const [width, setWidth] = React.useState(0);
  const activeIndex = Math.max(
    0,
    TUTOR_TABS.findIndex(
      (tab) => pathname === tab.path || pathname.endsWith(`/${tab.key}`),
    ),
  );
  const tabWidth = width > 0 ? width / TUTOR_TABS.length : 0;

  // Underline track — springs to the active tab's center minus
  // half the underline width so the bar stays visually centered.
  const underlineX = useSharedValue(0);
  React.useEffect(() => {
    const center = tabWidth * activeIndex + tabWidth / 2 - UNDERLINE_WIDTH / 2;
    underlineX.value = withSpring(center, motion.spring.indicator);
  }, [activeIndex, tabWidth, underlineX]);
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
  }));

  return (
    <View
      className="flex-row bg-surface border-t border-border px-2 pt-1.5 pb-2.5 relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ActivePill
          count={TUTOR_TABS.length}
          activeIndex={activeIndex}
          itemWidth={tabWidth}
          pillClassName="absolute top-1.5 w-12 h-7 rounded-pill"
          style={{
            top: 6,
            width: 48,
            height: 28,
            backgroundColor: "#F1ECE0",
          }}
        />
      ) : null}
      {TUTOR_TABS.map((tab, i) => {
        const isActive = i === activeIndex;
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
        const Icon = tab.icon;

        return (
          <Pressable
            key={tab.key}
            onPress={() => router.push(tab.path as Parameters<typeof router.push>[0])}
            className="flex-1 items-center justify-center py-1 active:opacity-70"
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <View
              className="w-12 h-7 rounded-pill items-center justify-center"
              style={{ backgroundColor: isActive ? "#F1ECE0" : "transparent" }}
            >
              <Icon color={color} size={22}></Icon>
              {tab.key === "inbox" && inboxBadgeCount > 0 && (
                <BadgeDot count={inboxBadgeCount} />
              )}
            </View>
            <Text className="text-[11px] font-medium mt-1" style={{ color }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      {width > 0 ? (
        <AnimatedView
          style={[
            underlineStyle,
            {
              position: "absolute",
              bottom: 4,
              width: UNDERLINE_WIDTH,
              height: 2,
              borderRadius: 999,
              backgroundColor: ACTIVE_COLOR,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

type BadgeDotProps = { count: number };

function BadgeDot({ count }: BadgeDotProps) {
  return (
    <View className="absolute -top-1.5 -right-2 bg-danger rounded-full min-w-[16px] h-4 items-center justify-center px-1">
      <Text className="text-white text-[10px] font-semibold leading-none">
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}
