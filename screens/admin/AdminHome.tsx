import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNav } from "@/components/shared/AdminNav";
import { MOCK_ADMIN_STATS } from "@/data/adminStats";

/**
 * EdumentX — Admin Home Dashboard
 *
 * Landing page for admin users. Shows quick access to the three
 * main admin sections: Platform Statistics, Verification Queue,
 * and User Management. Each card surfaces a live count badge so
 * the admin can see the work backlog at a glance (Phase 5 will
 * replace the mock counts with real Firestore aggregations).
 */
export function AdminHome() {
  const router = useRouter();

  // Count badges are derived from MOCK_ADMIN_STATS for now. Phase 5
  // will swap this for a `useEffect` reading Firestore count
  // queries on mount.
  const pendingTutorReviews = MOCK_ADMIN_STATS.pendingTutorReviews;
  const totalUsers = MOCK_ADMIN_STATS.totalUsers;
  const suspendedUsers = MOCK_ADMIN_STATS.suspendedUsers;

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
      // Surface the full work backlog (verifications + edits + info
      // requests) so the admin knows there's a queue before they
      // tap in. Goes red when >0 to draw the eye.
      count: pendingTutorReviews,
      countLabel: `${pendingTutorReviews} pending`,
      countBg: "bg-danger",
      countFg: "text-text-inverse",
    },
    {
      title: "User Management",
      subtitle: "View & manage all registered users",
      icon: "people" as keyof typeof Ionicons.glyphMap,
      color: "text-amber",
      bgClass: "bg-amber-light",
      route: "/user-management",
      // Show the active + suspended counts so the admin sees
      // actionable user state at a glance. We deliberately don't
      // show "X deleted" — deleted users are audit-only.
      count: totalUsers - suspendedUsers,
      countLabel: suspendedUsers > 0
        ? `${totalUsers - suspendedUsers} active · ${suspendedUsers} suspended`
        : `${totalUsers} users`,
      countBg: "bg-amber",
      countFg: "text-text-inverse",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Hero header */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <View className="flex-row items-start justify-between mt-2">
          <View className="flex-1 min-w-0">
            <Text className="text-body text-white/70 mb-0.5">Dashboard</Text>
            <Text className="text-screen-title font-medium text-white">
              Admin Home
            </Text>
            <Text className="text-caption text-white/70 mt-1">
              Manage platform, verifications & users
            </Text>
          </View>
          {/* "My profile" pill — top-right of the hero. Routes to
              /admin-profile where the admin can view/edit their
              fullName, roleTitle, and phone. We expose this in the
              header (not the AdminNav) because profile is a
              secondary destination and the bottom nav is already
              loaded with the 3 work surfaces. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My admin profile"
            onPress={() => router.push("/admin-profile" as any)}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-pill bg-white/10 active:opacity-70"
          >
            <Ionicons name="person-circle-outline" size={16} color="#FFFFFF" />
            <Text className="text-button-sm font-medium text-white">
              My profile
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <Pressable
            key={section.route}
            onPress={() => router.push(section.route as any)}
            className="bg-surface border border-border-subtle rounded-card p-4 flex-row items-center gap-4 mb-4 active:opacity-80"
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
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>
        ))}
      </ScrollView>

      <AdminNav current="/admin-home" />
    </SafeAreaView>
  );
}