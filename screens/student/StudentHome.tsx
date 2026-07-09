import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
import { BottomNav } from "@/components/shared/BottomNav";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Student Home
 *
 * Reads the live user doc (`users/{uid}`) and profile subcollection
 * (`users/{uid}/studentProfile/default`) on mount and re-renders if
 * the user edits their profile. Tutor discovery is wired in Phase 5
 * via a `tutors` collection query — until then, this surface shows a
 * professional empty state instead of fake placeholder names.
 */

type Profile = {
  fullName: string;
  locationLabel: string;
};

/**
 * Sign the user out, clear the local auth store, and route back to the
 * auth screen. Calls the Firebase `logout()` helper, then drops the
 * cached `user` / `role` from the local Zustand store so the layout
 * guard immediately redirects on the next render.
 */
async function handleSignOut(router: ReturnType<typeof useRouter>) {
  try {
    await logout();
    useAuthStore.getState().reset();
  } catch (err) {
    console.error("StudentHome: sign-out failed", err);
    Alert.alert("Could not sign out", "Please try again.");
    return;
  }
  // Replace the dashboard in the history stack so the user can't
  // swipe-back into it. `replace` is mandatory — `push` would leave the
  // dashboard mounted under /email-signup and the layout guard would
  // bounce back to the dashboard on the next render.
  router.replace("/email-signup");
}

/**
 * Resolve the display name shown in the dashboard greeting.
 *   1. `profile.fullName` from the studentProfile subcollection (if
 *      set — this is what the user picked during profile setup).
 *   2. `user.displayName` from Firebase Auth (set by Google Sign-In
 *      automatically, null for email/password users).
 *   3. The local part of the email address (e.g. "aarav" from
 *      "aarav@gmail.com").
 *   4. The literal string "there" as a last resort.
 */
function resolveDisplayName(
  profileFullName: string | null,
  email: string | null,
  authDisplayName: string | null,
): string {
  if (profileFullName && profileFullName.trim().length > 0) {
    return profileFullName.trim();
  }
  if (authDisplayName && authDisplayName.trim().length > 0) {
    return authDisplayName.trim();
  }
  if (email && email.includes("@")) {
    return email.split("@")[0];
  }
  return "there";
}

/**
 * Format the location label from the studentProfile doc. We prefer
 * "<neighborhood>, <city>" if both are present, just "<city>" if not,
 * and "Add your location" if neither is set (the dashboard surfaces a
 * gentle nudge to fill it in).
 */
function resolveLocationLabel(
  location: { neighborhood: string | null; city: string | null } | null,
): string {
  if (!location) return "Add your location";
  const neighborhood = location.neighborhood?.trim();
  const city = location.city?.trim();
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  if (city) return city;
  if (neighborhood) return neighborhood;
  return "Add your location";
}

export function StudentHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Live reads from Firestore. We hold them in local state and
  // subscribe via `onSnapshot` so the dashboard re-renders if the
  // user edits their profile from the "Edit profile" affordance.
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    locationLabel: "Add your location",
  });

  useEffect(() => {
    if (!user) return;
    const db = getFirestore(getApp());
    const userDocRef = doc(db, "users", user.uid);
    const profileRef = doc(db, "users", user.uid, "studentProfile", "default");
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      const data = snap.data() as
        | { displayName?: string | null; email?: string | null }
        | undefined;
      // Only the fields the dashboard reads from the user doc. The
      // fullName is in the studentProfile subcollection — see below.
      const authDisplayName = data?.displayName ?? user.displayName ?? null;
      setProfile((current) => ({
        ...current,
        fullName: resolveDisplayName(
          null,
          data?.email ?? user.email ?? null,
          authDisplayName,
        ),
      }));
    });
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      const data = snap.data() as
        | {
            fullName?: string;
            location?: { neighborhood?: string; city?: string } | null;
          }
        | undefined;
      setProfile((current) => ({
        ...current,
        fullName: resolveDisplayName(
          data?.fullName ?? null,
          current.fullName ? current.fullName : user.email ?? null,
          user.displayName ?? null,
        ),
        locationLabel: resolveLocationLabel(
          data?.location
            ? {
                neighborhood: data.location.neighborhood ?? null,
                city: data.location.city ?? null,
              }
            : null,
        ),
      }));
    });
    return () => {
      unsubUser();
      unsubProfile();
    };
  }, [user]);

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <StatusBar style="light" />

      {/* Hero header */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <View className="flex-row items-start justify-between mb-4 mt-2">
          <View>
            <Text className="text-body text-white/70 mb-0.5">Good day,</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text className="text-screen-title font-medium text-white">
                {profile.fullName}
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View className="flex-row items-center gap-1.5 mb-3.5">
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text className="text-caption text-white/70">{profile.locationLabel}</Text>
        </View>

        {/* Search bar */}
        <View className="bg-surface rounded-card h-input flex-row items-center px-3 gap-2.5 border border-border">
          <Ionicons name="search-outline" size={18} color="#6B7268" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subjects, tutors, locations…"
            placeholderTextColor="#6B7268"
            className="flex-1 text-body-lg text-text-primary"
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="pb-9"
        showsVerticalScrollIndicator={false}
      >
        {/* Empty state — tutor discovery lands in Phase 5 */}
        <View className="px-5 pt-10">
          <View className="bg-surface border border-border rounded-card p-6 items-center">
            <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
              <Ionicons name="search-outline" size={26} color="#E5A03B" />
            </View>
            <Text className="text-heading text-text-primary text-center">
              Tutor discovery is coming soon
            </Text>
            <Text
              className="text-body text-text-secondary text-center mt-1.5"
              style={{ maxWidth: 320 }}
            >
              We&apos;re onboarding verified tutors in your area. You&apos;ll
              be notified as soon as matches are available for your
              selected subjects.
            </Text>
            <View className="flex-row items-center gap-2 mt-4">
              <Ionicons name="mail-outline" size={14} color="#6B7268" />
              <Text className="text-caption text-text-muted">
                We&apos;ll email {user?.email ?? "you"} when launches begin.
              </Text>
            </View>
          </View>
        </View>

        {/* Sign out — required because there's no other way to clear the
            native Firebase Auth session from inside a flat-route app
            with no tab navigator. Confirms before destroying the
            session so an accidental tap doesn't log the user out. */}
        <View className="px-5 pt-6 pb-2">
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
            className="min-h-btn rounded-card items-center justify-center flex-row gap-2 bg-surface border border-border active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={18} color="#C1503D" />
            <Text className="text-button font-semibold text-danger">Log out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav role="student" current="/student-home" />
    </SafeAreaView>
  );
}