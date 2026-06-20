import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Student Home (UI-only milestone)
 *
 * This screen is intentionally self-contained while Firebase Auth +
 * Firestore are unwired. The two `TODO(firebase)` blocks below mark
 * the seams where the live data will plug in. The shape of `MockTutor`
 * is designed to match the planned Firestore document so the JSX below
 * does not need to change when data lands.
 */

type MockTutor = {
  id: string;
  name: string;
  subject: string;
  distanceKm: number;
  hourlyRateNpr: number;
  rating: number;
  verified: boolean;
};

// TODO(firebase): replace with
//   const fullName      = useRegistration((s) => s.profileDraft.fullName);
//   const neighborhood  = useRegistration((s) => s.profileDraft.location?.neighborhood);
//   const city          = useRegistration((s) => s.profileDraft.location?.city);
const PROFILE = {
  fullName: "Aarav Tamang",
  locationLabel: "Lazimpat, Kathmandu",
} as const;

// TODO(firebase): replace with a Firestore `tutors` collection query
// filtered by `geo` + `subjects`. The shape here mirrors the planned
// document so the JSX consumers (MiniTutorCard, the search filter)
// don't need to change.
const MOCK_TUTORS: readonly MockTutor[] = [
  { id: "t1", name: "Sita Karki",      subject: "Mathematics", distanceKm: 0.8, hourlyRateNpr: 800, rating: 4.9, verified: true  },
  { id: "t2", name: "Ramesh Shrestha", subject: "Physics",     distanceKm: 1.2, hourlyRateNpr: 900, rating: 4.7, verified: true  },
  { id: "t3", name: "Pooja Tamang",    subject: "Chemistry",   distanceKm: 1.6, hourlyRateNpr: 750, rating: 4.8, verified: false },
  { id: "t4", name: "Hari Adhikari",   subject: "Biology",     distanceKm: 2.1, hourlyRateNpr: 700, rating: 4.6, verified: true  },
  { id: "t5", name: "Maya Gurung",     subject: "English",     distanceKm: 2.8, hourlyRateNpr: 650, rating: 4.9, verified: true  },
];

type QuickAction = {
  emoji: string;
  label: string;
  feature: string;
  /** Tailwind background class for the emoji tile. */
  tileBg: string;
};

const QUICK_ACTIONS: readonly QuickAction[] = [
  { emoji: "🤖", label: "Ask AI assistant", feature: "AI assistant", tileBg: "bg-amber-light"  },
  { emoji: "📋", label: "My enrollments",   feature: "Enrollments",   tileBg: "bg-success-bg"  },
  { emoji: "🗺️", label: "Browse map",       feature: "Map view",      tileBg: "bg-amber-light"  },
  { emoji: "⭐", label: "Leave a review",   feature: "Tutor reviews", tileBg: "bg-warning-bg"  },
];

function showComingSoon(feature: string) {
  Alert.alert(
    "Coming soon",
    `${feature} will be added in a future update.`,
  );
}

/**
 * Sign the user out, clear the local auth store, and route back to the
 * login screen. Clerk is the source of truth for the session; we call
 * `useClerk().signOut()` which fires the `ClerkFirebaseBridge` to sign
 * Firebase out in the background. The local Zustand `useAuthStore.reset()`
 * call drops the cached `user` / `role` so the layout guard immediately
 * redirects on the next render.
 */
async function handleSignOut(
  signOut: ReturnType<typeof useClerk>["signOut"],
  router: ReturnType<typeof useRouter>,
) {
  try {
    await signOut();
    useAuthStore.getState().reset();
  } catch (err) {
    console.error("StudentHome: sign-out failed", err);
    Alert.alert("Could not sign out", "Please try again.");
    return;
  }
  // Replace the dashboard in the history stack so the user can't
  // swipe-back into it. `replace` is mandatory — `push` would leave the
  // dashboard mounted under /phone-entry and the layout guard would
  // bounce back to the dashboard on the next render.
  router.replace("/phone-entry");
}

