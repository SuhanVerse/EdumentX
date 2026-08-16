/**
 * EdumentX — Tutor Details Screen
 *
 * A single, continuous, scrollable tutor profile page with 7 sections:
 *   1. Header / Cover — back, fav, share, avatar, name, verified badge,
 *      location + distance, subject pills, 3-stat row
 *   2. Pricing — 1-to-1 vs Group Batch side-by-side cards
 *   3. Session Board — session cards, capacity bar, empty-slot CTA
 *   4. About — expandable bio + credentials
 *   5. Demo Lesson — video card with play button
 *   6. Reviews & Ratings — star breakdown, category bars, review list
 *   7. Sticky footer CTA — "Enroll with [Name]" pinned to viewport
 *
 * All styles use EdumentX design tokens (tailwind.config.js).
 * All data is prop-driven via the TutorProfile domain type.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { Avatar , getInitials } from "@/components/ui/Avatar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { VideoViewerModal } from "@/components/ui/VideoViewer";
import { AnimatedPressable, usePressScale, useShake } from "@/components/motion";
import { motion } from "@/lib/motion";
import { colors } from "@/constants/colors";
import {
  type CategoryRatings,
  type TutorProfile,
  type TutorSession,
  type Review,
} from "@/lib/tutor/types";
import { fetchTutorProfile } from "@/services/tutors/dataSource";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { getReviewRepository } from "@/services/enrollments/reviewDataSource";
import { getSavedTutorsRepository } from "@/services/savedTutors/dataSource";
import { useAuthStore } from "@/store/authStore";
import {
  type AvailabilitySnapshot,
  type Batch,
  type Enrollment,
  type EnrollmentRequest,
  type WeeklyAvailability,
  DEFAULT_AVAILABILITY,
} from "@/services/enrollments/types";
import { computeBookedMap } from "@/services/enrollments/derived";
import { computePendingMap, type PendingMap } from "@/services/enrollments/pending";
import { StudentAvailabilityGrid } from "@/components/domain/StudentAvailabilityGrid";

// ═══════════════════════════════════════════════════════════════════════════════
// Section Spacing
// ═══════════════════════════════════════════════════════════════════════════════

const SECTION_GAP = "mb-8";
const SECTION_PADDING = "px-6";

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const nprFormat = new Intl.NumberFormat("en-NP");

function formatNprShort(amount: number): string {
  if (amount >= 1000) return `Rs ${nprFormat.format(amount)}`;
  return `Rs ${amount}`;
}

function StarIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <Ionicons
      name={filled ? "star" : "star-outline"}
      size={size}
      color={filled ? colors.brand.accent : colors.text.muted}
    />
  );
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon key={s} filled={s <= full || (s === full + 1 && hasHalf)} size={size} />
      ))}
    </View>
  );
}

const CATEGORY_KEYS = [
  "teaching",
  "punctuality",
  "communication",
  "knowledge",
  "overall",
] as const;

/**
 * Merge live review data over a fetched profile. The profile doc
 * only mirrors aggregates (written transactionally by submitReview),
 * and legacy profiles predate the fields entirely — the reviews
 * collection (`reviews/{tutorUid}/reviews`) is the canonical source.
 * When the live list is empty we keep the profile's values as-is
 * (so the screen never flashes zeros while the snapshot is in
 * flight).
 */
