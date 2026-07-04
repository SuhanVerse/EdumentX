import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNav } from "@/components/shared/AdminNav";

/**
 * EdumentX — Platform Statistics (Admin)
 *
 * Clean stat cards matching the project's design language:
 * - Slate hero header
 * - Amber accent cards
 * - No external chart dependencies (placeholder charts for now)
 * - Placeholder data (Firebase integration later)
 */

const KPI_CARDS = [
  {
    label: "Total Users",
    value: "1,248",
    change: "+14% this week",
    icon: "people",
    bgClass: "bg-amber-light",
    iconColorClass: "text-amber",
    trend: "up",
  },
  {
    label: "Total Tutors",
    value: "312",
    change: "+8% this week",
    icon: "school",
    bgClass: "bg-verification-light",
    iconColorClass: "text-verification",
    trend: "up",
  },
  {
    label: "Total Students",
    value: "936",
    change: "+16% this week",
    icon: "person-add",
    bgClass: "bg-ai-light",
    iconColorClass: "text-ai",
    trend: "up",
  },
  {
    label: "Active Enrollments",
    value: "387",
    change: "+5% this week",
    icon: "document-check",
    bgClass: "bg-success-bg",
    iconColorClass: "text-success",
    trend: "up",
  },
  {
    label: "Pending Verifications",
    value: "23",
    change: "-2 this week",
    icon: "shield-checkmark",
    bgClass: "bg-warning-bg",
    iconColorClass: "text-warning-text",
    trend: "down",
  },
  {
    label: "Platform Rating",
    value: "4.7",
    change: "+0.1 this month",
    icon: "star",
    bgClass: "bg-amber-light",
    iconColorClass: "text-amber",
    trend: "up",
  },
];

const RECENT_ACTIVITY = [
  { action: "New tutor verified", name: "Ram Sharma", time: "2m ago", type: "verification" },
  { action: "New enrollment", name: "Aarav → Sita", time: "15m ago", type: "enrollment" },
  { action: "User suspended", name: "Anonymous report", time: "1h ago", type: "suspension" },
  { action: "Verification rejected", name: "Invalid documents", time: "3h ago", type: "rejection" },
  { action: "New student registered", name: "Priya Karki", time: "4h ago", type: "registration" },
];

function getActivityStyle(type: string) {
  switch (type) {
    case "verification":
      return { dot: "bg-verification", icon: "shield-checkmark", color: "text-verification" };
    case "enrollment":
      return { dot: "bg-amber", icon: "document-check", color: "text-amber" };
    case "suspension":
      return { dot: "bg-danger", icon: "alert-circle", color: "text-danger" };
    case "rejection":
      return { dot: "bg-warning", icon: "close-circle", color: "text-warning-text" };
    case "registration":
      return { dot: "bg-ai", icon: "person-add", color: "text-ai" };
    default:
      return { dot: "bg-text-muted", icon: "information-circle", color: "text-text-muted" };
  }
}

export function PlatformStatistics() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Hero header */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <Text className="text-body text-white/70 mb-0.5 mt-2">Overview</Text>
        <Text className="text-screen-title font-medium text-white">
          Platform Statistics
        </Text>
        <Text className="text-caption text-white/70 mt-1">
          EdumentX · Live data
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Grid */}
        <View className="gap-3 mb-6">
          {KPI_CARDS.map((card, i) => (
            <Pressable
              key={i}
              className="bg-surface border border-border-subtle rounded-card p-4 flex-row items-center gap-4 active:opacity-80"
            >
              <View className={`w-12 h-12 rounded-xl items-center justify-center ${card.bgClass}`}>
                <Ionicons name={card.icon } size={24} className={card.iconColorClass} />
              </View>
              <View className="flex-1">
                <Text className="text-hero font-bold text-text-primary">{card.value}</Text>
                <Text className="text-caption text-text-muted uppercase tracking-wider mt-0.5">{card.label}</Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Ionicons
                    name={card.trend === "up" ? "trending-up" : "trending-down"}
                    size={12}
                    className={card.trend === "up" ? "text-success" : "text-danger"}
                  />
                  <Text className={`text-caption font-medium ${card.trend === "up" ? "text-success" : "text-danger"}`}>
                    {card.change}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
          ))}
        </View>

        {/* Charts placeholder section */}
        <View className="mb-6">
          <Text className="text-section-title font-medium text-text-primary mb-3">
            Enrollment Trends
          </Text>
          <View className="bg-surface border border-border-subtle rounded-card p-4">
            <Text className="text-body text-text-secondary text-center py-8">
              Chart integration coming soon (Phase 5)
            </Text>
            <View className="flex-row justify-center gap-2 mt-4">
              {["Week", "Month", "Quarter"].map((period) => (
                <Pressable
                  key={period}
                  className="px-3 py-1.5 rounded-pill bg-sand text-caption text-text-secondary active:bg-amber active:text-text-inverse"
                >
                  {period}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-section-title font-medium text-text-primary mb-3">
            Subject Demand
          </Text>
          <View className="bg-surface border border-border-subtle rounded-card p-4">
            <Text className="text-body text-text-secondary text-center py-8">
              Chart integration coming soon (Phase 5)
            </Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-section-title font-medium text-text-primary">
              Recent Activity
            </Text>
            <Pressable
              onPress={() => router.push("/verification-queue" as any)}
              className="text-caption text-amber font-medium"
            >
              View all
            </Pressable>
          </View>
          {RECENT_ACTIVITY.map((item, i) => {
            const style = getActivityStyle(item.type);
            return (
              <View
                key={i}
                className="bg-surface border border-border-subtle rounded-card p-4 flex-row items-center gap-3 mb-2"
              >
                <View className={`w-2 h-2 rounded-full ${style.dot}`} />
                <View className="flex-1 min-w-0">
                  <Text className="text-body text-text-primary">{item.action}</Text>
                  <Text className="text-caption text-text-muted">{item.name}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name={style.icon} size={16} className={style.color} />
                  <Text className="text-caption text-text-muted">{item.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <AdminNav current="/platform-statistics" />
    </SafeAreaView>
  );
}