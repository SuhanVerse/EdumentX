import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  ScreenHeader,
} from "@/components/shared/ScreenLayout";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  ScrollView,
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
import { useUnreadCount } from "@/services/messages/useUnreadCount";
import { createDefaultTutorProfile } from "@/lib/tutor/types";
import { filterDiscoveryTutors, getDiscoverySubjects } from "@/lib/tutor/discovery";
import { AnimatedPressable, Skeleton, usePressScale } from "@/components/motion";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { motion } from "@/lib/motion";

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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const listRef = useRef<FlatList<TutorListing>>(null);

  // Live reads from Firestore. We hold them in local state and
  // subscribe via `onSnapshot` so the dashboard re-renders if the
  // user edits their profile from the "Edit profile" affordance.
  const user = useAuthStore((state) => state.user);
  // Live unread message count for the header chat icon badge.
  const unreadMessages = useUnreadCount(user?.uid);
  const [tutors, setTutors] = useState<TutorListing[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    locationLabel: "Add your location",
  });

  // One shared feed: search and subject selection are entirely local.
  useEffect(() => {
    setTutorsLoading(true);
    setDirectoryError(false);
    return getTutorRepository().subscribeTutors(
      (list) => {
        setTutors(list);
        setDirectoryError(false);
        setTutorsLoading(false);
      },
      () => {
        setDirectoryError(true);
        setTutorsLoading(false);
      },
    );
  }, [retry]);

  const subjects = useMemo(() => getDiscoverySubjects(tutors), [tutors]);
  const visibleTutors = useMemo(
    () => filterDiscoveryTutors(tutors, search, selectedSubject),
    [tutors, search, selectedSubject],
  );
  const filtering = search.trim().length > 0 || selectedSubject !== null;

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search, selectedSubject]);

  function clearFilters() {
    setSearch("");
    setSelectedSubject(null);
  }

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
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between gap-3 mb-4">
          <View className="flex-1 min-w-0">
            <Text className="text-caption text-text-secondary" numberOfLines={1}>
              Hello, {profile.fullName || "there"}
            </Text>
            <Text className="text-screen-title font-semibold text-text-primary mt-1">
              Find your tutor
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                onPress={() => router.push("/messages" as never)}
                className="w-12 h-12 rounded-pill bg-background border border-border items-center justify-center active:opacity-80"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.brand.primary} />
              </Pressable>
              {unreadMessages > 0 && (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-danger items-center justify-center"
                >
                  <Text className="text-micro font-semibold text-text-inverse">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </Text>
                </View>
              )}
            </View>
            <NotificationBell tone="light" />
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 mb-4">
          <Ionicons name="location-outline" size={14} color={colors.brand.primary} />
          <Text className="flex-1 text-caption text-text-secondary" numberOfLines={1}>
            {profile.locationLabel}
          </Text>
        </View>
        <View className="bg-background rounded-pill min-h-btn flex-row items-center px-4 gap-2.5 border border-border">
          <Ionicons name="search-outline" size={20} color={colors.brand.primary} />
          <TextInput
            accessibilityLabel="Search tutors, subjects, or locations"
            value={search}
            onChangeText={setSearch}
            placeholder="Subject, tutor or location"
            placeholderTextColor={colors.text.muted}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-body text-text-primary py-3"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              className="w-11 h-11 items-center justify-center"
            >
              <Ionicons name="close-circle" size={20} color={colors.text.muted} />
            </Pressable>
          )}
        </View>
      </ScreenHeader>

      <Animated.View
        entering={FadeIn.duration(motion.duration.medium).reduceMotion(ReduceMotion.System)}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={tutorsLoading || directoryError ? [] : visibleTutors}
          keyExtractor={(tutor) => tutor.uid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="px-6 pt-6 pb-8"
          ItemSeparatorComponent={TutorSeparator}
          ListHeaderComponent={
            <View>
              {subjects.length > 0 && (
                <View className="mb-5">
                  <Text className="text-label font-medium text-text-secondary mb-2">BROWSE BY SUBJECT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View className="flex-row gap-2 pr-1">
                      <SubjectFilter label="All subjects" selected={selectedSubject === null} onPress={() => setSelectedSubject(null)} />
                      {subjects.map(subject => (
                        <SubjectFilter key={subject} label={subject} selected={selectedSubject === subject} onPress={() => setSelectedSubject(subject)} />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              {!filtering && (
                <>
                  <View className="bg-primary rounded-hero p-5 mb-4">
                    <View className="flex-row items-center gap-2 mb-3">
                      <View className="w-8 h-8 rounded-pill bg-surface/10 items-center justify-center">
                        <Ionicons name="compass-outline" size={18} color={colors.text.inverse} />
                      </View>
                      <Text className="flex-1 text-label font-medium tracking-wide text-glass-secondary">LEARN CLOSE TO HOME</Text>
                    </View>
                    <Text className="text-display font-semibold text-text-inverse">Your goals. Your tutor.</Text>
                    <Text className="text-body-sm text-glass-secondary mt-2">
                      Explore subjects and tutors around you, then find a schedule that fits.
                    </Text>
                    <PrimaryButton
                      label="Explore the map"
                      variant="accent"
                      className="mt-4"
                      leftIcon={<Ionicons name="map-outline" size={18} color={colors.text.primary} />}
                      onPress={() => router.replace("/map-search")}
                    />
                  </View>
                  <View className="flex-row gap-3 mb-6">
                    <DiscoveryShortcut icon="people-outline" label="Group classes" hint="Browse open batches" onPress={() => router.push("/browse-batches" as never)} />
                    <DiscoveryShortcut icon="heart-outline" label="Your shortlist" hint="Revisit saved tutors" onPress={() => router.push("/saved-tutors" as never)} />
                  </View>
                </>
              )}
              <View className="flex-row items-center justify-between gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-heading font-semibold text-text-primary">{filtering ? "Your results" : "Explore tutors"}</Text>
                  <Text className="text-caption text-text-secondary mt-1">{selectedSubject ?? "Find support for your next step"}</Text>
                </View>
                {!tutorsLoading && !directoryError && (
                  <Text accessibilityLiveRegion="polite" className="text-caption text-text-secondary">
                    {visibleTutors.length} {visibleTutors.length === 1 ? "tutor" : "tutors"}
                  </Text>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            tutorsLoading ? <DiscoveryLoading /> : directoryError ? (
              <View className="rounded-hero bg-surface border border-border p-6 gap-3">
                <Ionicons name="cloud-offline-outline" size={28} color={colors.brand.primary} />
                <Text accessibilityRole="alert" className="text-heading text-text-primary">Couldn’t load tutors</Text>
                <Text className="text-body-sm text-text-secondary">Check your connection and try again.</Text>
                <PrimaryButton label="Try again" onPress={() => setRetry(n => n + 1)} />
              </View>
            ) : (
              <View className="rounded-hero bg-surface border border-border p-6 gap-3">
                <Ionicons name="search-outline" size={28} color={colors.brand.primary} />
                <Text className="text-heading text-text-primary">{filtering ? "No matching tutors" : "No tutors available yet"}</Text>
                <Text className="text-body-sm text-text-secondary">
                  {filtering ? "Try a different subject, name or location." : "Tutors appear here once their profiles are approved and they have availability."}
                </Text>
                {filtering && <PrimaryButton label="Clear filters" variant="ghost" onPress={clearFilters} />}
              </View>
            )
          }
          renderItem={({ item: tutor }) => (
            <TutorCard
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
                subscriptionTier: tutor.subscriptionTier,
              })}
              variant="wide"
            />
          )}
        />
      </Animated.View>
      <BottomNav role="student" current="/student-home" tone="light" />
    </ScreenLayout>
  );
}

function TutorSeparator() {
  return <View className="h-4" />;
}

function SubjectFilter({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({ haptic: false });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`min-h-11 rounded-pill border px-4 py-3 flex-row items-center justify-center gap-1.5 ${selected ? "bg-primary border-primary" : "bg-surface border-border"}`}
    >
      {selected && <Ionicons name="checkmark" size={14} color={colors.text.inverse} />}
      <Text className={`text-caption font-medium ${selected ? "text-text-inverse" : "text-text-secondary"}`}>{label}</Text>
    </AnimatedPressable>
  );
}

function DiscoveryShortcut({ icon, label, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-1 rounded-card bg-surface border border-border p-4"
    >
      <View className="w-9 h-9 rounded-card bg-primary-light items-center justify-center mb-3">
        <Ionicons name={icon} size={18} color={colors.brand.primary} />
      </View>
      <Text className="text-body font-semibold text-text-primary">{label}</Text>
      <Text className="text-caption text-text-secondary mt-1">{hint}</Text>
    </AnimatedPressable>
  );
}

function DiscoveryLoading() {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading tutors" accessibilityState={{ busy: true }} className="gap-4">
      {[0, 1].map(n => (
        <View key={n} className="rounded-card bg-surface border border-border p-5 gap-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-pill" />
            <View className="flex-1 gap-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></View>
          </View>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </View>
      ))}
    </View>
  );
}
