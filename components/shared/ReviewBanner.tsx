import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";

/**
 * EdumentX — Review Banner
 *
 * Surfaced to a tutor when one of their verification or profile-edit
 * submissions is in a pending/admin-review state. Three flavours:
 *
 *   - `tone="pending"` (default, amber): their submission is being
 *     reviewed; profile is hidden from student discovery.
 *   - `tone="info"` (blue): the admin asked for more info and is
 *     waiting on the tutor to re-submit.
 *   - `tone="rejected"` (terracotta-red): the admin rejected the
 *     submission; profile is hidden until they fix and re-submit.
 *
 * Visual contract: tinted background, matching border, icon, bold
 * title label, then a one-line user-facing message. A "Got it"
 * dismiss button sits on the right edge so the tutor can collapse
 * the banner once they've read it. The banner is full-width
 * (`mx-0`) and lives in the same surface as its parent so it
 * never appears to "blend" with an adjacent dark hero.
 *
 * Why a shared component and not an inline `<View>`:
 *   - The exact same affordance is also surfaced in admin screens
 *     ("This tutor is currently under review" tooltips) and in the
 *     edit-profile success state. One source of truth for the visual.
 *   - Future state machine: an `onPress` on the title row could
 *     deep-link the tutor to the relevant inbox/submission page.
 */
export type ReviewBannerTone = "pending" | "info" | "rejected";

export function ReviewBanner({
  tone = "pending",
  title,
  message,
  onDismiss,
}: {
  tone?: ReviewBannerTone;
  title?: string;
  message: string;
  /**
   * Optional callback for the "Got it" button. When provided, a
   * dismiss button is rendered on the right. When omitted, no
   * button is shown — useful for call sites where the banner is
   * the only signal of state and shouldn't be dismissable (e.g.
   * admin view).
   */
  onDismiss?: () => void;
}) {
  const config = getToneConfig(tone);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${config.label}. ${message}`}
      className={`${config.bgClass} border-t border-b ${config.borderClass} py-2.5 px-4 flex-row items-start gap-2.5`}
    >
      <View className="pt-0.5">
        <Ionicons name={config.icon} size={18} color={config.iconColor} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className={`text-button-sm font-medium ${config.titleClass}`}>
          {title ?? config.defaultTitle}
        </Text>
        <Text className={`text-caption ${config.messageClass} mt-0.5`}>
          {message}
        </Text>
      </View>
      {onDismiss ? (
        <ReviewBannerDismiss onDismiss={onDismiss} config={config} />
      ) : null}
    </View>
  );
}

function ReviewBannerDismiss({
  onDismiss,
  config,
}: {
  onDismiss: () => void;
  config: ReturnType<typeof getToneConfig>;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss notification"
      onPress={onDismiss}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={8}
      style={animatedStyle}
      className={`${config.buttonBgClass} px-2.5 py-1 rounded-sm`}
    >
      <Text className={`text-caption font-medium ${config.buttonTextClass}`}>
        Got it
      </Text>
    </AnimatedPressable>
  );
}

function getToneConfig(tone: ReviewBannerTone) {
  switch (tone) {
    case "info":
      return {
        label: "Info requested",
        defaultTitle: "More info requested",
        // `bg-ai-light` is a Tailwind-mapped token (#EBF3F9); the
        // `border-ai/30` opacity modifier is supported by NativeWind.
        // We deliberately use the AI palette rather than reaching for
        // a custom `bg-blue-50` to stay inside the EdumentX design
        // system tokens.
        bgClass: "bg-ai-light",
        borderClass: "border-ai/30",
        titleClass: "text-ai",
        messageClass: "text-ai",
        // Pill button — a slightly darker tint of the banner so the
        // dismiss action reads as a separate affordance, not as part
        // of the message text.
        buttonBgClass: "bg-ai/15",
        buttonTextClass: "text-ai",
        icon: "information-circle" as const,
        iconColor: "#4A7FA5",
      };
    case "rejected":
      return {
        label: "Rejected",
        defaultTitle: "Submission rejected",
        bgClass: "bg-danger-bg",
        borderClass: "border-danger/30",
        titleClass: "text-danger",
        messageClass: "text-danger-text",
        buttonBgClass: "bg-danger/15",
        buttonTextClass: "text-danger",
        icon: "close-circle" as const,
        iconColor: "#C1503D",
      };
    case "pending":
    default:
      return {
        label: "Under review",
        defaultTitle: "Under review",
        // Mirrors the amber card on the tutor-pending screen so the
        // language is consistent across the app.
        bgClass: "bg-warning-bg",
        borderClass: "border-warning/30",
        titleClass: "text-warning-text",
        messageClass: "text-warning-text/80",
        buttonBgClass: "bg-warning/15",
        buttonTextClass: "text-warning-text",
        icon: "time-outline" as const,
        iconColor: "#E5A03B",
      };
  }
}
