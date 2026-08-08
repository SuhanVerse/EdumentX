/**
 * PaginationDots — animated onboarding / carousel page indicator.
 *
 * Each dot is a `<Pressable>` wrapping an `<Animated.View>` whose
 * `width` springs between 8 (inactive) and 24 (active). The active
 * dot also gets the `bg-night` fill; inactive dots get `bg-border-strong`.
 *
 * Tapping any dot (active or inactive) jumps the carousel to that
 * index via the `onPress(index)` callback.
 *
 * Used by:
 *   - `screens/onboarding/OnboardingScreen.tsx` (3-slide carousel)
 */
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

export type PaginationDotsProps = {
  /** Total number of slides. */
  total: number;
  /** Index of the currently visible slide (0-indexed). */
  current: number;
  /** Tap handler — receives the index of the tapped dot. */
  onPress: (index: number) => void;
  /** Optional extra Tailwind classes appended to the row. */
  className?: string;
};

// ─── Single dot ──────────────────────────────────────────────────────────────

function Dot({
  active,
  onPress,
  accessibilityLabel,
}: {
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  // Shared value 0/1 drives the spring-snap width + colour mix.
  const target = useSharedValue(active ? 1 : 0);

  // When `active` flips, spring the shared value to the new target.
  // The effect runs after render, so we are NOT writing to a shared
  // value during render (which Reanimated 4 warns about).
  useEffect(() => {
    target.value = withSpring(active ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.6,
    });
  }, [active, target]);

  const style = useAnimatedStyle(() => ({
    width: 8 + target.value * 16, // 8 (inactive) -> 24 (active)
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      onPress={onPress}
    >
      <AnimatedView
        style={style}
        className={`h-2 rounded-pill ${
          active ? 'bg-primary' : 'bg-surface-muted'
        }`}
      />
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaginationDots({
  total,
  current,
  onPress,
  className = '',
}: PaginationDotsProps) {
  return (
    <View className={`h-3 flex-row items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot
          key={index}
          active={index === current}
          onPress={() => onPress(index)}
          accessibilityLabel={`Show slide ${index + 1} of ${total}`}
        />
      ))}
    </View>
  );
}