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

import { TutorCard } from "@/components/domain/TutorCard";
import { colors } from "@/constants/colors";
import { BottomNav } from "@/components/shared/BottomNav";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuthStore } from "@/store/authStore";
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
 * the user edits their profile. Logout lives on the Profile tab
 * (`/stu-profile`) — it is the only sign-out surface.
 */

type Profile = {
  fullName: string;
  locationLabel: string;
};

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
    <ScreenLayout variant="background">

      {/* Hero header — standard ScreenHeader slot */}
      <ScreenHeader variant="light">
        <View className="flex-row items-start justify-between mb-4 gap-3">
          {/* `flex-1 min-w-0` lets the greeting shrink to fit a long
              name (e.g. "Suhan Dongol") next to the notification
              bell — without it the View clips to the bell's width
              and the name reads "Su…" in the screenshots. */}
          <View className="flex-1 min-w-0">
            <Text className="text-body text-text-secondary mb-0.5">Good day,</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.brand.accent, paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text
                className="text-screen-title font-medium text-text-primary"
                numberOfLines={1}
              >
                {profile.fullName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Messages"
              onPress={() => router.push("/messages" as never)}
              className="w-10 h-10 rounded-pill bg-surface border border-border items-center justify-center active:opacity-80"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.brand.primary} />
            </Pressable>
            <NotificationBell tone="light" />
          </View>
        </View>

        {/* Location */}
        <View className="flex-row items-center gap-1.5 mb-3.5">
          <Ionicons name="location-outline" size={14} color={colors.text.muted} />
          <Text className="text-caption text-text-secondary">{profile.locationLabel}</Text>
        </View>

        {/* Search bar — white surface input on the warm-paper hero
            (hairline border separates it from the body) */}
        <View className="bg-surface rounded-card h-input flex-row items-center px-4 gap-2.5 border border-border">
          <Ionicons name="search-outline" size={18} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subjects, tutors, locations…"
            placeholderTextColor={colors.text.muted}
            className="flex-1 text-body-lg text-text-primary"
          />
        </View>
      </ScreenHeader>

      {/* Content — warm-paper body (Premium UI pass): the scroll sits on
          `bg-background` so the white cards read as floating surfaces. */}
      <ScreenScroll className="flex-1 bg-background">
        {/* Primary CTA — the ONLY amber surface on this screen. Amber
            is reserved for high-priority actions; tapping this
            launches the map discovery surface. */}
        <View className="mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore tutors on the map"
            onPress={() => router.replace("/map-search")}
            className="min-h-btn rounded-card bg-amber items-center justify-center shadow-[0_10px_30px_rgba(229,160,59,0.25)] active:opacity-90"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="map-outline" size={18} color={colors.text.primary} />
              <Text className="text-button font-semibold text-night">
                Explore tutors on the map
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Browse batches — secondary entry into the group-class
            marketplace. AI blue is the batch-family brand (amber is
            already spent on the map CTA above). */}
        <View className="mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse open batches"
            onPress={() => router.push("/browse-batches" as never)}
            className="flex-row items-center gap-3 bg-surface border border-border rounded-card p-3.5 active:opacity-80"
          >
            <View className="w-10 h-10 rounded-pill bg-ai-light items-center justify-center">
              <Ionicons name="people-outline" size={19} color={colors.brand.ai} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-card-title font-medium text-text-primary">
                Browse open batches
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                Join an existing group class near you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </Pressable>
        </View>

        {/* Tutor list section header */}
        <View className="pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-section-title font-semibold text-text-primary">
              Recommended tutors
            </Text>
            {!tutorsLoading && (
              <Text className="text-caption text-text-muted">
                {tutors.length} available
              </Text>
            )}
          </View>
          <Text className="text-body-sm text-text-muted mt-1">
            Verified tutors ready to help you learn
          </Text>
        </View>

        {/* Tutor cards — live from Firestore */}
        <View className="gap-4">
          {tutorsLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color={colors.brand.primary} />
              <Text className="text-caption text-text-muted mt-3">
                Loading tutors…
              </Text>
            </View>
          ) : tutors.length === 0 ? (
            <View className="items-center py-12 px-6">
              <View className="w-14 h-14 rounded-card bg-surface items-center justify-center mb-3 border border-border">
                <Ionicons
                  name="search-outline"
                  size={26}
                  color={colors.text.muted}
                />
              </View>
              <Text className="text-card-title font-medium text-text-primary text-center">
                No tutors available yet
              </Text>
              <Text className="text-body-sm text-text-muted text-center mt-1.5">
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
              />
            ))
          )}
        </View>

      </ScreenScroll>

      <BottomNav role="student" current="/student-home" tone="light" />
    </ScreenLayout>
  );
}
