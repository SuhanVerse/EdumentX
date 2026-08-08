/**
 * SecondaryButton — outline/ghost variant for secondary actions.
 *
 * Two variants:
 *   - `outline` : surface fill, border + text-colored label → the default for
 *                 "Discard", "Cancel", "Reset", "Back"
 *   - `ghost`   : transparent background, text-only → for "Skip", "Not now"
 *
 * This component consolidates the inline `bg-surface border border-border
 * items-center justify-center` pattern that appears ~15 times across the
 * codebase. Using it ensures consistent sizing, press feedback, and
 * disabled states everywhere.
 *
 * Motion: a 0.96 spring-scale press feedback driven by `usePressScale`
 * (matches `PrimaryButton`'s feel). The `active:opacity-80` Tailwind
 * utility is removed because the spring scale replaces it.
 *
 * Tokens:
 *   - heights via `min-h-btn` (52) or `min-h-btn-sm` (40)
 *   - radii via `rounded-card` (14)
 *   - colors via `bg-surface` / `text-text-primary` / `border-border`
 */
import { ActivityIndicator, Text, View } from 'react-native';

import { AnimatedPressable, usePressScale } from '@/components/motion';
import { SecondaryButtonProps, SecondaryButtonState } from './SecondaryButton.types';

// ─── Variant styles ──────────────────────────────────────────────────────────

const VARIANT_CLASS: Record<'outline' | 'ghost', { bg: string; label: string }> = {
  outline: {
    bg: 'bg-surface border border-border',
    label: 'text-text-primary',
  },
  ghost: {
    bg: 'bg-transparent',
    label: 'text-text-primary',
  },
};

const DISABLED_VARIANT_CLASS: Record<'outline' | 'ghost', { bg: string; label: string }> = {
  outline: {
    bg: 'bg-surface border border-border/40',
    label: 'text-text-muted',
  },
  ghost: {
    bg: 'bg-transparent',
    label: 'text-text-muted',
  },
};

const SIZE: Record<'md' | 'sm', string> = {
  md: 'min-h-btn',
  sm: 'min-h-btn-sm',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SecondaryButton({
  label,
  onPress,
  variant = 'outline',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  destructive = false,
  accessibilityLabel,
  className = '',
}: SecondaryButtonProps) {
  const isInactive = disabled || loading;

  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  const state: SecondaryButtonState = isInactive
    ? DISABLED_VARIANT_CLASS[variant]
    : VARIANT_CLASS[variant];
  const textColor = destructive ? 'text-danger' : state.label;

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
      className={`${SIZE[size]} ${state.bg} rounded-card flex-row items-center justify-center gap-2 ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={destructive ? '#C1503D' : '#26302B'}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text className={`text-button font-medium ${textColor}`}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
