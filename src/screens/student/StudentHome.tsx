import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { TutorCard } from "@/components/domain/TutorCard";
import { logout } from "@/services/firebase/authService";
import { BottomNav } from "@/components/shared/BottomNav";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";
import { useAiChatStore } from "@/store/aiChatStore";
import {
  getTutorRepository,
  type TutorListing,
} from "@/services/tutors/dataSource";
import { createDefaultTutorProfile } from "@/lib/tutor/types";

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
    // Wipe the AI chat session (history + constraint pills) so a
    // different user logging in on this device never inherits the
    // previous account's conversation context.
    useAiChatStore.getState().resetSession();
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
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Live reads from Firestore. We hold them in local state and
  // subscribe via `onSnapshot` so the dashboard re-renders if the
  // user edits their profile from the "Edit profile" affordance.
  const user = useAuthStore((state) => state.user);
  const [tutors, setTutors] = useState<TutorListing[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    locationLabel: "Add your location",
  });

  // Subscribe to the live tutor directory
  useEffect(() => {
    const unsub = getTutorRepository().subscribeTutors(
      (list) => {
        setTutors(list);
        setTutorsLoading(false);
      },
      () => setTutorsLoading(false),
    );
    return unsub;
  }, []);

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
    <ScreenLayout variant="night">

      {/* Hero header — standard ScreenHeader slot */}
      <ScreenHeader>
        <View className="flex-row items-start justify-between mb-4 gap-3">
          {/* `flex-1 min-w-0` lets the greeting shrink to fit a long
              name (e.g. "Suhan Dongol") next to the notification
              bell — without it the View clips to the bell's width
              and the name reads "Su…" in the screenshots. */}
          <View className="flex-1 min-w-0">
            <Text className="text-body text-white/70 mb-0.5">Good day,</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text
                className="text-screen-title font-medium text-white"
                numberOfLines={1}
              >
                {profile.fullName}
              </Text>
            </View>
          </View>
          <NotificationBell tone="dark" />
        </View>

        {/* Location */}
        <View className="flex-row items-center gap-1.5 mb-3.5">
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text className="text-caption text-white/70">{profile.locationLabel}</Text>
        </View>

        {/* Search bar — glass input on the night hero (Premium UI:
            translucent white surface + hairline edge) */}
        <View className="bg-glass-strong rounded-2xl h-input flex-row items-center px-4 gap-2.5 border border-glass-border">
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subjects, tutors, locations…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            className="flex-1 text-body-lg text-white"
          />
        </View>
      </ScreenHeader>

      {/* Content — dark body (Premium UI pass): the scroll sits on
          `bg-night-deep` (one step darker than the night hero) so the
          glass cards read as floating surfaces. */}
      <ScreenScroll className="flex-1 bg-night-deep">
        {/* Primary CTA — the ONLY amber surface on this screen. Amber
            is reserved for high-priority actions; tapping this
            launches the map discovery surface. */}
        <View className="mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore tutors on the map"
            onPress={() => router.replace("/map-search")}
            className="min-h-btn rounded-2xl bg-amber items-center justify-center shadow-[0_10px_30px_rgba(229,160,59,0.25)] active:opacity-90"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="map-outline" size={18} color="#0F172A" />
              <Text className="text-button font-semibold text-night">
                Explore tutors on the map
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Tutor list section header */}
        <View className="pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-section-title font-semibold text-white">
              Recommended tutors
            </Text>
            {!tutorsLoading && (
              <Text className="text-caption text-slate-400">
                {tutors.length} available
              </Text>
            )}
          </View>
          <Text className="text-body-sm text-slate-400 mt-1">
            Verified tutors ready to help you learn
          </Text>
        </View>

        {/* Tutor cards — live from Firestore */}
        <View className="gap-4">
          {tutorsLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text className="text-caption text-slate-400 mt-3">
                Loading tutors…
              </Text>
            </View>
          ) : tutors.length === 0 ? (
            <View className="items-center py-12 px-6">
              <View className="w-14 h-14 rounded-2xl bg-glass-strong items-center justify-center mb-3 border border-glass-border">
                <Ionicons
                  name="search-outline"
                  size={26}
                  color="rgba(255,255,255,0.5)"
                />
              </View>
              <Text className="text-card-title font-medium text-white text-center">
                No tutors available yet
              </Text>
              <Text className="text-body-sm text-slate-400 text-center mt-1.5">
                Approved tutors will appear here once they&apos;ve been
                verified by our team.
              </Text>
            </View>
          ) : (
            tutors.map((tutor) => (
              <TutorCard
                key={tutor.uid}
                tutor={createDefaultTutorProfile({
                  id: tutor.uid,
                  fullName: tutor.fullName,
                  username: tutor.username,
                  headline: tutor.headline,
                  subjects: tutor.subjects,
                  yearsExperience: tutor.yearsExperience,
                  monthlyRateNpr: tutor.monthlyRateNpr,
                  location: tutor.location,
                  rating: tutor.rating,
                  reviewCount: tutor.reviewCount,
                  isVerifiedProfessional: tutor.isVerifiedProfessional,
                  photoUrl: tutor.photoUrl,
                })}
                variant="wide"
                tone="dark"
              />
            ))
          )}
        </View>

        {/* Sign out — required because there's no other way to clear the
            native Firebase Auth session from inside a flat-route app
            with no tab navigator. Confirms before destroying the
            session so an accidental tap doesn't log the user out. */}
        <View className="pb-2">
          <StudentHomeLogOut
            isSigningOut={isSigningOut}
            onPress={() => {
              if (isSigningOut) return;
              Alert.alert(
                "Log out?",
                "You'll need to sign in again next time.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log out",
                    style: "destructive",
                    onPress: () => {
                      setIsSigningOut(true);
                      handleSignOut(router).finally(() =>
                        setIsSigningOut(false),
                      );
                    },
                  },
                ],
              );
            }}
          />
        </View>
      </ScreenScroll>

      <BottomNav role="student" current="/student-home" tone="dark" />
    </ScreenLayout>
  );
}

function StudentHomeLogOut({
  isSigningOut,
  onPress,
}: {
  isSigningOut: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      accessibilityState={{ busy: isSigningOut }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      disabled={isSigningOut}
      className="min-h-btn rounded-2xl items-center justify-center flex-row gap-2 bg-glass border border-glass-border"
    >
      {isSigningOut ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
      ) : (
        <Ionicons name="log-out-outline" size={18} color="#C1503D" />
      )}
      <Text className="text-button font-semibold text-danger">
        {isSigningOut ? "Logging out..." : "Log out"}
      </Text>
    </AnimatedPressable>
  );
}
