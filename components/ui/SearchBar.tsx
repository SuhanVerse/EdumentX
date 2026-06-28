/**
 * SearchBar — reusable input with a leading search icon and an
 * optional right icon (filter, voice, etc.).
 *
 * Used by the (future) Discover / Tutor-list screen. Today it's just
 * an extracted primitive that lives in `components/ui/` so feature
 * screens can drop it in without duplicating the 48h container +
 * icon spacing markup.
 *
 * Tokens (no hardcoded hex):
 *   - height via `h-input` (48)
 *   - radius via `rounded-md` (10)
 *   - fill via `bg-surface`
 *   - border via `border-border`
 */
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

// ─── Props ───────────────────────────────────────────────────────────────────

export type SearchBarProps = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  /** Auto-focus the input on mount. */
  autoFocus?: boolean;
  /** Optional right-side icon (filter, voice, etc.). */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  /** Extra Tailwind classes appended to the outer container. */
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus,
  rightIcon,
  onRightIconPress,
  className = '',
}: SearchBarProps) {
  return (
    <View
      className={`h-input flex-row items-center rounded-md bg-surface border border-border px-3 ${className}`}
    >
      <Ionicons color={colors.text.muted} name="search-outline" size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoFocus={autoFocus}
        placeholderTextColor={colors.text.muted}
        className="flex-1 ml-2 text-text-primary text-body-lg"
        returnKeyType="search"
      />
      {rightIcon && onRightIconPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          hitSlop={8}
          onPress={onRightIconPress}
          className="w-9 h-9 items-center justify-center active:opacity-70"
        >
          <Ionicons color={colors.text.muted} name={rightIcon} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}