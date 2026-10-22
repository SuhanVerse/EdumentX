/** Tutor listing cards for vertical results and horizontal discovery rails. */
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AnimatedPressable, usePressScale } from '@/components/motion';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { motion } from '@/lib/motion';
import { formatNpr, type TutorProfile } from '@/lib/mock/tutors';

export type TutorCardProps = {
  tutor: TutorProfile;
  variant?: 'wide' | 'compact-h';
  /** Defaults to the tutor detail route. */
  onPress?: () => void;
  /** When omitted, no save control is shown. */
  onSaveToggle?: () => void;
  saved?: boolean;
  className?: string;
  tone?: 'light' | 'dark';
  /** Rail width; map results use a responsive width with a next-card peek. */
  width?: number;
};

export function TutorCard({
  tutor,
  variant = 'wide',
  onPress,
  onSaveToggle,
  saved = false,
  className = '',
  tone = 'light',
  width = 200,
}: TutorCardProps) {
  const router = useRouter();
  const handlePress = onPress ?? (() => {
    router.push({ pathname: '/tutor/[id]', params: { id: tutor.id } });
  });

  if (variant === 'compact-h') {
    return (
      <CompactCard tutor={tutor} onPress={handlePress} className={className} tone={tone} width={width} />
    );
  }
  return (
    <WideCard
      tutor={tutor}
      onPress={handlePress}
      onSaveToggle={onSaveToggle}
      saved={saved}
      className={className}
      tone={tone}
    />
  );
}

function HeartSaveButton({
  saved,
  onSaveToggle,
  dark,
  name,
}: {
  saved: boolean;
  onSaveToggle: () => void;
  dark: boolean;
  name: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.pressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={saved ? `Unsave ${name}` : `Save ${name}`}
      accessibilityState={{ selected: saved }}
      onPress={(event) => {
        event.stopPropagation();
        onSaveToggle();
      }}
      onPressIn={(event) => {
        event.stopPropagation();
        onPressIn();
      }}
      onPressOut={(event) => {
        event.stopPropagation();
        onPressOut();
      }}
      style={animatedStyle}
      className={`h-12 w-12 shrink-0 rounded-pill items-center justify-center border ${
        dark ? 'bg-glass-strong border-glass-border' : 'bg-background border-border'
      }`}
    >
      <Ionicons
        color={saved ? colors.semantic.danger : dark ? colors.text.inverse : colors.brand.primary}
        name={saved ? 'heart' : 'heart-outline'}
        size={21}
      />
    </AnimatedPressable>
  );
}

