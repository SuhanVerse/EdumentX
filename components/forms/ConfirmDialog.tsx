import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

/**
 * Custom confirmation overlay (NOT a native Alert). Per Stage 5 spec:
 *
 *   "Logout button → triggers a confirmation alert overlay (not native
 *    alert) → on confirm, routes to the Email Sign-In screen"
 *
 * We render inside a translucent Modal so it floats above the
 * student profile content without navigating away. The backdrop
 * dismisses (cancels). Buttons follow the destructive primary
 * pattern — danger background, white label.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  /**
   * Body of the dialog. Accepts `string | ReactNode` so callers can
   * pass plain text (logout, simple confirmations) or a small JSX
   * block (UserManagement's soft-delete dialog has multi-paragraph
   * copy with a bold span). Rendered verbatim inside a centered
   * `<Text>` block when a string is passed; rendered as a
   * `<View>`-wrapped fragment when JSX is passed (so any inner
   * `<Text>` doesn't get wrapped twice).
   */
  message: string | ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Dismiss dialog"
        onPress={onCancel}
        className="flex-1 bg-black/50 items-center justify-center px-6"
      >
        {/* Inner Pressable absorbs the tap so backdrop dismiss works
            only when the user taps outside the card. */}
        <Pressable
          onPress={() => {}}
          className="bg-surface rounded-xl p-6 w-full max-w-[360px] shadow-lg"
        >
          <View className="items-center mb-3">
            <View
              className={
                destructive
                  ? "w-12 h-12 rounded-pill bg-danger-bg items-center justify-center"
                  : "w-12 h-12 rounded-pill bg-accent-soft items-center justify-center"
              }
            >
              <Ionicons
                name={destructive ? "log-out-outline" : "help-circle-outline"}
                size={24}
                color={destructive ? "#C1503D" : "#E5A03B"}
              />
            </View>
          </View>

          <Text className="text-section-title font-medium text-text-primary text-center">
            {title}
          </Text>
          {typeof message === "string" ? (
            <Text className="text-body text-text-secondary text-center mt-1.5">
              {message}
            </Text>
          ) : (
            <View className="mt-1.5">{message}</View>
          )}

          <View className="mt-5 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              className={
                destructive
                  ? "min-h-btn rounded-card bg-danger items-center justify-center active:opacity-80"
                  : "min-h-btn rounded-card bg-amber items-center justify-center active:opacity-80"
              }
            >
              <Text className="text-button text-text-inverse font-semibold">
                {confirmLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={onCancel}
              className="min-h-btn rounded-card bg-sand items-center justify-center active:opacity-80"
            >
              <Text className="text-button text-text-secondary font-medium">
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}