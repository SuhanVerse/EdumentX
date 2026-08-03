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
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { Avatar } from "@/components/ui/Avatar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { VideoViewerModal } from "@/components/ui/VideoViewer";
import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";
import { colors } from "@/constants/colors";
import { getInitials } from "@/components/ui/Avatar";
import {
  type TutorProfile,
  type TutorSession,
  type Review,
} from "@/lib/tutor/types";
import { fetchTutorProfile } from "@/services/tutors/dataSource";

// ═══════════════════════════════════════════════════════════════════════════════
// Section Spacing
// ═══════════════════════════════════════════════════════════════════════════════

const SECTION_GAP = "mb-8";
const SECTION_PADDING = "px-5";

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

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════

export function TutorDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [demoVideoVisible, setDemoVideoVisible] = useState(false);

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

  // ── Loading state ──
  if (profileLoading) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.primary ?? "#26302B"} />
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

  return (
    <ScreenLayout variant="background">
      {/* Fixed top bar — stays in place while content scrolls underneath */}
      <TopBar
        isSaved={isSaved}
        onSaveToggle={() => setIsSaved(!isSaved)}
        onBack={() => router.back()}
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
        <ProfileHeader tutor={tutor} />

        {/* ═══ SECTION 2: Pricing ═══ */}
        <View className={SECTION_GAP}>
          <PricingSection tutor={tutor} />
        </View>

        {/* ═══ SECTION 3: Session Board ═══ */}
        <View className={SECTION_GAP}>
          <SessionBoardSection tutor={tutor} />
        </View>

        {/* ═══ SECTION 4: About ═══ */}
        <View className={SECTION_GAP}>
          <AboutSection tutor={tutor} expanded={bioExpanded} onToggle={() => setBioExpanded(!bioExpanded)} />
        </View>

        {/* ═══ SECTION 5: Demo Lesson ═══ */}
        <View className={SECTION_GAP}>
          <DemoLessonSection
            tutor={tutor}
            onPlay={() => setDemoVideoVisible(true)}
          />
        </View>

        {/* ═══ SECTION 6: Reviews & Ratings ═══ */}
        <View>
          <ReviewsSection tutor={tutor} />
        </View>
      </ScrollView>

      {/* ═══ SECTION 7: Sticky Footer CTA ═══ */}
      <StickyFooter tutor={tutor} insets={insets} />

      {/* ═══ Demo Video Modal ═══ */}
      <VideoViewerModal
        visible={demoVideoVisible}
        uri={tutor.demoVideoUrl ?? ""}
        label={`${tutor.fullName} — demo lesson`}
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
}: {
  isSaved: boolean;
  onSaveToggle: () => void;
  onBack: () => void;
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
          <IconButton iconName="share-outline" onPress={() => Alert.alert("Share", "Share feature coming soon.")} />
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
              <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
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

function PricingSection({ tutor }: { tutor: TutorProfile }) {
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

        {/* Group Batch — placeholder until pricing is finalised */}
        <View className="flex-1 bg-surface border border-border rounded-card p-4 items-center justify-center opacity-60">
          <Ionicons name="people-outline" size={24} color={colors.text.muted} />
          <Text className="text-caption text-text-muted text-center mt-2">
            Group batch coming soon
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Session Board
// ═══════════════════════════════════════════════════════════════════════════════

function SessionBoardSection({ tutor }: { tutor: TutorProfile }) {
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
              <SessionCard key={session.id} session={session} />
            ))}
          </View>

          {/* Empty slot CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert("Create session", "Session creation coming soon.")}
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
        <View className="h-2 rounded-full bg-background overflow-hidden">
          <View
            className={`h-full rounded-full ${totalSlots > 0 ? barColor : "bg-surface-muted"}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </View>
      </View>
    </View>
  );
}

function SessionCard({ session }: { session: TutorSession }) {
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
      {/* Top row: type + status */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5">
          {isPrivate ? (
            <Ionicons name="lock-closed" size={14} color={colors.brand.primary} />
          ) : (
            <Ionicons name="people" size={14} color={colors.brand.primary} />
          )}
          <Text className="text-caption text-text-secondary font-medium uppercase tracking-wider">
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
        <View className="flex-1 mx-3 h-1.5 rounded-full bg-background overflow-hidden">
          <View
            className={`h-full rounded-full ${fillPct >= 100 ? "bg-danger" : "bg-primary"}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert("Enroll", "Enrollment coming soon.")}
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
  const BIO_LINE_HEIGHT = 22;
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
                <Ionicons name="play" size={30} color="#FFFFFF" />
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
                    <View className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <View
                        className="h-full rounded-full bg-accent"
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
                    <View className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <View
                        className="h-full rounded-full bg-primary"
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
}: {
  tutor: TutorProfile;
  insets: { bottom: number };
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

        {/* Enroll button */}
        <View className="flex-1">
          <PrimaryButton
            label={`Enroll with ${tutor.fullName.split(" ")[0]}`}
            onPress={() => Alert.alert("Enroll", "Enrollment flow coming soon.")}
            variant="accent"
            size="md"
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
}
