import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";

/**
 * EdumentX — Admin Bottom Navigation
 *
 * Persistent bottom nav for admin screens:
 *   Statistics → Verification → User Management
 */
export type AdminTab = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: `/${string}`;
};

const ADMIN_TABS: AdminTab[] = [
  { icon: "analytics", label: "Statistics", route: "/platform-statistics" },
  { icon: "shield-checkmark", label: "Verification", route: "/verification-queue" },
  { icon: "people", label: "Users", route: "/user-management" },
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
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-70"
    >
      <View
        className={
          active
            ? "w-12 h-7 rounded-pill bg-amber-light items-center justify-center"
            : "w-12 h-7 items-center justify-center"
        }
      >
        <Ionicons
          name={active ? tab.icon : (`${tab.icon}-outline` as any)}
          size={20}
          color={active ? "#B45309" : "#64748B"}
        />
      </View>
      <Text
        className={
          active
            ? "text-micro mt-0.5 font-semibold text-amber"
            : "text-micro mt-0.5 text-text-muted"
        }
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export function AdminNav({
  current,
}: {
  /**
   * Optional override for the active route. When omitted, the active
   * state is derived from `usePathname()`.
   */
  current?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = current ?? pathname;

  return (
    <View
      className="bg-surface border-t border-border-subtle"
      style={{ paddingBottom: 16, paddingTop: 6 }}
    >
      <View className="flex-row">
        {ADMIN_TABS.map((tab) => (
          <TabButton
            key={tab.route}
            tab={tab}
            active={activeRoute === tab.route}
            onPress={() => {
              if (activeRoute === tab.route) return;
              router.replace(tab.route as any);
            }}
          />
        ))}
      </View>
    </View>
  );
}