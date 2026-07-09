import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

/**
 * EdumentX — Review Banner
 *
 * Surfaced to a tutor when one of their verification or profile-edit
 * submissions is in a pending/admin-review state. Two flavours:
 *
 *   - `tone="pending"` (default, amber): their submission is being
 *     reviewed; profile is hidden from student discovery.
 *   - `tone="info"` (blue): the admin asked for more info and is
 *     waiting on the tutor to re-submit.
 *   - `tone="rejected"` (terracotta-red): the admin rejected the
 *     submission; profile is hidden until they fix and re-submit.
 *
 * Visual contract: tinted background, matching border, icon, bold
 * title label, then a one-line user-facing message. The card sits at
 * the top of a tutor dashboard (above the metrics grid) so the banner
 * is the first thing they see on every session.
 *
 * Why a shared component and not an inline `<View>`:
 *   - The exact same affordance is also surfaced in admin screens
 *     ("This tutor is currently under review" tooltips) and in the
 *     edit-profile success state. One source of truth for the visual.
 *   - Future state machine: an `onPress` could deep-link the tutor
 *     to the relevant inbox/submission page.
 */
export type ReviewBannerTone = "pending" | "info" | "rejected";

export function ReviewBanner({
  tone = "pending",
  title,
  message,
}: {
  tone?: ReviewBannerTone;
  title?: string;
  message: string;
}) {
  const config = getToneConfig(tone);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${config.label}. ${message}`}
      className={`${config.bgClass} border ${config.borderClass} rounded-card p-3 mx-5 mt-3 flex-row items-start gap-2.5`}
    >
      <Ionicons name={config.icon} size={18} color={config.iconColor} />
      <View className="flex-1 min-w-0">
        <Text className={`text-button-sm font-medium ${config.titleClass}`}>
          {title ?? config.defaultTitle}
        </Text>
        <Text className="text-caption text-text-secondary mt-0.5">
          {message}
        </Text>
      </View>
    </View>
  );
}

function getToneConfig(tone: ReviewBannerTone) {
  switch (tone) {
    case "info":
      return {
        label: "Info requested",
        defaultTitle: "More info requested",
        bgClass: "bg-ai-light",
        borderClass: "border-ai",
        titleClass: "text-ai",
        icon: "information-circle" as const,
        iconColor: "#4A7FA5",
      };
    case "rejected":
      return {
        label: "Rejected",
        defaultTitle: "Submission rejected",
        bgClass: "bg-danger-bg",
        borderClass: "border-danger",
        titleClass: "text-danger",
        icon: "close-circle" as const,
        iconColor: "#C1503D",
      };
    case "pending":
    default:
      return {
        label: "Under review",
        defaultTitle: "Under review",
        bgClass: "bg-amber-light",
        borderClass: "border-amber",
        titleClass: "text-amber",
        icon: "time-outline" as const,
        iconColor: "#E5A03B",
      };
  }
}