export function StudentHome() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_TUTORS;
    return MOCK_TUTORS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [search]);

  const verifiedTutors = filtered.filter((t) => t.verified);
  const nearbyTutors = [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <StatusBar style="light" />

      {/* Hero header */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <View className="flex-row items-start justify-between mb-4 mt-2">
          <View>
            <Text className="text-body text-white/70 mb-0.5">Good morning,</Text>
            <Text className="text-screen-title font-medium text-white">
              {PROFILE.fullName} 👋
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => showComingSoon("Notifications")}
            className="bg-white/15 rounded-xl w-10 h-10 items-center justify-center relative active:opacity-70"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger border-2 border-night" />
          </Pressable>
        </View>

        {/* Location */}
        <View className="flex-row items-center gap-1.5 mb-3.5">
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text className="text-caption text-white/70">{PROFILE.locationLabel}</Text>
        </View>

        {/* Search bar */}
        <View className="bg-surface rounded-xl h-12 flex-row items-center px-3 gap-2.5">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subjects, tutors..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-body-lg text-text-primary"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter tutors"
            onPress={() => showComingSoon("Map filters")}
            className="bg-amber-light rounded-lg px-2.5 py-1.5 flex-row items-center gap-1 active:opacity-70"
          >
            <Ionicons name="options-outline" size={14} color="amber" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="pb-9"
        showsVerticalScrollIndicator={false}
      >
        {/* Nearby tutors */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-section-title font-medium text-text-primary">
              Nearby tutors
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View tutors on map"
              onPress={() => showComingSoon("Map view")}
              className="flex-row items-center gap-0.5 active:opacity-70"
            >
              <Text className="text-button-sm text-amber">View map</Text>
              <Ionicons name="chevron-forward" size={14} color="amber" />
            </Pressable>
          </View>

          {/* Horizontal scroll row */}
          {nearbyTutors.length === 0 ? (
            <Text className="text-caption text-text-muted py-4">
              No tutors match your search.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pb-1"
            >
              {nearbyTutors.map((t) => (
                <MiniTutorCard key={t.id} tutor={t} compact />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Verified tutors */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-section-title font-medium text-text-primary">
                Verified tutors
              </Text>
              <Text className="text-caption text-text-muted">
                Document-verified by EdumentX
              </Text>
            </View>
          </View>
          {verifiedTutors.length === 0 ? (
            <Text className="text-caption text-text-muted py-4">
              No verified tutors match your search.
            </Text>
          ) : (
            <View className="flex-col gap-2.5">
              {verifiedTutors.map((t) => (
                <MiniTutorCard key={t.id} tutor={t} />
              ))}
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View className="px-5 pt-5">
          <Text className="text-section-title font-medium text-text-primary mb-3">
            Quick actions
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {QUICK_ACTIONS.map(({ emoji, label, feature, tileBg }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => showComingSoon(feature)}
                style={{ width: "48%" }}
                className="bg-surface border border-border-subtle rounded-xl p-4 mb-2.5 active:opacity-70"
              >
                <View className={`w-10 h-10 rounded-xl ${tileBg} items-center justify-center mb-2`}>
                  <Text className="text-button-sm">{emoji}</Text>
                </View>
                <Text className="text-button-sm font-medium text-text-primary">{label}</Text>
              </Pressable>
            ))}
          </View>
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
                "You'll need to verify your phone again next time you sign in.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log out",
                    style: "destructive",
                    onPress: () => handleSignOut(signOut, router),
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

type MiniTutorCardProps = {
  tutor: MockTutor;
  compact?: boolean;
};

/**
 * Compact card for the "Nearby" horizontal scroller; full-width card
 * for the "Verified" vertical list. Inline because the data is inline
 * and there's no shared design system card primitive yet.
 */
function MiniTutorCard({ tutor, compact = false }: MiniTutorCardProps) {
  const initials = tutor.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tutor.name}, ${tutor.subject}, ${tutor.distanceKm.toFixed(1)} kilometers away`}
      onPress={() => showComingSoon("Tutor profile")}
      className={`bg-surface border border-border-subtle rounded-card active:opacity-80 ${
        compact ? "w-44 p-3" : "p-4"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`rounded-full bg-amber-light items-center justify-center ${
            compact ? "w-10 h-10" : "w-12 h-12"
          }`}
        >
          <Text className="text-button-sm text-amber font-semibold">{initials}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-button-sm font-medium text-text-primary"
              numberOfLines={1}
            >
              {tutor.name}
            </Text>
            {tutor.verified ? (
              <Ionicons name="checkmark-circle" size={14} color="#047857" />
            ) : null}
          </View>
          <Text className="text-caption text-text-secondary" numberOfLines={1}>
            {tutor.subject}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="location-outline" size={12} color="#64748B" />
          <Text className="text-caption text-text-muted">
            {tutor.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="star" size={12} color="#B45309" />
          <Text className="text-caption text-text-secondary">
            {tutor.rating.toFixed(1)}
          </Text>
        </View>
        <Text className="text-caption text-text-primary font-semibold">
          Rs. {tutor.hourlyRateNpr}/hr
        </Text>
      </View>
    </Pressable>
  );
}

