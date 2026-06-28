import { Ionicons } from "@expo/vector-icons";
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
  message: string;
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
          className="bg-surface rounded-hero p-6 w-full max-w-[360px] shadow-lg"
        >
          <View className="items-center mb-3">
            <View
              className={
                destructive
                  ? "w-12 h-12 rounded-pill bg-danger-bg items-center justify-center"
                  : "w-12 h-12 rounded-pill bg-amber-light items-center justify-center"
              }
            >
              <Ionicons
                name={destructive ? "log-out-outline" : "help-circle-outline"}
                size={24}
                color={destructive ? "#DC2626" : "#B45309"}
              />
            </View>
          </View>

          <Text className="text-section-title font-medium text-text-primary text-center">
            {title}
          </Text>
          <Text className="text-body text-text-secondary text-center mt-1.5">
            {message}
          </Text>

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