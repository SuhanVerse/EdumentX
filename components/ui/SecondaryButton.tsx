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
 * Tokens:
 *   - heights via `min-h-btn` (52) or `min-h-btn-sm` (40)
 *   - radii via `rounded-card` (14)
 *   - colors via `bg-surface` / `text-text-primary` / `border-border`
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

// ─── Props ───────────────────────────────────────────────────────────────────

export type SecondaryButtonProps = {
  /** Visible label. */
  label: string;
  onPress: () => void;
  /** `'outline'` (bordered surface) or `'ghost'` (text only). */
  variant?: 'outline' | 'ghost';
  /** `'md'` (52) or `'sm'` (40). */
  size?: 'md' | 'sm';
  /** Show spinner + disable. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional icon node rendered to the left of the label. */
  leftIcon?: React.ReactNode;
  /** When true, the text is rendered in `text-danger` for destructive actions. */
  destructive?: boolean;
  /** Override the default accessibility label if `label` isn't enough. */
  accessibilityLabel?: string;
  /** Extra Tailwind classes appended to the button. */
  className?: string;
};

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

  const state = isInactive ? DISABLED_VARIANT_CLASS[variant] : VARIANT_CLASS[variant];
  const textColor = destructive
    ? 'text-danger'
    : isInactive
      ? state.label
      : state.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      className={`${SIZE[size]} ${state.bg} ${isInactive ? '' : 'active:opacity-80'} rounded-card flex-row items-center justify-center gap-2 ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={destructive ? '#C1503D' : '#26302B'}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text
            className={`text-button font-medium ${textColor}`}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
