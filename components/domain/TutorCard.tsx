/**
 * TutorCard — listing card for a single tutor.
 *
 * Two variants:
 *   - `wide`     : full-width card with a 160h hero placeholder, save
 *                  heart top-right, name + rating + city + price.
 *                  Used in vertical lists (search results, profile).
 *   - `compact-h`: 200px-wide rail card for horizontal carousels
 *                  (Discover, "Similar tutors").
 *
 * The card renders the avatar via the shared `<Avatar>` primitive
 * (which falls back to initials until Supabase Storage uploads ship).
 * Verified tutors get a green check-circle badge top-right of the
 * avatar.
 *
 * Motion:
 *   - The outer card uses `usePressScale` at 0.98 (`cardPressed`) so
 *     the whole card visibly responds to a tap.
 *   - The save/heart icon button extracts to a `HeartSaveButton` sub-
 *     component so it can run a 0.85 press scale + a one-shot
 *     "pop" scale sequence (1 → 1.25 → 1) on each toggle. The icon
 *     name still flips `heart-outline` ↔ `heart`; the pop is layered
 *     on top.
 *
 * **Note on the placeholder image:** Today the hero block is a
 * tinted surface rectangle (no images — we have no image-storage
 * pipeline yet). When Supabase Storage lands, swap the `<View>` for
 * an `<Image>` and pass `tutor.photoUrl` to it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedPressable, usePressScale } from '@/components/motion';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { motion } from '@/lib/motion';
import { formatNpr, type TutorProfile } from '@/lib/mock/tutors';

// ─── Props ───────────────────────────────────────────────────────────────────

export type TutorCardProps = {
  tutor: TutorProfile;
  variant?: 'wide' | 'compact-h';
  /** Optional press handler (e.g. navigate to `tutor/[id]`).
   *  Defaults to navigating to `/tutor/${tutor.id}` if omitted. */
  onPress?: () => void;
  /** Optional save/heart toggle handler. If omitted, the heart is hidden. */
  onSaveToggle?: () => void;
  /** Saved-state — drives the heart icon's fill colour. */
  saved?: boolean;
  /** Extra Tailwind classes appended to the outer wrapper. */
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TutorCard({
  tutor,
  variant = 'wide',
  onPress,
  onSaveToggle,
  saved = false,
  className = '',
}: TutorCardProps) {
  const router = useRouter();

  // Default navigation: go to the tutor's detail page.
  // Callers can override by passing their own `onPress`.
  const handlePress = onPress ?? (() => {
    router.push({ pathname: '/tutor/[id]', params: { id: tutor.id } } as any);
  });

  if (variant === 'compact-h') {
    return (
      <CompactCard tutor={tutor} onPress={handlePress} className={className} />
    );
  }
  return (
    <WideCard
      tutor={tutor}
      onPress={handlePress}
      onSaveToggle={onSaveToggle}
      saved={saved}
      className={className}
    />
  );
}

// ─── Heart save button ───────────────────────────────────────────────────────

function HeartSaveButton({
  saved,
  onSaveToggle,
}: {
  saved: boolean;
  onSaveToggle: () => void;
}) {
  // `pressed` covers press-in scale-down; `pop` runs once per tap as a
  // little "burst" the user feels even when the card itself is also
  // being scaled.
  const pressed = useSharedValue(0);
  const pop = useSharedValue(0);

  const handlePress = useCallback(() => {
    pop.value = withSequence(
      withSpring(1, motion.spring.pop),
      withSpring(0, motion.spring.gentle)
    );
    onSaveToggle();
  }, [onSaveToggle, pop]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Compose: idle = 1; press = 0.85; pop adds up to +0.25.
    return {
      transform: [
        { scale: 1 - pressed.value * 0.15 + pop.value * 0.25 },
      ],
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Unsave tutor' : 'Save tutor'}
      hitSlop={8}
      onPress={handlePress}
      onPressIn={() => {
        pressed.value = withSpring(1, motion.spring.press);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motion.spring.press);
      }}
      style={animatedStyle}
      className="absolute top-3 right-3 h-9 w-9 rounded-pill bg-surface items-center justify-center"
    >
      <Ionicons
        color={saved ? colors.semantic.danger : colors.text.muted}
        name={saved ? 'heart' : 'heart-outline'}
        size={18}
      />
    </AnimatedPressable>
  );
}

