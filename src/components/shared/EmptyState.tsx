/**
 * `EmptyState` — a thin, reusable empty-state card.
 *
 * Used across the tutor dashboard, enrollment inbox, and capacity
 * screen to give "nothing here yet" surfaces a consistent shape:
 *   ┌────────────────────────────────────────────┐
 *   │  ⌒⌒⌒ floating icon tile ⌒⌒⌒               │
 *   │                                            │
 *   │  Title                                     │
 *   │  Helper text (one line is fine).           │
 *   │                                            │
 *   └────────────────────────────────────────────┘
 *
 * The `FloatingEmptyIcon` already animates its own translateY, so
 * `EmptyState` does not animate anything itself.
 *
 * Props:
 *   - `iconName`: Ionicons glyph name.
 *   - `iconColor`: hex color (passed to Ionicons). Use design-token
 *      hex from `constants/colors.ts` when possible.
 *   - `iconBgClass`: NativeWind class for the tile background
 *      (`bg-accent-soft`, `bg-ai-light`, etc.).
 *   - `title`: required — short sentence-case heading.
 *   - `subtitle`: optional — helper line below.
 *   - `sizeClass`: optional override for the tile size (default
 *      `w-14 h-14` matches the existing tutor-inbox empty state).
 *   - `size`: optional glyph size override.
 */
import { View, Text } from "react-native";
import { FloatingEmptyIcon } from "@/components/motion/FloatingEmptyIcon";

export function EmptyState({
  iconName,
  iconColor,
  iconBgClass,
  title,
  subtitle,
  sizeClass = "w-14 h-14",
  size = 26,
}: {
  iconName: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  iconColor: string;
  iconBgClass: string;
  title: string;
  subtitle?: string;
  sizeClass?: string;
  size?: number;
}) {
  return (
    <View className="items-center py-4">
      <FloatingEmptyIcon
        iconName={iconName}
        iconColor={iconColor}
        iconBgClass={iconBgClass}
        sizeClass={sizeClass}
        size={size}
      />
      <Text className="text-card-title font-medium text-text-primary text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-body-sm text-text-secondary text-center mt-1">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