function mergeLiveReviews(
  profile: TutorProfile,
  liveReviews: Review[],
): TutorProfile {
  if (liveReviews.length === 0) return profile;

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const categorySums: Partial<CategoryRatings> = {};
  let categoryCount = 0;
  let ratingSum = 0;

  for (const r of liveReviews) {
    ratingSum += r.rating;
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    breakdown[star] += 1;
    if (r.categoryRatings) {
      for (const key of CATEGORY_KEYS) {
        categorySums[key] =
          (categorySums[key] ?? 0) + r.categoryRatings[key];
      }
      categoryCount += 1;
    }
  }

  // Category averages only when at least one review carried the
  // per-axis scores; otherwise keep the profile mirror's values.
  const categoryRatings: CategoryRatings = {
    ...profile.categoryRatings,
  };
  if (categoryCount > 0) {
    for (const key of CATEGORY_KEYS) {
      categoryRatings[key] = (categorySums[key] ?? 0) / categoryCount;
    }
  }

  return {
    ...profile,
    rating: ratingSum / liveReviews.length,
    reviewCount: liveReviews.length,
    reviewBreakdown: breakdown,
    categoryRatings,
    reviews: liveReviews,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════

export function TutorDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const isSaved = !!id && savedIds.includes(id);

  function handleSaveToggle() {
    const uid = user?.uid;
    if (!uid || !id) return;
    // Optimistic flip — the onSnapshot round-trip reconciles if the
    // write fails.
    setSavedIds((prev) =>
      isSaved
        ? prev.filter((x) => x !== id)
        : prev.includes(id)
          ? prev
          : [...prev, id],
    );
    getSavedTutorsRepository()
      .toggleSavedTutor(uid, id, isSaved)
      .catch((err) =>
        console.warn("TutorDetailsScreen: save toggle failed", err),
      );
  }
  const [bioExpanded, setBioExpanded] = useState(false);
  const [demoVideoVisible, setDemoVideoVisible] = useState(false);

  // Live availability + bookedMap for the new "Weekly availability"
  // section between the Session Board and the About section.
  // Students see the same Booked state tutors see — the
  // `enrollments` + `batches` rules allow any signed-in user to
  // read a tutor's roster.
  const repo = getEnrollmentRepository();
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    DEFAULT_AVAILABILITY,
  );
  const [bookedMap, setBookedMap] = useState<ReturnType<
    typeof computeBookedMap
  > | null>(null);

  // Phase 1 grid redesign — track the student's selected slots
  // (multi-select) and the tutor's open requests so the grid can
  // render the amber border-2 ring on Selected cells and the
  // hourglass overlay on Pending cells. The selection is purely
  // visual — the student types their preferred days/times into the
  // sheet's `schedule` text field. Nothing about the selection is
  // sent to the tutor.
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  // Live reviews — the canonical source for rating, count, breakdown
  // and the review list (the fetched profile only mirrors
  // aggregates). Merged over the profile via `mergeLiveReviews`.
  const [reviews, setReviews] = useState<Review[]>([]);

  // Fetch the tutor profile from Firestore on mount
  useEffect(() => {
    if (!id) {
      setTutor(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    fetchTutorProfile(id)
      .then((profile) => {
        setTutor(profile);
      })
      .catch((err) => {
        console.warn("TutorDetailsScreen: fetch failed", err);
        setTutor(null);
      })
      .finally(() => setProfileLoading(false));
  }, [id]);

  // Live reviews subscription — drives the Reviews & Ratings section
  // and the header stats straight from the reviews collection.
  useEffect(() => {
    if (!id) return;
    const unsub = getReviewRepository().subscribeReviews(
      id,
      (list) => setReviews(list),
      (err) =>
        console.warn(
          "TutorDetailsScreen: reviews subscribe failed",
          err,
        ),
    );
    return unsub;
  }, [id]);

  // Overlay the live reviews onto the fetched profile. Falls back to
  // the profile's own (mirrored) fields while the snapshot is in
  // flight or when there are no reviews yet.
  const displayTutor = useMemo(
    () => (tutor ? mergeLiveReviews(tutor, reviews) : tutor),
    [tutor, reviews],
  );

  // Live saved-tutors subscription — the heart mirrors the
  // `savedTutors` map on the student's own profile doc, so it stays
  // in lock-step with the Saved Tutors list screen.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = getSavedTutorsRepository().subscribeSavedTutorIds(
      uid,
      setSavedIds,
      (err) =>
        console.warn(
          "TutorDetailsScreen: saved-tutors subscribe failed",
          err,
        ),
    );
    return unsub;
  }, [user?.uid]);

  // Live availability subscription. The repo emits
  // `{ availability, enrolledCount, studentCapacity }`; we only
  // need the availability grid for the time list.
  useEffect(() => {
    if (!id) return;
    const unsub = repo.subscribeAvailability(
      id,
      (snap: AvailabilitySnapshot) => {
        setAvailability(snap.availability ?? DEFAULT_AVAILABILITY);
      },
      (err) =>
        console.warn("TutorDetailsScreen: availability subscribe failed", err),
    );
    return unsub;
  }, [id, repo]);

  // Live enrollments + batches — together they build the BookedMap.
  // Students can read a tutor's roster (rules allow it) so they
  // know which slots are taken before requesting.
  useEffect(() => {
    if (!id) return;
    let latestEnrollments: Enrollment[] = [];
    let latestBatches: Batch[] = [];
    const recompute = () =>
      setBookedMap(computeBookedMap(latestEnrollments, latestBatches));
    const unsubE = repo.subscribeEnrollments(
      id,
      (list) => {
        latestEnrollments = list;
        recompute();
      },
      (err) =>
        console.warn("TutorDetailsScreen: enrollments subscribe failed", err),
    );
    const unsubB = repo.subscribeBatches(
      id,
      (list) => {
        latestBatches = list;
        recompute();
      },
      (err) =>
        console.warn("TutorDetailsScreen: batches subscribe failed", err),
    );
    return () => {
      unsubE();
      unsubB();
    };
  }, [id, repo]);

  // Live enrollment requests — Phase 1 grid redesign. We need the
  // open requests to overlay an hourglass icon + count badge on
  // any slot another student has asked about. The repo's
  // `subscribeRequests` already returns the full list (pending +
  // historical); `computePendingMap` filters to the ones still
  // waiting on a decision.
  //
  // Defensive retry — on a fresh app launch the auth token may
  // not be available the instant this effect runs, and Firestore
  // can surface `[firestore/permission-denied]` if `request.auth`
  // is null when the LIST rule fires. We detach the failed
  // listener and re-subscribe once after 1.5 s — most of the time
  // the second attempt succeeds because the auth listener has
  // caught up by then. The screen still renders fine without the
  // overlay; this just gives the pending-hourglass a chance to
  // appear when other students have open requests.
  useEffect(() => {
    if (!id) return;
    let unsub = (): void => {};
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      attempt += 1;
      unsub = repo.subscribeRequests(
        id,
        (list) => setRequests(list),
        (err) => {
          console.warn("TutorDetailsScreen: requests subscribe failed", err);
          // Detach the broken listener and re-subscribe after 1.5 s.
          // Only retry once — a persistent rule failure should not
          // loop forever.
          unsub();
          unsub = () => {};
          if (attempt >= 2 || cancelled) return;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            attach();
          }, 1500);
        },
      );
    };

    attach();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsub();
    };
  }, [id, repo]);

  const pendingMap: PendingMap = useMemo(
    () => computePendingMap(requests),
    [requests],
  );

  // Toggle a slot key in the multi-select set. The selection is
  // purely visual — see the comment on `selectedSlotKeys` above.
  const toggleSlotKey = useCallback((key: string) => {
    setSelectedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlotKeys(new Set());
  }, []);

  // Enroll intent → the full-screen S-12 enrollment form. The
  // grid selection above is purely visual (the student typed their
  // candidate slots into the form), so tapping Enroll just carries
  // the tutor id and lets the form own the request.
  const openEnrollForm = useCallback(() => {
    if (!id) return;
    router.push({
      pathname: "/enroll",
      params: { tutorId: id },
    } as never);
  }, [id, router]);

  // ── Loading state ──
  if (profileLoading) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="text-body text-text-muted mt-4">
            Loading tutor profile…
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // ── Guard: no tutor found ──
  if (!tutor) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-outline" size={40} color={colors.text.muted} />
          <Text className="text-heading text-text-primary text-center mt-4">
            Tutor not found
          </Text>
          <Text className="text-body-sm text-text-muted text-center mt-2">
            This tutor profile could not be loaded.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 px-6 py-3 rounded-card bg-accent active:opacity-80"
          >
            <Text className="text-button font-semibold text-text-inverse">Go back</Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  // Non-null after the guards above; carries the live-review overlay.
  const effectiveTutor = displayTutor ?? tutor;

  return (
    <ScreenLayout variant="background">
      {/* Fixed top bar — stays in place while content scrolls underneath */}
      <TopBar
        isSaved={isSaved}
        onSaveToggle={handleSaveToggle}
        onBack={() => router.back()}
        shareMessage={`${effectiveTutor.fullName} — ${effectiveTutor.headline} · ${formatNprShort(
          effectiveTutor.monthlyRateNpr,
        )}/month on EdumentX`}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 128,
          paddingTop: 12,
        }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ═══ SECTION 1: Profile Header ═══ */}
        <ProfileHeader tutor={effectiveTutor} />

        {/* ═══ SECTION 2: Pricing ═══ */}
        <View className={SECTION_GAP}>
          <PricingSection
            tutor={effectiveTutor}
            onMessageTutor={() =>
              router.push({
                pathname: "/chat",
                params: {
                  peerId: tutor.id,
                  peerName: tutor.fullName,
                  peerAvatar: tutor.photoUrl ?? "",
                },
              } as never)
            }
          />
        </View>

        {/* ═══ SECTION 3: Session Board ═══ */}
        <View className={SECTION_GAP}>
          <SessionBoardSection
            tutor={effectiveTutor}
            onRequestSlot={openEnrollForm}
          />
        </View>

        {/* ═══ SECTION 3b: Weekly Availability (live) ═══ */}
        <View className={SECTION_GAP}>
          <AvailabilitySection
            availability={availability}
            bookedMap={bookedMap}
            pendingMap={pendingMap}
            selectedSlotKeys={selectedSlotKeys}
            onSlotToggle={toggleSlotKey}
            onClearSelection={clearSelection}
          />
        </View>

        {/* ═══ SECTION 4: About ═══ */}
        <View className={SECTION_GAP}>
          <AboutSection tutor={effectiveTutor} expanded={bioExpanded} onToggle={() => setBioExpanded(!bioExpanded)} />
        </View>

        {/* ═══ SECTION 5: Demo Lesson ═══ */}
        <View className={SECTION_GAP}>
          <DemoLessonSection
            tutor={effectiveTutor}
            onPlay={() => setDemoVideoVisible(true)}
          />
        </View>

        {/* ═══ SECTION 6: Reviews & Ratings ═══ */}
        <View>
          <ReviewsSection tutor={effectiveTutor} />
        </View>
      </ScrollView>

      {/* ═══ SECTION 7: Sticky Footer CTA ═══ */}
      <StickyFooter
        tutor={effectiveTutor}
        insets={insets}
        openSheet={openEnrollForm}
      />

      {/* ═══ Demo Video Modal ═══ */}
      <VideoViewerModal
        visible={demoVideoVisible}
        uri={effectiveTutor.demoVideoUrl ?? ""}
        label={`${effectiveTutor.fullName} — demo lesson`}
        onClose={() => setDemoVideoVisible(false)}
      />

    </ScreenLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1: Fixed Top Bar (back / like / share — stays above the scroll area)
