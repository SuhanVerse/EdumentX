import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useAuthStore } from "@/store/authStore";

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
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export function AdminNav() {
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
            active={pathname === tab.route}
            onPress={() => goTo(tab.route)}
          />
        ))}
      </View>
    </View>
  );
}
