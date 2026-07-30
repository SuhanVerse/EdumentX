/**
 * EdumentX — SearchableSelect
 *
 * A searchable autocomplete dropdown that:
 * - Filters options as the user types (case-insensitive)
 * - Prioritises prefix matches over substring matches
 * - Shows a "Use: [typed value]" row when no option matches, so the
 *   user can submit custom text (e.g. a new institute not in the list)
 * - Tapping an option or the custom row sets the value and closes the
 *   dropdown
 * - Fits the EdumentX design system (FieldShell-compatible)
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/colors";

interface SearchableSelectProps {
  /** Currently selected value (displayed in the input when set). */
  value: string;
  /** Called when the user picks an option or enters custom text. */
  onChange: (value: string) => void;
  /** Full list of option labels to search within. */
  options: readonly string[];
  /** Label shown above the field (e.g. "Degree / Qualification"). */
  label: string;
  /** Secondary description shown below the label. */
  description?: string;
  /** Placeholder text inside the input. */
  placeholder?: string;
  /** Icon name from Ionicons. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** If present, shows the error string below the field. */
  error?: string;
  /** If present and true, show a valid checkmark. */
  valid?: boolean;
}

function scoreMatch(query: string, option: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerOption = option.toLowerCase();

  // Empty query → everything matches but with lowest priority
  if (lowerQuery.length === 0) return 0;

  // Exact match → highest priority
  if (lowerOption === lowerQuery) return 100;

  // Prefix match (e.g. "tribh" → "Tribhuvan University")
  if (lowerOption.startsWith(lowerQuery)) return 80;

  // Word-prefix match (e.g. "tribh" → "Tribhuvan" in "Tribhuvan University")
  const words = lowerOption.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(lowerQuery)) return 70;
    if (word.includes(lowerQuery)) return 60;
  }

  // Substring match (e.g. "tribh" → "Mahatma Gandhi ... Antargat Tribhuvan ...")
  if (lowerOption.includes(lowerQuery)) return 50;

  // Acronym match (e.g. "ku" → "Kathmandu University")
  const acronym = words.map((w) => w[0]).join("");
  if (acronym.includes(lowerQuery)) return 40;

  return 0;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  label,
  description,
  placeholder,
  icon,
  error,
  valid,
}: SearchableSelectProps) {
  const [searchText, setSearchText] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // When `value` changes from outside (e.g. edit screen hydration),
  // sync the local searchText via an effect.
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  const filtered = useMemo(() => {
    const trimmed = searchText.trim();

    // No text typed → don't show dropdown (user hasn't started searching)
    if (trimmed.length === 0) return [];

    // Score every option and sort descending
    const scored = options
      .map((opt) => ({ option: opt, score: scoreMatch(trimmed, opt) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // cap at 8 visible results

    return scored;
  }, [searchText, options]);

  const hasExactMatch = filtered.some(
    (s) => s.option.toLowerCase() === searchText.trim().toLowerCase(),
  );
  const showCustom = searchText.trim().length > 0 && !hasExactMatch;

  // Only show the dropdown when the input is focused AND we have results
  const showDropdown = isFocused && (filtered.length > 0 || showCustom);

  function selectOption(option: string) {
    setSearchText(option);
    onChange(option);
    setIsFocused(false);
  }

  function handleClear() {
    setSearchText("");
    onChange("");
    setIsFocused(true);
  }

  return (
    <View className="gap-1 relative">
      {/* Label + description */}
      <View className="flex-row items-center justify-between">
        <Text className="text-caption text-text-secondary">{label}</Text>
        {searchText.length > 0 && value === searchText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear"
            hitSlop={8}
            onPress={handleClear}
          >
            <Ionicons color={colors.text.muted} name="close-circle" size={16} />
          </Pressable>
        ) : null}
      </View>
      {description ? (
        <Text className="text-caption text-text-muted -mt-0.5">{description}</Text>
      ) : null}

      {/* The input */}
      <View
        className={`flex-row items-center h-input px-3 gap-2 border rounded-card bg-surface ${
          error ? "border-danger" : isFocused ? "border-accent" : "border-border"
        }`}
      >
        {icon ? (
          <Ionicons color={error ? colors.semantic.danger : colors.text.muted} name={icon} size={18} />
        ) : null}
        <TextInput
          className="flex-1 text-text-primary text-body"
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay hiding the dropdown so the tap on a list item registers
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {valid && !error ? (
          <Ionicons color={colors.semantic.success} name="checkmark-circle" size={18} />
        ) : null}
      </View>

      {error ? (
        <Text className="text-caption text-danger">{error}</Text>
      ) : null}

      {/* Dropdown — ScrollView instead of FlatList to avoid
          VirtualizedList-inside-ScrollView nesting warning. We cap at
          8 items so performance is not a concern. */}
      {showDropdown ? (
        <View className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 border border-border rounded-card bg-surface shadow-lg">
          <ScrollView
            keyboardShouldPersistTaps="always"
            className="max-h-64"
          >
            {filtered.map((s, i) => (
              <Pressable
                key={`opt-${i}`}
                accessibilityRole="button"
                onPress={() => selectOption(s.option)}
                className="flex-row items-center gap-2 px-4 py-3 active:bg-surface-muted border-b border-border/50"
              >
                <Ionicons
                  color={colors.text.muted}
                  name="school-outline"
                  size={16}
                />
                <Text className="flex-1 text-body text-text-primary">
                  {s.option}
                </Text>
              </Pressable>
            ))}
            {showCustom ? (
              <Pressable
                key="custom-option"
                accessibilityRole="button"
                onPress={() => selectOption(searchText.trim())}
                className="flex-row items-center gap-2 px-4 py-3 active:bg-surface-muted"
              >
                <Ionicons
                  color={colors.text.muted}
                  name="add-circle-outline"
                  size={16}
                />
                <Text className="flex-1 text-body text-text-primary">
                  {searchText.trim()}
                </Text>
                <Text className="text-caption text-accent shrink-0">
                  Custom
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