// ─── Wide variant ────────────────────────────────────────────────────────────

function WideCard({
  tutor,
  onPress,
  onSaveToggle,
  saved,
  className,
}: {
  tutor: TutorProfile;
  onPress?: () => void;
  onSaveToggle?: () => void;
  saved: boolean;
  className: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${tutor.fullName}'s profile`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`rounded-card bg-surface border border-border overflow-hidden ${className}`}
    >
      {/* Info block — no hero/cover panel, content starts immediately */}
      <View className="p-4 gap-2">
        <View className="flex-row items-center gap-2">
          <Avatar name={tutor.fullName} imageUri={tutor.photoUrl} size={36} />
          <View className="flex-1">
            <View className="flex-row items-center gap-1">
              <Text
                className="text-card-title text-text-primary flex-1"
                numberOfLines={1}
              >
                {tutor.fullName}
              </Text>
              {tutor.isVerifiedProfessional ? (
                <View className="-ml-0.5">
                  <Ionicons
                    color={colors.brand.verification}
                    name="checkmark-circle"
                    size={16}
                  />
                </View>
              ) : null}
            </View>
            <Text
              className="text-caption text-text-secondary"
              numberOfLines={1}
            >
              {tutor.headline}
            </Text>
          </View>
        </View>

        {/* Subject pills — compact horizontal scroll */}
        <View className="flex-row flex-wrap gap-1.5">
          {tutor.subjects.slice(0, 3).map((subject) => (
            <View
              key={subject}
              className="px-2 py-0.5 rounded-pill bg-amber/10"
            >
              <Text className="text-micro text-amber">{subject}</Text>
            </View>
          ))}
          {tutor.subjects.length > 3 && (
            <View className="px-2 py-0.5 rounded-pill bg-surface border border-border">
              <Text className="text-micro text-text-muted">
                +{tutor.subjects.length - 3}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons color={colors.brand.accent} name="star" size={12} />
            <Text className="text-caption text-text-primary">
              {tutor.rating.toFixed(1)}
            </Text>
            <Text className="text-caption text-text-muted">
              ({tutor.reviewCount})
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons
              color={colors.text.muted}
              name="location-outline"
              size={12}
            />
            <Text className="text-caption text-text-secondary">
              {tutor.location.city}
            </Text>
          </View>
        </View>

        <Text className="text-button text-text-primary mt-1">
          {formatNpr(tutor.monthlyRateNpr)}
          <Text className="text-caption text-text-muted"> /mo</Text>
        </Text>
      </View>
    </AnimatedPressable>
  );
}

// ─── Compact-horizontal variant ──────────────────────────────────────────────

function CompactCard({
  tutor,
  onPress,
  className,
}: {
  tutor: TutorProfile;
  onPress?: () => void;
  className: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${tutor.fullName}'s profile`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`w-[200px] rounded-card bg-surface border border-border overflow-hidden ${className}`}
    >
      <View className="p-3 gap-1">
        <View className="flex-row items-center gap-1">
          <Text
            className="text-card-title text-text-primary flex-1"
            numberOfLines={1}
          >
            {tutor.fullName}
          </Text>
        </View>
        <Text
          className="text-caption text-text-secondary"
          numberOfLines={2}
        >
          {tutor.headline}
        </Text>
        <View className="flex-row items-center gap-1 mt-1">
          <Ionicons color={colors.brand.accent} name="star" size={11} />
          <Text className="text-micro text-text-primary">
            {tutor.rating.toFixed(1)}
          </Text>
          <Text className="text-micro text-text-muted">
            · {tutor.location.city}
          </Text>
        </View>
        <Text className="text-button-sm text-text-primary mt-1">
          {formatNpr(tutor.monthlyRateNpr)}
          <Text className="text-caption text-text-muted"> /mo</Text>
        </Text>
      </View>
    </AnimatedPressable>
  );
}
