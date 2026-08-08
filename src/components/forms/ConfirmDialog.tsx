import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect } from "react";
import { Modal, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";

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
  // Two animated layers:
  //   - backdrop opacity: 0 → 0.5 (timing, fast on open, fast on close)
  //   - card scale + opacity: 0.94 → 1.0 + 0 → 1 (spring on open,
  //     timing-back on close)
  // Both are driven off the same `visible` prop in a useEffect, so the
  // entrance and exit animations run in lock-step. The card's spring
  // is the visually load-bearing one; the backdrop's timing is just
  // a soft fade.
  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(0.5, { duration: motion.duration.medium });
      card.value = withSpring(1, motion.spring.gentle);
    } else {
      backdrop.value = withTiming(0, { duration: motion.duration.fast });
      card.value = withTiming(0, { duration: motion.duration.fast });
    }
  }, [visible, backdrop, card]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));
  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: card.value,
      transform: [{ scale: 0.94 + card.value * 0.06 }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      // We render the fade/scale on the inner card and backdrop
      // ourselves, so the OS-level modal animation is `none`.
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center px-6">
        <AnimatedPressable
          accessibilityLabel="Dismiss dialog"
          onPress={onCancel}
          className="absolute inset-0 bg-black"
          style={backdropStyle}
        />
        {/* Inner card. We do NOT use a Pressable here because the
            backdrop is the dismiss target — wrapping the card in
            another pressable would steal the tap. The card content
            is pointer-transparent except for its own action
            buttons. */}
        <Animated.View
          style={cardStyle}
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
            <ConfirmDialogAction
              label={confirmLabel}
              onPress={onConfirm}
              destructive={destructive}
            />
            <ConfirmDialogAction
              label={cancelLabel}
              onPress={onCancel}
              destructive={false}
              muted
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ConfirmDialogAction({
  label,
  onPress,
  destructive,
  muted,
}: {
  label: string;
  onPress: () => void;
  destructive: boolean;
  muted?: boolean;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={
        muted
          ? "min-h-btn rounded-card bg-sand items-center justify-center"
          : destructive
            ? "min-h-btn rounded-card bg-danger items-center justify-center"
            : "min-h-btn rounded-card bg-amber items-center justify-center"
      }
    >
      <Text
        className={
          muted
            ? "text-button text-text-secondary font-medium"
            : "text-button text-text-inverse font-semibold"
        }
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}