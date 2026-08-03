import { Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";

type ChipGroupProps = {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  error?: string;
};

/**
 * Multi-select chip row. Tailwind-driven: the `bg-night` / `bg-surface`
 * pair flips on the `active` state. Each chip has a 0.94 spring-scale
 * press feedback driven by `usePressScale`.
 *
 * The `Chip` sub-component is extracted so `usePressScale` can run as
 * a hook per chip instance (hooks must be called in stable order, and
 * a `.map` callback is not a hook context).
 */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  error,
}: ChipGroupProps) {
  return (
    <View className="gap-4 p-5 border border-border rounded-card bg-surface shadow-sm">
      <Text className="text-label text-ink-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            option={option}
            active={selected.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
    </View>
  );
}

function Chip({
  option,
  active,
  onPress,
}: {
  option: string;
  active: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`min-h-btn-sm px-4 py-2 rounded-sm border-emphasis ${
        active
          ? "bg-primary border-primary"
          : "bg-surface-muted border-border"
      }`}
    >
      <Text
        className={`text-button-sm ${
          active ? "text-white" : "text-text-secondary"
        }`}
      >
        {option}
      </Text>
    </AnimatedPressable>
  );
}
