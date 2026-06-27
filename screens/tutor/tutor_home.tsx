import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { logout } from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Tutor Dashboard
 *
 * Reads the live user doc (`users/{uid}`) and the tutor profile
 * subcollection (`users/{uid}/tutorProfile/default`) on mount, and
 * re-renders if the user edits their profile. The metric values
 * (capacity, rating, reviews, response rate, monthly earnings) render
 * zero-state placeholders until Phase 5 wires live sessions,
 * enrollments, reviews, and payouts collections.
 */

type TutorProfile = {
  name: string;
  isVerifiedProfessional: boolean;
  // The metric block on the dashboard needs a few aggregate numbers
  // (capacity, current students, rating, monthly earnings, response
  // rate, profile completion). All of these come from collections
  // that don't exist yet (sessions, enrollments, reviews, payouts).
  // The shape here mirrors the planned documents so the JSX below
  // doesn't need to change when those reads land.
  capacity: number;
  currentStudents: number;
  rating: number;
  reviews: number;
  responseRate: number;
  profileCompletion: number;
  thisMonthEarningsNpr: number;
};

const DEFAULT_PROFILE: TutorProfile = {
  name: "",
  isVerifiedProfessional: false,
  capacity: 8,
  currentStudents: 0,
  rating: 0,
  reviews: 0,
  responseRate: 0,
  profileCompletion: 50,
  thisMonthEarningsNpr: 0,
};

function showComingSoon(feature: string) {
  Alert.alert(
    "Coming soon",
    `${feature} will be added in a future update.`,
  );
}

/**
 * Sign the user out, clear the local auth store, and route back to the
 * login screen. Calls the Firebase `logout()` helper, then drops the
 * cached `user` / `role` from the local Zustand store so the layout
 * guard immediately redirects on the next render. Mirrors the same
 * flow as `StudentHome` so the two dashboards stay in lock-step.
 */
async function handleSignOut(router: ReturnType<typeof useRouter>) {
  try {
    await logout();
    useAuthStore.getState().reset();
  } catch (err) {
    console.error("TutorDashboard: sign-out failed", err);
    Alert.alert("Could not sign out", "Please try again.");
    return;
  }
  // Replace the dashboard in the history stack so the user can't
  // swipe-back into it. `replace` is mandatory — `push` would leave the
  // dashboard mounted under /email-signup and the layout guard would
  // bounce back to the dashboard on the next render.
  router.replace("/email-signup");
}