function WideCard({
  tutor,
  onPress,
  onSaveToggle,
  saved,
  className,
  tone,
}: {
  tutor: TutorProfile;
  onPress?: () => void;
  onSaveToggle?: () => void;
  saved: boolean;
  className: string;
  tone: 'light' | 'dark';
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });
  const dark = tone === 'dark';
  const primaryText = dark ? 'text-text-inverse' : 'text-text-primary';
  const secondaryText = dark ? 'text-glass-secondary' : 'text-text-secondary';
  const mutedText = dark ? 'text-glass-muted' : 'text-text-muted';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${tutor.fullName}'s profile`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`rounded-card border overflow-hidden ${
        dark ? 'bg-glass border-glass-border' : 'bg-surface border-border'
      } ${className}`}
    >
      <View className="p-4 gap-3.5">
        <View className="flex-row items-start gap-3">
          <Avatar name={tutor.fullName} imageUri={tutor.photoUrl} size={56} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text className={`text-body font-semibold ${primaryText} flex-1`} numberOfLines={2}>
                {tutor.fullName}
              </Text>
              {tutor.isVerifiedProfessional ? (
                <Ionicons
                  accessibilityLabel="Verified professional"
                  color={colors.brand.verification}
                  name="checkmark-circle"
                  size={17}
                />
              ) : null}
            </View>
            <Text className={`text-caption ${secondaryText} mt-1`} numberOfLines={2}>
              {tutor.headline}
            </Text>
            {tutor.subscriptionTier === 'pro' ? (
              <View className="self-start px-2 py-0.5 rounded-sm bg-accent-light mt-1.5">
                <Text className="text-micro font-semibold text-accent-dark">PRO</Text>
              </View>
            ) : null}
          </View>
          {onSaveToggle ? (
            <HeartSaveButton saved={saved} onSaveToggle={onSaveToggle} dark={dark} name={tutor.fullName} />
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {tutor.subjects.slice(0, 3).map((subject) => (
            <View key={subject} className={`px-2.5 py-1 rounded-pill ${dark ? 'bg-amber/10' : 'bg-accent-light'}`}>
              <Text className={`text-caption ${dark ? 'text-amber' : 'text-accent-dark'}`}>{subject}</Text>
            </View>
          ))}
          {tutor.subjects.length > 3 ? (
            <View className={`px-2.5 py-1 rounded-pill border ${dark ? 'border-glass-border' : 'border-border'}`}>
              <Text className={`text-caption ${mutedText}`}>+{tutor.subjects.length - 3}</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
          <View className="flex-row items-center gap-1">
            <Ionicons color={colors.brand.accent} name="star" size={13} />
            <Text className={`text-caption font-semibold ${primaryText}`}>
              {tutor.reviewCount > 0 ? tutor.rating.toFixed(1) : 'New'}
            </Text>
            {tutor.reviewCount > 0 ? (
              <Text className={`text-caption ${mutedText}`}>({tutor.reviewCount})</Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1 shrink min-w-0">
            <Ionicons color={dark ? colors.text.inverse : colors.text.muted} name="location-outline" size={13} />
            <Text className={`text-caption ${secondaryText} shrink`} numberOfLines={1}>{tutor.location.city}</Text>
          </View>
        </View>
      </View>

      <View className={`flex-row items-center justify-between gap-3 px-4 py-3.5 border-t ${
        dark ? 'bg-glass-faint border-glass-border' : 'bg-background border-border'
      }`}>
        <View className="flex-1 min-w-0">
          <Text className={`text-label ${mutedText}`}>Monthly rate</Text>
          <Text className={`text-body font-semibold ${primaryText} mt-0.5`}>{formatNpr(tutor.monthlyRateNpr)}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className={`text-button-sm font-semibold ${dark ? 'text-amber' : 'text-primary'}`}>View profile</Text>
          <Ionicons name="arrow-forward" size={17} color={dark ? colors.brand.accent : colors.brand.primary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

function CompactCard({
  tutor,
  onPress,
  className,
  tone,
  width = 200,
}: {
  tutor: TutorProfile;
  onPress?: () => void;
  className: string;
  tone: 'light' | 'dark';
  width?: number;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });
  const dark = tone === 'dark';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${tutor.fullName}'s profile`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // A caller-provided width preserves the map carousel's next-card peek.
      style={[{ width }, animatedStyle]}
      className={`border rounded-card overflow-hidden shadow-md ${
        dark ? 'bg-glass border-glass-border' : 'bg-surface border-border'
      } ${className}`}
    >
      <View className="p-3.5 gap-2">
        <View className="flex-row items-center gap-2.5">
          <Avatar name={tutor.fullName} imageUri={tutor.photoUrl} size={44} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1">
              <Text className={`text-card-title font-semibold flex-1 ${dark ? 'text-text-inverse' : 'text-text-primary'}`} numberOfLines={1}>
                {tutor.fullName}
              </Text>
              {tutor.isVerifiedProfessional ? (
                <Ionicons accessibilityLabel="Verified professional" color={colors.brand.verification} name="checkmark-circle" size={15} />
              ) : null}
            </View>
          </View>
        </View>
        <Text className={`text-caption ${dark ? 'text-glass-secondary' : 'text-text-secondary'}`} numberOfLines={2}>
          {tutor.headline}
        </Text>
        <View className="flex-row items-center gap-1">
          <Ionicons color={colors.brand.accent} name="star" size={12} />
          <Text className={`text-caption ${dark ? 'text-text-inverse' : 'text-text-primary'}`}>
            {tutor.reviewCount > 0 ? tutor.rating.toFixed(1) : 'New'}
          </Text>
          <Text className={`text-caption flex-1 ${dark ? 'text-glass-muted' : 'text-text-muted'}`} numberOfLines={1}>
            · {tutor.location.city}
          </Text>
        </View>
        <View className={`pt-2 border-t ${dark ? 'border-glass-border' : 'border-border'}`}>
          <Text className={`text-button-sm font-semibold ${dark ? 'text-text-inverse' : 'text-text-primary'}`}>
            {formatNpr(tutor.monthlyRateNpr)}
            <Text className={`text-caption ${dark ? 'text-glass-muted' : 'text-text-muted'}`}> /mo</Text>
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}
