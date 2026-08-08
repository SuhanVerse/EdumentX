import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";

/**
 * Inline-editable field. The display state shows the value with a
 * small pencil chip on the right; tapping it flips the field into
 * edit mode (autoFocus, keyboard pops, Confirm + Cancel buttons).
 *
 * Used by StudentProfile for name + phone, and by the tutor edit
 * profile screen for fullName / headline / bio. Phone uses
 * `keyboardType="phone-pad"` via the `keyboardType` prop.
 *
 * The `editable` prop lets the parent disable the field without
 * changing the underlying state (e.g. while the tutor's account is
 * under admin review). The `trailing` prop lets the parent render
 * a spinner / status icon next to the "Edit" chip in display mode
 * (e.g. mid-save indicator).
 *
 * Motion:
 *   - The display row, Cancel button, and Save button all use
 *     `usePressScale` (default 0.96) — drops the `active:opacity-80`
 *     tailwind utility in favor of a spring scale.
 *   - The edit-mode input wrapper border animates from `border-amber`
 *     to a "focused" color via a shared value that follows the
 *     `TextInput`'s `onFocus` / `onBlur` events. (The wrapper border
 *     is already `border-amber` in the existing implementation;
 *     we just smooth the focus transition.)
 */
export function EditableField({
  label,
  value,
  onChange,
  onCommit,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
  placeholder,
  editable = true,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onCommit: () => void;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string | null;
  placeholder?: string;
  editable?: boolean;
  trailing?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit() {
    if (!editable) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    onChange(draft.trim());
    setEditing(false);
    onCommit();
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <View>
      <Text className="text-label text-ink-muted mb-2">{label}</Text>

      {!editing ? (
        <DisplayRow
          label={label}
          value={value}
          placeholder={placeholder}
          editable={editable}
          onPress={startEdit}
          trailing={trailing}
        />
      ) : (
        <EditView
          draft={draft}
          setDraft={setDraft}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          onCancel={cancel}
          onCommit={commit}
          error={error}
        />
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DisplayRow({
  label,
  value,
  placeholder,
  editable,
  onPress,
  trailing,
}: {
  label: string;
  value: string;
  placeholder?: string;
  editable: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}`}
      accessibilityState={{ disabled: !editable }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!editable}
      style={animatedStyle}
      className={`flex-row items-center justify-between bg-surface border rounded-card h-input px-4 ${
        editable ? "border-border" : "border-border opacity-60"
      }`}
    >
      <Text
        className={
          value
            ? "text-body-lg text-text-primary flex-1"
            : "text-body-lg text-text-muted flex-1"
        }
        numberOfLines={1}
      >
        {value || placeholder || "Not set"}
      </Text>
      {trailing ?? (
        <View className="flex-row items-center gap-1 bg-sand rounded-pill px-2 py-1">
          <Ionicons name="pencil" size={11} color="#6B7268" />
          <Text className="text-micro text-text-secondary font-medium">
            Edit
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

function EditView({
  draft,
  setDraft,
  keyboardType,
  autoCapitalize,
  placeholder,
  onCancel,
  onCommit,
  error,
}: {
  draft: string;
  setDraft: (next: string) => void;
  keyboardType: "default" | "phone-pad" | "email-address";
  autoCapitalize: "none" | "sentences" | "words" | "characters";
  placeholder?: string;
  onCancel: () => void;
  onCommit: () => void;
  error?: string | null;
}) {
  // Focus state animates the wrapper border from amber (rest) to a
  // deeper primary-amber on focus, and back on blur.
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      borderColor: interpolateColor(
        focus.value,
        [0, 1],
        [colors.brand.accent, colors.brand.primary]
      ),
    };
  });

  return (
    <View className="gap-2">
      <Animated.View
        style={borderStyle}
        className="flex-row items-center bg-surface border-2 rounded-card h-input px-4"
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus
          placeholder={placeholder}
          placeholderTextColor="#6B7268"
          onFocus={() => {
            focus.value = withTiming(1, { duration: motion.duration.medium });
          }}
          onBlur={() => {
            focus.value = withTiming(0, { duration: motion.duration.medium });
          }}
          className="flex-1 text-body-lg text-text-primary"
        />
      </Animated.View>
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
      <View className="flex-row gap-2">
        <EditAction
          label="Cancel"
          onPress={onCancel}
          variant="muted"
        />
        <EditAction
          label="Save"
          onPress={onCommit}
          variant="primary"
        />
      </View>
    </View>
  );
}

function EditAction({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: "muted" | "primary";
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`flex-1 h-10 rounded-card items-center justify-center ${
        isPrimary ? "bg-primary" : "bg-surface-muted"
      }`}
    >
      <Text
        className={`text-button-sm font-medium ${
          isPrimary ? "text-text-inverse font-semibold" : "text-text-secondary"
        }`}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
