import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

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
      <Text className="text-overline text-text-muted uppercase mb-2">
        {label}
      </Text>

      {!editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
          accessibilityState={{ disabled: !editable }}
          onPress={startEdit}
          className={`flex-row items-center justify-between bg-surface border rounded-card h-input px-4 ${
            editable
              ? "border-border active:opacity-80"
              : "border-border-subtle opacity-60"
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
              <Ionicons name="pencil" size={11} color="#475569" />
              <Text className="text-micro text-text-secondary font-medium">
                Edit
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View className="gap-2">
          <View className="flex-row items-center bg-surface border-2 border-amber rounded-card h-input px-4">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoFocus
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              className="flex-1 text-body-lg text-text-primary"
            />
          </View>
          {error && (
            <Text className="text-caption text-danger">{error}</Text>
          )}
          <View className="flex-row gap-2">
            <Pressable
              onPress={cancel}
              className="flex-1 h-10 bg-sand rounded-md items-center justify-center active:opacity-80"
            >
              <Text className="text-button-sm text-text-secondary font-medium">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={commit}
              className="flex-1 h-10 bg-amber rounded-md items-center justify-center active:opacity-80"
            >
              <Text className="text-button-sm text-text-inverse font-semibold">
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}