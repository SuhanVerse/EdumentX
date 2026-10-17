/**
 * PrimaryButton — the project's only primary CTA shape.
 *
 * Three variants:
 *   - `primary`  : chalkboard-green fill, white label  → the default for
 *                  "Continue", "Next", "Get started", etc.
 *   - `accent`   : accent fill, white label  → highlights a single
 *                  upgrade / paid CTA on a screen.
 *   - `ghost`    : surface fill, primary border + label → secondary
 *                  "I already have an account" links.
 *
 * Disabled state uses muted backgrounds per variant so the button shape
 * remains visible even when the user can't tap it (no more `opacity-60`
 * making buttons disappear on light backgrounds).
 *
 * Reanimated 4 gives us a spring press feedback (scale 0.96 on
 * press-in, 1.0 on release) without the JS-thread jank of the old
 * `Animated.Value` API.
 *
 * Tokens (no hardcoded hex):
 *   - heights via `min-h-btn` (52) or `min-h-btn-lg` (56)
 *   - radii via `rounded-card` (14)
 *   - colors via `bg-primary` / `bg-accent` / `bg-surface`
 *
 * Press feedback comes from the shared `usePressScale` hook — the
 * same ~100ms stiff spring + light haptic impact every tactile surface
 * in the app uses (Phase 2). No local `active:opacity` fallback.
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/motion';
import { colors } from "@/constants/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Props ───────────────────────────────────────────────────────────────────

export type PrimaryButtonProps = {
  /** Visible label. */
  label: string;
  onPress: () => void;
  /** `'primary'` (chalkboard green), `'accent'` (amber), or `'ghost'` (outline). */
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
  primary: 'bg-primary',
  accent: 'bg-accent',
  ghost: 'bg-surface border-2 border-border',
};

/** Muted background when button is disabled — keeps the button shape visible
 *  instead of relying on `opacity-60` which makes filled buttons nearly
 *  invisible on light backgrounds. */
const VARIANT_DISABLED_BG: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: 'bg-sand',
  accent: 'bg-sand',
  ghost: 'bg-surface border-2 border-border/40',
};

const VARIANT_LABEL: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: 'text-white',
  accent: 'text-white',
  ghost: 'text-text-primary',
};

/** Muted label color when disabled — softer than the active label but still
 *  readable against the disabled background. */
const VARIANT_DISABLED_LABEL: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: 'text-text-secondary',
  accent: 'text-text-secondary',
  ghost: 'text-text-muted',
};

const SIZE: Record<'md' | 'lg', string> = {
  md: 'min-h-btn',
  lg: 'min-h-btn-lg',
};

const VARIANT_SPINNER: Record<'primary' | 'accent' | 'ghost', string> = {
  primary: colors.text.inverse,
  accent: colors.text.inverse,
  ghost: colors.brand.primary,
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
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  const isInactive = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`${SIZE[size]} ${
        isInactive ? VARIANT_DISABLED_BG[variant] : VARIANT_BG[variant]
      } rounded-card flex-row items-center justify-center gap-2 ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={VARIANT_SPINNER[variant]}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text
            className={`text-button tracking-wide ${
              isInactive ? VARIANT_DISABLED_LABEL[variant] : VARIANT_LABEL[variant]
            }`}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
