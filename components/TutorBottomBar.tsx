import { router, usePathname } from "expo-router";
import { LayoutDashboard, Inbox, Users, User } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

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

const ACTIVE_COLOR = "#2B6CB0";
const INACTIVE_COLOR = "#94A3B8";

type TutorBottomBarProps = {
  inboxBadgeCount?: number;
};

export function TutorBottomBar({ inboxBadgeCount = 0 }: TutorBottomBarProps) {
  const pathname = usePathname();

  return (
    <View className="flex-row bg-surface border-t-[0.5px] border-border px-2 pt-1.5 pb-2.5">
      {TUTOR_TABS.map((tab) => {
        const isActive =
          pathname === tab.path || pathname.endsWith(`/${tab.key}`);
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
            <View>
              <Icon color={color} size={22}></Icon>
              {tab.key === "inbox" && inboxBadgeCount > 0 && (
                <BadgeDot count={inboxBadgeCount} />
              )}
            </View>
            <Text className="text-[11px] font-medium mt-1" style={{ color }}>
              {tab.label}
            </Text>
            {isActive && (
              <View
                className="h-0.5 w-6 rounded-full mt-1"
                style={{ backgroundColor: ACTIVE_COLOR }}
              />
            )}
          </Pressable>
        );
      })}
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