// ═══════════════════════════════════════════════════════════════════════════════

function TopBar({
  isSaved,
  onSaveToggle,
  onBack,
  shareMessage,
}: {
  isSaved: boolean;
  onSaveToggle: () => void;
  onBack: () => void;
  shareMessage: string;
}) {
  return (
    <View className="px-5 pb-2 bg-background z-10">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={onBack} />
        <View className="flex-row gap-3">
          <IconButton
            iconName={isSaved ? "heart" : "heart-outline"}
            onPress={onSaveToggle}
            color={isSaved ? colors.semantic.danger : undefined}
          />
          <IconButton
            iconName="share-outline"
            onPress={() =>
              Share.share({ message: shareMessage }).catch(() => {
                // Share sheet dismissed / unsupported — nothing to do.
              })
            }
          />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1b: Profile Header (scrollable — avatar, name, stats)
// ═══════════════════════════════════════════════════════════════════════════════

function ProfileHeader({ tutor }: { tutor: TutorProfile }) {
  return (
    <View className="px-5 pt-3">
      {/* Avatar — no longer overlapping a cover. Sits naturally
          inside the content flow with a small accent border. */}
      <View className="flex-row items-start gap-4">
        <View className="relative">
          <Avatar
            name={tutor.fullName}
            imageUri={tutor.photoUrl}
            size={72}
            className="border-2 border-amber/30"
          />
          {/* Verified status dot */}
          {tutor.isVerifiedProfessional && (
            <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-pill bg-verification items-center justify-center border-2 border-background">
              <Ionicons name="shield-checkmark" size={12} color={colors.text.inverse} />
            </View>
          )}
        </View>

        {/* Name + verified badge inline */}
        <View className="flex-1 min-w-0 pt-1.5">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-heading text-text-primary flex-shrink"
              numberOfLines={1}
            >
              {tutor.fullName}
            </Text>
            {tutor.isVerifiedProfessional && (
              <Ionicons name="shield-checkmark" size={16} color={colors.brand.verification} />
            )}
          </View>
          {/* Headline — the tutor's one-line specialisation */}
          {!!tutor.headline && (
            <Text className="text-body text-text-secondary mt-0.5" numberOfLines={1}>
              {tutor.headline}
            </Text>
          )}
          <Text className="text-body-sm text-text-muted mt-0.5" numberOfLines={1}>
            @{tutor.username}
          </Text>
          {/* Location */}
          <View className="flex-row items-center gap-1 mt-1.5">
            <Ionicons name="location-outline" size={12} color={colors.text.muted} />
            <Text className="text-caption text-text-secondary" numberOfLines={1}>
              {tutor.location.neighborhood}, {tutor.location.city}
            </Text>
          </View>
        </View>
      </View>

      {/* Gender + subject pills */}
      <View className="flex-row flex-wrap gap-2 mt-4">
        {tutor.gender && (
          <View
            className="px-3 py-1.5 rounded-pill bg-accent-soft border border-accent/20 flex-row items-center gap-1.5"
          >
            <Ionicons name="person-outline" size={12} color={colors.brand.accent} />
            <Text className="text-caption text-accent font-medium">
              {tutor.gender.charAt(0).toUpperCase() + tutor.gender.slice(1)}
            </Text>
          </View>
        )}
        {tutor.subjects.map((subject) => (
          <View
            key={subject}
            className="px-3 py-1.5 rounded-pill bg-primary-light border border-border"
          >
            <Text className="text-caption text-primary font-medium">{subject}</Text>
          </View>
        ))}
      </View>

      {/* Bio snippet — 2 lines, full bio lives in the About section */}
      {!!tutor.bio && (
        <Text className="text-body-sm text-text-secondary leading-relaxed mt-4" numberOfLines={2}>
          {tutor.bio}
        </Text>
      )}

      {/* 2-stat row */}
      <View className="mt-4 flex-row bg-surface border border-border rounded-card overflow-hidden">
        <StatCell
          icon="star"
          value={tutor.rating.toFixed(1)}
          label={`${tutor.reviewCount} reviews`}
          iconColor={colors.brand.accent}
          first
        />
        <StatCell
          icon="briefcase-outline"
          value={`${tutor.yearsExperience}y`}
          label="Experience"
          iconColor={colors.brand.primary}
        />
      </View>
    </View>
  );
}

function StatCell({
  icon,
  value,
  label,
  iconColor,
  first = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconColor: string;
  first?: boolean;
}) {
  return (
    <View
      className={`flex-1 items-center py-3.5 px-2 ${!first ? "border-l border-border" : ""}`}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text className="text-card-title text-text-primary mt-1">{value}</Text>
      <Text className="text-micro text-text-muted mt-0.5">{label}</Text>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={12}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-touch self-start flex-row items-center gap-1"
    >
      <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
      <Text className="text-body text-text-primary">Back</Text>
    </AnimatedPressable>
  );
}

function IconButton({
  iconName,
  onPress,
  color,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="w-9 h-9 rounded-pill bg-surface border border-border items-center justify-center"
    >
      <Ionicons
        name={iconName}
        size={18}
        color={color ?? colors.text.muted}
      />
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2: Pricing
// ═══════════════════════════════════════════════════════════════════════════════

function PricingSection({
  tutor,
  onMessageTutor,
}: {
  tutor: TutorProfile;
  onMessageTutor: () => void;
}) {
  return (
    <View className={SECTION_PADDING}>
      <Text className="text-section-title font-semibold text-text-primary mb-3">
        Pricing
      </Text>

      <View className="flex-row gap-3">
        {/* 1-to-1 card */}
        <View className="flex-1 bg-surface border border-border rounded-card p-4">
          <View className="w-10 h-10 rounded-lg bg-accent-soft items-center justify-center mb-3">
            <Ionicons name="person-outline" size={20} color={colors.brand.accent} />
          </View>
          <Text className="text-caption text-text-muted uppercase tracking-wider">
            1-to-1
          </Text>
          <Text className="text-heading text-text-primary font-bold mt-1">
            {formatNprShort(tutor.monthlyRateNpr)}
          </Text>
          <Text className="text-caption text-text-muted">/month</Text>
        </View>

        {/* Group Batch — ask the tutor about group rates */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask about group batches"
          onPress={onMessageTutor}
          className="flex-1 bg-surface border border-border rounded-card p-4 items-center justify-center active:opacity-70"
        >
          <View className="w-10 h-10 rounded-lg bg-accent-soft items-center justify-center mb-3">
            <Ionicons name="people-outline" size={20} color={colors.brand.accent} />
          </View>
          <Text className="text-caption text-text-muted uppercase tracking-wider">
            Group batch
          </Text>
          <Text className="text-caption text-text-muted text-center mt-2">
            Message to ask about rates
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Session Board
// ═══════════════════════════════════════════════════════════════════════════════

function SessionBoardSection({
  tutor,
  onRequestSlot,
}: {
  tutor: TutorProfile;
  onRequestSlot: () => void;
}) {
  const hasSessions = tutor.sessions.length > 0;
  const totalSlots = tutor.studentCapacity;
  const totalFilled = tutor.currentStudents;
  const fillPct = totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 0;

  const barColor =
    fillPct >= 100
      ? "bg-danger"
      : fillPct >= 80
        ? "bg-accent"
        : "bg-verification";

  return (
    <View className={SECTION_PADDING}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-section-title font-semibold text-text-primary">
          Session Board
        </Text>
        {hasSessions && (
          <View className="px-2.5 py-1 rounded-pill bg-primary-light">
            <Text className="text-caption text-primary font-medium">
              {tutor.sessions.length} slots
            </Text>
          </View>
        )}
      </View>
      <Text className="text-body-sm text-text-muted mb-4">
        Browse available slots and enroll in one that fits your schedule.
      </Text>

      {hasSessions ? (
        <>
          {/* Session cards */}
          <View className="gap-3">
            {tutor.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onEnroll={onRequestSlot}
              />
            ))}
          </View>

          {/* Empty slot CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={onRequestSlot}
            className="mt-3 flex-row items-center gap-3 p-4 border-2 border-dashed border-border rounded-card bg-surface active:opacity-70"
          >
            <View className="w-10 h-10 rounded-pill bg-accent-soft items-center justify-center">
              <Ionicons name="add-outline" size={22} color={colors.brand.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-card-title text-text-primary font-medium">
                Request an empty slot
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                Suggest a day and time that works for you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </Pressable>
        </>
      ) : (
        /* Empty state */
        <View className="bg-surface border border-border rounded-card p-6 items-center">
          <View className="w-12 h-12 rounded-pill bg-primary-light items-center justify-center mb-3">
            <Ionicons name="calendar-outline" size={22} color={colors.brand.primary} />
          </View>
          <Text className="text-card-title text-text-primary text-center font-medium">
            No sessions yet
          </Text>
          <Text className="text-body-sm text-text-secondary text-center mt-1">
            Sessions will appear here once the tutor creates them. Check back later or contact the tutor directly.
          </Text>
        </View>
      )}

      {/* Capacity progress bar */}
      <View className="mt-4 bg-surface border border-border rounded-card p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-card-title text-text-primary font-medium">
            Student capacity
          </Text>
          <Text className="text-caption text-text-secondary">
            {totalSlots > 0 ? `${totalFilled} of ${totalSlots} filled` : "No slots created yet"}
          </Text>
        </View>
        <View className="h-2 rounded-pill bg-background overflow-hidden">
          <View
            className={`h-full rounded-pill ${totalSlots > 0 ? barColor : "bg-surface-muted"}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </View>
      </View>
    </View>
  );
}

function SessionCard({
  session,
  onEnroll,
}: {
  session: TutorSession;
  onEnroll: () => void;
}) {
  const isPrivate = session.type === "private_batch";
  const fillPct = (session.seatsFilled / session.seatsTotal) * 100;

  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: "bg-verification-light", text: "text-success", label: "Open" },
    accepting: { bg: "bg-accent-soft", text: "text-accent", label: "Accepting" },
    full: { bg: "bg-danger-bg", text: "text-danger", label: "Full" },
  };
  const statusStyle = statusStyles[session.status];

  return (
    <View className="bg-surface border border-border rounded-card p-4">
      {/* Top row: type badge + status pill */}
      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-pill ${
            isPrivate ? "bg-ai-light" : "bg-verification-light"
          }`}
        >
          {isPrivate ? (
            <Ionicons name="lock-closed" size={13} color={colors.brand.ai} />
          ) : (
            <Ionicons name="people" size={13} color={colors.brand.verification} />
          )}
          <Text
            className={`text-micro font-semibold uppercase tracking-wider ${
              isPrivate ? "text-ai" : "text-success"
            }`}
          >
            {isPrivate ? "Private Batch" : "Public Batch"}
          </Text>
        </View>
        <View className={`px-2.5 py-0.5 rounded-pill ${statusStyle.bg}`}>
          <Text className={`text-micro font-semibold ${statusStyle.text}`}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      {/* Subject + name */}
      <Text className="text-card-title text-text-primary font-semibold">
        {session.subject} — {session.name}
      </Text>

      {/* Schedule */}
      <View className="flex-row items-center gap-1.5 mt-2">
        <Ionicons name="calendar-outline" size={13} color={colors.text.muted} />
        <Text className="text-body-sm text-text-secondary">{session.schedule}</Text>
      </View>

      {/* Seats */}
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="people-outline" size={13} color={colors.text.muted} />
          <Text className="text-caption text-text-secondary">
            {session.seatsFilled}/{session.seatsTotal} filled
          </Text>
        </View>
        {/* Mini progress bar */}
        <View className="flex-1 mx-3 h-1.5 rounded-pill bg-background overflow-hidden">
          <View
            className={`h-full rounded-pill ${fillPct >= 100 ? "bg-danger" : "bg-primary"}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEnroll}
          disabled={session.status === "full"}
          className={`px-3 py-1.5 rounded-pill ${
            session.status === "full"
              ? "bg-surface-muted"
              : "bg-primary active:opacity-80"
          }`}
        >
          <Text
            className={`text-micro font-semibold ${
              session.status === "full" ? "text-text-muted" : "text-white"
            }`}
          >
            {session.status === "full" ? "Full" : "Enroll"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3b: Weekly Availability (live) — Phase 1 grid redesign
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phase 1 — replaces the old `AvailabilityTimeList` (vertical
 * day-grouped list) with a polished, responsive 7×6 grid that
 * visually matches `WeeklyAvailabilityGrid`. The student can
 * tap exactly one Available slot; the grid reflects that with
 * the brand's amber border-2 over the green fill. Disabled taps
 * (Booked / Off cells) shake the grid to communicate "this one
 * isn't selectable" without changing the selection.
 *
 * Selection state lives at the screen level so it survives the
 * sheet open/close cycle. The `Clear` button in the section
 * header is the explicit UX for deselection; tap-again-to-deselect
 * is wired inside the grid for symmetry.
 *
 * The slot is only "officially" booked after the tutor accepts —
 * Booked (blue) is reserved for the post-accept state. While
 * pending (someone else asked), the cell renders Available with a
 * hourglass icon + count badge overlay.
 */
function AvailabilitySection({
  availability,
  bookedMap,
  pendingMap,
  selectedSlotKeys,
  onSlotToggle,
  onClearSelection,
}: {
  availability: WeeklyAvailability;
  bookedMap: ReturnType<typeof computeBookedMap> | null;
  pendingMap: PendingMap;
  selectedSlotKeys: ReadonlySet<string>;
  onSlotToggle: (slotKey: string) => void;
  onClearSelection: () => void;
}) {
  const { shake, animatedStyle: shakeStyle } = useShake({ amplitude: 6, duration: 60 });

  const handleDisabled = useCallback(() => {
    shake();
  }, [shake]);

  const selectionCount = selectedSlotKeys.size;

  return (
    <Animated.View style={shakeStyle} className={SECTION_PADDING}>
      {/* Header — title + Clear (when there's a selection) */}
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-section-title font-semibold text-text-primary">
          Weekly availability
        </Text>
        {selectionCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear slot selection"
            onPress={onClearSelection}
            className="px-2.5 py-1 rounded-pill bg-surface border border-border active:opacity-70"
          >
            <Text className="text-micro text-text-secondary font-medium">
              Clear ({selectionCount})
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text className="text-body-sm text-text-muted mb-4">
        Tap one or more available slots to mark candidates. When you
        send the request, type your preferred days and times in the
        message.
      </Text>

      {bookedMap == null ? (
        <View className="bg-surface border border-border rounded-card p-3 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="h-12 rounded-md bg-background"
              style={{ opacity: 0.6 }}
            />
          ))}
        </View>
      ) : (
        <StudentAvailabilityGrid
          availability={availability}
          bookedMap={bookedMap}
          pendingMap={pendingMap}
          selectedSlotKeys={selectedSlotKeys}
          onSlotToggle={onSlotToggle}
          onSlotDisabled={handleDisabled}
        />
      )}

      {/* Helper copy — short, beneath the grid */}
      <Text className="text-caption text-text-muted mt-3 leading-relaxed">
        Tap a <Text className="font-semibold text-verification">green</Text> slot
        to mark it. Blue slots are taken. Grey slots aren&apos;t open yet.
      </Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4: About
// ═══════════════════════════════════════════════════════════════════════════════

function AboutSection({
  tutor,
  expanded,
  onToggle,
}: {
  tutor: TutorProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  const COLLAPSED_LINES = 3;

  return (
    <View className={SECTION_PADDING}>
      <Text className="text-section-title font-semibold text-text-primary mb-3">
        About
      </Text>

      <View className="bg-surface border border-border rounded-card p-4">
        {/* Bio */}
        <Text
          className="text-body-sm text-text-secondary leading-relaxed"
          numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        >
          {tutor.bio || "No bio yet."}
        </Text>

        {/* Expand / collapse */}
        {tutor.bio && tutor.bio.length > 100 && (
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            className="mt-2 self-start"
          >
            <Text className="text-button-sm text-primary font-medium">
              {expanded ? "Show less" : "Read more"}
            </Text>
          </Pressable>
        )}

        {/* Quick details grid */}
        <View className="flex-row flex-wrap mt-4 pt-3 border-t border-border">
          {tutor.gradesTeaching.length > 0 && (
            <DetailRow
              icon="school-outline"
              label="Teaches"
              value={tutor.gradesTeaching.join(", ")}
            />
          )}
          {tutor.yearsExperience > 0 && (
            <DetailRow
              icon="briefcase-outline"
              label="Experience"
              value={`${tutor.yearsExperience} years`}
            />
          )}
          {tutor.gender ? (
            <DetailRow
              icon="person-outline"
              label="Gender"
              value={tutor.gender.charAt(0).toUpperCase() + tutor.gender.slice(1)}
            />
          ) : null}
          {tutor.phone ? (
            <DetailRow
              icon="call-outline"
              label="Phone"
              value={tutor.phone}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="w-1/2 flex-row items-center gap-2 mb-2.5">
      <Ionicons name={icon} size={14} color={colors.text.muted} />
      <View className="flex-1">
        <Text className="text-micro text-text-muted">{label}</Text>
        <Text className="text-caption text-text-primary font-medium" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5: Demo Lesson
// ═══════════════════════════════════════════════════════════════════════════════

function DemoLessonSection({
  tutor,
  onPlay,
}: {
  tutor: TutorProfile;
  onPlay: () => void;
}) {
  const hasDemo = !!tutor.demoVideoUrl;

  return (
    <View className={SECTION_PADDING}>
      <Text className="text-section-title font-semibold text-text-primary mb-3">
        Demo Lesson
      </Text>

      {hasDemo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play demo lesson"
          onPress={onPlay}
          className="bg-surface border border-border rounded-card overflow-hidden active:opacity-80"
        >
          {/* Video preview area — clean dark background with centered play button.
              Real video thumbnails were removed because the native module
              (expo-video-thumbnails) requires a dev-client rebuild. The play
              button is layered for visual depth. */}
          <View className="w-full h-40 items-center justify-center relative overflow-hidden bg-night">
            {/* Dim overlay */}
            <View className="absolute inset-0 bg-black/20" />

            {/* Play button — layered circles with a central play arrow */}
            <View className="w-16 h-16 rounded-pill bg-white/20 items-center justify-center">
              <View className="w-14 h-14 rounded-pill bg-white/30 items-center justify-center">
                <Ionicons name="play" size={30} color={colors.text.inverse} />
              </View>
            </View>
          </View>

          {/* Video info */}
          <View className="p-4">
            <Text className="text-card-title text-text-primary font-medium">
              Teaching demo
            </Text>
            <Text className="text-body-sm text-text-muted mt-1">
              See {tutor.fullName.split(" ")[0]}&apos;s teaching style in action
            </Text>
          </View>
        </Pressable>
      ) : (
        /* No video available */
        <View className="bg-surface border border-border rounded-card p-6 items-center">
          <View className="w-12 h-12 rounded-pill bg-ai-light items-center justify-center mb-3">
            <Ionicons name="videocam-outline" size={22} color={colors.brand.ai} />
          </View>
          <Text className="text-card-title text-text-primary text-center font-medium">
            No demo video available
          </Text>
          <Text className="text-body-sm text-text-secondary text-center mt-1">
            This tutor hasn&apos;t uploaded a demo lesson yet. You can still enroll and schedule a trial session.
          </Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6: Reviews & Ratings
// ═══════════════════════════════════════════════════════════════════════════════

function ReviewsSection({ tutor }: { tutor: TutorProfile }) {
  const hasReviews = tutor.reviews.length > 0;
  const [showAllReviews, setShowAllReviews] = useState(false);
  const displayedReviews = showAllReviews ? tutor.reviews : tutor.reviews.slice(0, 3);

  return (
    <View className={SECTION_PADDING}>
      <Text className="text-section-title font-semibold text-text-primary mb-4">
        Reviews & Ratings
      </Text>

      {hasReviews ? (
        <>
          {/* Score + star breakdown row */}
          <View className="flex-row gap-4 mb-5">
            <View className="items-center justify-center w-24 h-24 rounded-card bg-surface border border-border">
              <Text className="text-display text-text-primary font-bold">
                {tutor.rating.toFixed(1)}
              </Text>
              <StarRow rating={tutor.rating} size={11} />
              <Text className="text-micro text-text-muted mt-0.5">
                {tutor.reviewCount} reviews
              </Text>
            </View>

            {/* Star breakdown bars */}
            <View className="flex-1 justify-center gap-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = tutor.reviewBreakdown[star];
                const maxCount = Math.max(
                  ...Object.values(tutor.reviewBreakdown),
                  1
                );
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <View key={star} className="flex-row items-center gap-2">
                    <Text className="text-caption text-text-secondary w-4">{star}</Text>
                    <Ionicons name="star" size={10} color={colors.brand.accent} />
                    <View className="flex-1 h-1.5 rounded-pill bg-surface-muted overflow-hidden">
                      <View
                        className="h-full rounded-pill bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                    <Text className="text-micro text-text-muted w-6 text-right">
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Category ratings */}
          <View className="bg-surface border border-border rounded-card p-4 mb-5">
            <Text className="text-card-title text-text-primary font-medium mb-3">
              Rating breakdown
            </Text>
            <View className="gap-3">
              {(
                [
                  { key: "teaching", label: "Teaching" },
                  { key: "punctuality", label: "Punctuality" },
                  { key: "communication", label: "Communication" },
                  { key: "knowledge", label: "Knowledge" },
                  { key: "overall", label: "Overall" },
                ] as const
              ).map(({ key, label }) => {
                const score = tutor.categoryRatings[key as keyof typeof tutor.categoryRatings];
                return (
                  <View key={key}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-body-sm text-text-secondary">{label}</Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-body-sm text-text-primary font-medium">
                          {score.toFixed(1)}
                        </Text>
                        <Ionicons name="star" size={10} color={colors.brand.accent} />
                      </View>
                    </View>
                    <View className="h-2 rounded-pill bg-surface-muted overflow-hidden">
                      <View
                        className="h-full rounded-pill bg-primary"
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Individual reviews */}
          <View className="gap-4">
            {displayedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>

          {tutor.reviews.length > 3 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAllReviews(!showAllReviews)}
              className="mt-4 self-center px-6 py-2.5 bg-surface border border-border rounded-pill active:opacity-70"
            >
              <Text className="text-button-sm text-primary font-medium">
                {showAllReviews
                  ? "Show less"
                  : `Show all ${tutor.reviews.length} reviews`}
              </Text>
            </Pressable>
          )}
        </>
      ) : (
        /* Empty reviews state */
        <View className="bg-surface border border-border rounded-card p-6 items-center">
          <View className="w-12 h-12 rounded-pill bg-accent-soft items-center justify-center mb-3">
            <Ionicons name="star-outline" size={22} color={colors.brand.accent} />
          </View>
          <Text className="text-card-title text-text-primary text-center font-medium">
            No reviews yet
          </Text>
          <Text className="text-body-sm text-text-secondary text-center mt-1">
            Reviews will appear here once students enroll and rate their experience with this tutor.
          </Text>
        </View>
      )}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View className="bg-surface border border-border rounded-card p-4">
      {/* Header: avatar + name + rating + time */}
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-pill bg-surface-muted items-center justify-center">
          {review.reviewerAvatar ? (
            <Image
              source={{ uri: review.reviewerAvatar }}
              className="w-10 h-10 rounded-pill"
            />
          ) : (
            <Text className="text-caption text-text-primary font-medium">
              {getInitials(review.reviewerName)}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-card-title text-text-primary font-medium">
              {review.reviewerName}
            </Text>
            {review.verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.brand.verification}
              />
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            <StarRow rating={review.rating} size={10} />
            <Text className="text-micro text-text-muted">{review.timestamp}</Text>
          </View>
        </View>
      </View>

      {/* Comment */}
      <Text className="text-body-sm text-text-secondary mt-3 leading-relaxed">
        {review.comment}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7: Sticky Footer CTA
// ═══════════════════════════════════════════════════════════════════════════════

function StickyFooter({
  tutor,
  insets,
  openSheet,
}: {
  tutor: TutorProfile;
  insets: { bottom: number };
  openSheet: () => void;
}) {
  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-5 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="flex-row items-center gap-4">
        {/* Price summary */}
        <View className="flex-1">
          <Text className="text-body-sm text-text-muted">1-to-1 monthly</Text>
          <Text className="text-heading text-text-primary font-bold">
            {formatNprShort(tutor.monthlyRateNpr)}
          </Text>
          <Text className="text-micro text-text-muted">/month</Text>
        </View>

        {/* Enroll button — always visible. The student may have
            *  selected candidate slots on the grid above, but the
            *  request itself is captured in the sheet (the
            *  schedule + message + dates). The button is the
            *  single entry point to the sheet. */}
        <View className="flex-1">
          <PrimaryButton
            label={`Enroll with ${tutor.fullName.split(" ")[0]}`}
            onPress={openSheet}
            variant="accent"
            size="md"
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
}
