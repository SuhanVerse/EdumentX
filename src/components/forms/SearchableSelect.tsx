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
 *
 * Single source of truth: `onChange` is fired on EVERY keystroke (not
 * just on select/clear), so the parent's value always mirrors what is
 * actually in the input. This is what keeps the form's `valid` prop and
 * submit validation honest — if the user clears the text, the parent
 * sees "" and the green tick disappears (previously the stale selected
 * value kept the tick and let the form submit with a visually empty
 * field). The dropdown also re-opens after clearing + re-typing because
 * the blur-close timer is cancelable and never fights a fresh focus.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";

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
  // The blur-close delay must be cancelable: a stale timer firing after
  // the user cleared + re-focused the field would lock `isFocused` to
  // false and the dropdown would never re-open on re-typing.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelBlurTimer() {
    if (blurTimer.current !== null) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  // When `value` changes from outside (e.g. edit screen hydration),
  // sync the local searchText via an effect. Because `onChange` fires
  // on every keystroke, `value` always equals `searchText` during user
  // interaction, so this is a no-op there — it only matters for
  // externally hydrated values (edit screen preload).
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  // Clear any pending blur timer on unmount so we never setState on a
  // dead component. Inline the cleanup so it doesn't depend on the
  // render-scoped `cancelBlurTimer` (refs are stable, the function is not).
  useEffect(() => {
    return () => {
      if (blurTimer.current !== null) {
        clearTimeout(blurTimer.current);
      }
    };
  }, []);

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
    cancelBlurTimer();
    setSearchText(option);
    onChange(option);
    setIsFocused(false);
  }

  function handleClear() {
    cancelBlurTimer();
    setSearchText("");
    onChange("");
    // Keep the dropdown armed to re-open. After `selectOption` set
    // `isFocused` to false (to close the dropdown), tapping the ✕ — a
    // sibling Pressable — does NOT fire `onFocus` on the TextInput, so
    // without this the field would stay stuck closed when the user
    // retypes. The blur race is handled by `cancelBlurTimer()` above
    // (pending timers are cleared; a later real blur schedules a fresh
    // timer that the next tap's `onFocus` cancels).
    setIsFocused(true);
  }

  return (
    <View className="gap-1">
      {/* Label + description */}
      <View className="flex-row items-center justify-between">
        <Text className="text-caption text-text-secondary">{label}</Text>
        {searchText.length > 0 ? (
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
          onChangeText={(text) => {
            // Fire onChange on every keystroke so the parent's value is
            // always the true current text (see header comment). This is
            // what clears the stale-value green tick when the user
            // backspaces the whole field and blocks submit-on-empty.
            setSearchText(text);
            onChange(text);
          }}
          onFocus={() => {
            cancelBlurTimer();
            setIsFocused(true);
          }}
          onBlur={() => {
            // Delay hiding the dropdown so the tap on a list item
            // registers, but keep the timer cancelable so a fresh focus
            // or clear can never be overridden by a stale close.
            cancelBlurTimer();
            blurTimer.current = setTimeout(() => {
              setIsFocused(false);
              blurTimer.current = null;
            }, 200);
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

      {/* Dropdown — rendered inline (not absolute) so it doesn't get
          clipped by ancestor overflow-hidden (ScreenSheet, ScrollView).
          The max-h keeps it compact; 8 items max avoids perf concerns. */}
      {showDropdown ? (
        <View className="mt-1 border border-border rounded-card bg-surface shadow-lg">
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={{ maxHeight: 256 }}
          >
            {filtered.map((s, i) => (
              <SelectOptionRow
                key={`opt-${i}`}
                onPress={() => selectOption(s.option)}
                last={false}
              >
                {s.option}
              </SelectOptionRow>
            ))}
            {showCustom ? (
              <SelectOptionRow
                key="custom-option"
                onPress={() => selectOption(searchText.trim())}
                last={true}
              >
                {searchText.trim()}
              </SelectOptionRow>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function SelectOptionRow({
  onPress,
  last,
  children,
}: {
  onPress: () => void;
  last: boolean;
  children: ReactNode;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.rowPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`flex-row items-center gap-2 px-4 py-3 ${
        last ? "" : "border-b border-border/50"
      }`}
    >
      <Ionicons
        color={colors.text.muted}
        name={last ? "add-circle-outline" : "school-outline"}
        size={16}
      />
      <Text className="flex-1 text-body text-text-primary">{children}</Text>
    </AnimatedPressable>
  );
}
