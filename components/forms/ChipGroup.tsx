import { Pressable, Text, View } from "react-native";

type ChipGroupProps = {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  error?: string;
};

/**
 * Multi-select chip row. Tailwind-driven: the `bg-night` / `bg-surface`
 * pair flips on the `active` state. `active:opacity-80` provides press
 * feedback in place of Tamagui's `pressStyle`.
 */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  error,
}: ChipGroupProps) {
  return (
    <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
      <Text className="text-overline text-text-muted uppercase">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onToggle(option)}
              className={`min-h-btn-sm px-4 py-2 rounded-md border-emphasis active:opacity-80 ${
                active
                  ? "bg-night border-night"
                  : "bg-surface border-border"
              }`}
            >
              <Text
                className={`text-button-sm ${
                  active ? "text-white" : "text-text-secondary"
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text className="text-caption text-danger">{error}</Text>
      ) : null}
    </View>
  );
}