export function TutorDashboard() {
  const router = useRouter();
  const [available, setAvailable] = useState(true);
  // Live profile read from Firestore. We start with DEFAULT_PROFILE so
  // the dashboard renders something sensible on first paint, then
  // patch fields in as the snapshots arrive. The metric values
  // (capacity, rating, earnings, response rate, profile completion)
  // remain at zero until Phase 5 wires the collections that back them.
  const [profile, setProfile] = useState<TutorProfile>(DEFAULT_PROFILE);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    const db = getFirestore(getApp());
    const userDocRef = doc(db, "users", user.uid);
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      const data = snap.data() as
        | {
            displayName?: string | null;
            email?: string | null;
            isVerifiedProfessional?: boolean;
          }
        | undefined;
      // Only the user-doc fields the dashboard reads. Profile
      // subcollection fields are merged in below.
      setProfile((current) => ({
        ...current,
        name: current.name || data?.displayName || (data?.email?.split("@")[0] ?? ""),
        isVerifiedProfessional: data?.isVerifiedProfessional ?? current.isVerifiedProfessional,
      }));
    });
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      const data = snap.data() as
        | { fullName?: string; isVerifiedProfessional?: boolean }
        | undefined;
      if (!snap.exists || !data) return;
      setProfile((current) => ({
        ...current,
        name: data.fullName ?? current.name,
        isVerifiedProfessional:
          data.isVerifiedProfessional ?? current.isVerifiedProfessional,
      }));
    });
    return () => {
      unsubUser();
      unsubProfile();
    };
  }, [user]);

  const capacity = profile.capacity;
  const currentStudents = profile.currentStudents;
  const capPct = capacity > 0 ? (currentStudents / capacity) * 100 : 0;
  const capColor =
    capPct >= 100 ? "bg-danger" : capPct > 80 ? "bg-warning" : "bg-verification";

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-night px-4 pb-5 shrink-0">
        <View className="flex-row justify-between items-start pt-2">
          <View>
            <Text className="text-body text-white/70">Welcome back,</Text>
            <Text className="text-screen-title font-medium text-white mt-0.5">
              {profile.name || "Tutor"}
            </Text>
            {profile.isVerifiedProfessional ? (
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-pill bg-verification-light mt-2 self-start">
                <Ionicons name="shield-checkmark" size={12} color="#A7F3D0" />
                <Text className="text-caption text-success font-medium">
                  Verified Professional
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Availability toggle */}
        <View className="bg-white/15 rounded-lg px-3.5 py-2.5 mt-3.5 flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-body font-medium text-white">
              {available ? "Available for new students" : "Hidden from search"}
            </Text>
            <Text className="text-caption text-white/65 mt-0.5">
              Toggle to {available ? "pause" : "resume"} appearing in search results
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: available }}
            accessibilityLabel="Toggle availability"
            onPress={() => setAvailable(!available)}
            className={`w-11 h-6.5 rounded-full px-0.5 active:opacity-80 ${
              available ? "bg-verification" : "bg-white/20"
            }`}
          >
            <View
              className={`w-[22px] h-[22px] rounded-full bg-white ${
                available ? "left-5" : "left-0.5"
              }`}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-9"
        showsVerticalScrollIndicator={false}
      >
        {/* Metric cards 2x2 */}
        <View className="flex-row flex-wrap justify-between mb-3.5">
          <Metric
            iconName="people"
            colorClass="bg-amber-light"
            iconColor="amber"
            label="Active students"
            value={String(currentStudents)}
          />
          <Metric
            iconName="star"
            colorClass="bg-warning-bg"
            iconColor="warning"
            label="Avg rating"
            value={profile.rating.toFixed(1)}
          />
          <Metric
            iconName="time"
            colorClass="bg-verification-light"
            iconColor="verification"
            label="Pending requests"
            value="0"
          />
          <Metric
            iconName="cash"
            colorClass="bg-ai-light"
            iconColor="ai"
            label="This month"
            value="Rs 0"
          />
        </View>

        {/* Capacity */}
        <Pressable
          onPress={() => showComingSoon("Capacity management")}
          className="bg-surface border border-border rounded-card p-4 mb-3.5 active:opacity-70"
        >
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="people" size={16} color="#B45309" />
            <Text className="flex-1 text-button-sm font-medium text-text-primary">Capacity</Text>
            <Text
              className={`text-button-sm font-medium ${
                capPct >= 100 ? "text-danger" : "text-verification"
              }`}
            >
              {currentStudents} of {capacity} filled
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
          <View className="h-2 rounded-full bg-background overflow-hidden">
            <View
              className={`h-full rounded-full ${capColor}`}
              style={{ width: `${capPct}%` }}
            />
          </View>
        </Pressable>

        {/* Profile completion */}
        <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
          <Text className="text-button-sm font-medium text-text-primary mb-1.5">
            Profile completion
          </Text>
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
              <View
                className="h-full bg-amber rounded-full"
                style={{ width: `${profile.profileCompletion}%` }}
              />
            </View>
            <Text className="text-button-sm text-amber font-medium">
              {profile.profileCompletion}%
            </Text>
          </View>
        </View>

        {/* Empty state — sessions, requests, and batch tooling
            land in Phase 5 alongside the collections that back
            them. We deliberately don't show fake names or stats
            here. */}
        <View className="bg-surface border border-border-subtle rounded-card p-6 mb-3.5 items-center">
          <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
            <Ionicons name="briefcase-outline" size={26} color="#B45309" />
          </View>
          <Text className="text-card-title font-medium text-text-primary text-center">
            Your tutor workspace is being set up
          </Text>
          <Text
            className="text-body text-text-secondary text-center mt-1.5"
            style={{ maxWidth: 320 }}
          >
            Sessions, enrollment requests, and batch management will
            appear here once we launch tutor onboarding in your area.
          </Text>
          <Text
            className="text-caption text-text-muted text-center mt-3"
            style={{ maxWidth: 320 }}
          >
            We&apos;ll email {user?.email ?? "you"} as soon as your
            profile is approved.
          </Text>
        </View>

        {/* Sign out — required because there's no other way to clear the
            native Firebase Auth session from inside a flat-route app
            with no tab navigator. Confirms before destroying the
            session so an accidental tap doesn't log the user out. */}
        <View className="px-5 pt-4 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => {
              Alert.alert(
                "Log out?",
                "You'll need to sign in again next time.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log out",
                    style: "destructive",
                    onPress: () => handleSignOut(router),
                  },
                ],
              );
            }}
            className="min-h-btn rounded-card items-center justify-center flex-row gap-2 bg-danger/10 active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text className="text-button font-semibold text-danger">Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MetricProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  /** Background class for the icon tile (Tailwind token). */
  colorClass: string;
  /** Ionicons color name (matches `colors` palette or token). */
  iconColor: keyof typeof ICON_COLOR_MAP;
  label: string;
  value: string;
};

/**
 * Local fallback colors for the metric icon. Most of the project
 * reads `colors.semantic.*` for SVG fills, but Ionicons accepts a
 * raw color string and these match the visual intent of the
 * `colorClass` token we use for the tile background.
 */
const ICON_COLOR_MAP = {
  amber: "#B45309",
  verification: "#047857",
  warning: "#B45309",
  danger: "#DC2626",
  ai: "#4F46E5",
  success: "#047857",
} as const;

function Metric({ iconName, colorClass, iconColor, label, value }: MetricProps) {
  return (
    <View className="bg-surface border border-border rounded-card p-3.5 mb-2.5" style={{ width: "48%" }}>
      <View className="flex-row items-center justify-between mb-2">
        <View className={`w-8 h-8 rounded-lg items-center justify-center ${colorClass}`}>
          <Ionicons name={iconName} size={16} color={ICON_COLOR_MAP[iconColor]} />
        </View>
      </View>
      <Text className="text-caption text-text-muted uppercase tracking-wider mb-1">{label}</Text>
      <Text className="text-section-title font-medium text-text-primary leading-tight">{value}</Text>
    </View>
  );
}