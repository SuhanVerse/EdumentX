/**
 * PrimaryButton — the project's only primary CTA shape.
 *
 * Three variants:
 *   - `primary`  : night fill, white label  → the default for "Continue",
 *                  "Next", "Get started", etc.
 *   - `accent`   : amber fill, white label  → highlights a single
 *                  upgrade / paid CTA on a screen.
 *   - `ghost`    : surface fill, primary border + label → secondary
 *                  "I already have an account" links.
 *
 * Reanimated 4 gives us a spring press feedback (scale 0.96 on
 * press-in, 1.0 on release) without the JS-thread jank of the old
 * `Animated.Value` API.
 *
 * Tokens (no hardcoded hex):
 *   - heights via `min-h-btn` (52) or `min-h-btn-lg` (56)
 *   - radii via `rounded-card` (12)
 *   - colors via `bg-night` / `bg-amber` / `bg-surface`
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Props ───────────────────────────────────────────────────────────────────

export type PrimaryButtonProps = {
  /** Visible label. */
  label: string;
  onPress: () => void;
  /** `'primary'` (night), `'accent'` (amber), or `'ghost'` (outline). */
  variant?: 'primary' | 'accent' | 'ghost';
  /** `'md'` (52) or `'lg'` (56). */
  size?: 'md' | 'lg';
  /** Show spinner overlay + disable. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional icon node rendered to the left of the label. */
  leftIcon?: React.ReactNode;
  /** Override the default accessibility label if `label` isn't enough. */
  accessibilityLabel?: string;
  /** Extra Tailwind classes appended to the button. */
  className?: string;
};

// ─── Variant styles ──────────────────────────────────────────────────────────

const VARIANT_BG: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: 'bg-night',
  accent: 'bg-amber',
  ghost: 'bg-surface border border-border',
};

const VARIANT_LABEL: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: 'text-white',
  accent: 'text-white',
  ghost: 'text-text-primary',
};

const SIZE: Record<'md' | 'lg', string> = {
  md: 'min-h-btn',
  lg: 'min-h-btn-lg',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  accessibilityLabel,
  className = '',
}: PrimaryButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }));

  const isInactive = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 18, stiffness: 320 });
      }}
      style={animatedStyle}
      className={`${SIZE[size]} ${VARIANT_BG[variant]} rounded-card flex-row items-center justify-center gap-2 ${
        isInactive ? 'opacity-60' : 'active:opacity-90'
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? '#0F172A' : '#FFFFFF'}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text className={`text-button ${VARIANT_LABEL[variant]}`}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}