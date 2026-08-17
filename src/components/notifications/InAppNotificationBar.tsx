import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";

/**
 * EdumentX — In-app notification bar.
 *
 * A floating banner pinned below the status bar on every screen
 * (mounted once in `app/_layout.tsx`). The live queue comes from
 * `useInAppNotifications` (baseline-seeded on `notifications/{uid}`,
 * so only NEW payloads alert). Renders nothing when the queue is
 * empty, so it never blocks touches on other screens.
 *
 *   - Icon tile per notification category (same tokens as the center)
 *   - Title / body / relative time
 *   - "Mark as read" → `read: true` (badge drops, banner closes)
 *   - "Dismiss" → banner closes, stays unread (badge unchanged)
 *   - Auto-closes after ~7s (pure local — no Firestore write)
 *   - Tapping the body opens the notification center
 */

const AUTO_DISMISS_MS = 7000;

const CATEGORY_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  enrollment: {
    icon: "calendar",
    bg: "bg-accent-light",
    fg: colors.brand.accent,
  },
  batch: { icon: "people", bg: "bg-ai-light", fg: colors.brand.ai },
  verification: {
    icon: "shield-checkmark",
    bg: "bg-verification-light",
    fg: colors.brand.verification,
  },
  broadcast: {
    icon: "megaphone",
    bg: "bg-onb-map",
    fg: colors.text.primary,
  },
  message: {
    icon: "chatbubble-ellipses",
    bg: "bg-success-bg",
    fg: colors.brand.verification,
  },
  ai: { icon: "sparkles", bg: "bg-ai-light", fg: colors.brand.ai },
  system: { icon: "triangle", bg: "bg-danger-bg", fg: colors.semantic.danger },
};

/** Short relative label ("2 min ago") — same shape as the center. */
function formatRelative(ms: number): string {
  if (!ms) return "now";
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InAppNotificationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { active, remove, handleRead, handleDismiss } =
    useInAppNotifications();

  // Slide-down + fade-in on each new banner; the exit is an unmount
  // (no exit animation needed for a transient toast).
  const progress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -24 },
    ],
  }));

  useEffect(() => {
    if (!active) return;
    // Reset to hidden first so queued items re-slide instead of
    // appearing already-animated on top of the previous banner.
    progress.value = 0;
    progress.value = withTiming(1, { duration: motion.duration.medium });
    const t = setTimeout(() => remove(active.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Don't float a banner over the notification center itself — the
  // user is already reading notifications there.
  if (!active || pathname === "/notification") return null;

  const meta = CATEGORY_META[active.category] ?? CATEGORY_META.system;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 z-50 px-4"
      style={{ top: insets.top + 8 }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          },
        ]}
      >
        <View className="bg-surface border border-border rounded-card overflow-hidden">
          {/* Body — tap opens the notification center */}
          <Pressable
            onPress={() => router.push("/notification")}
            accessibilityRole="button"
            accessibilityLabel={`${active.title}. Open notifications.`}
            className="flex-row items-start gap-3 p-3.5 active:opacity-95"
          >
            <View
              className={`w-9 h-9 rounded-lg items-center justify-center ${meta.bg}`}
            >
              <Ionicons name={meta.icon} size={17} color={meta.fg} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className="flex-1 text-button-sm font-semibold text-text-primary"
                  numberOfLines={1}
                >
                  {active.title}
                </Text>
                <Text className="text-micro text-text-muted">
                  {formatRelative(active.timeMs)}
                </Text>
              </View>
              <Text
                className="text-caption text-text-secondary leading-5 mt-0.5"
                numberOfLines={2}
              >
                {active.body}
              </Text>
            </View>
          </Pressable>

          {/* Actions */}
          <View className="flex-row border-t border-border bg-background">
            <Pressable
              onPress={() => handleRead(active.id)}
              accessibilityRole="button"
              accessibilityLabel="Mark as read"
              className="flex-1 h-10 flex-row items-center justify-center gap-1.5 active:opacity-70"
            >
              <Ionicons
                name="checkmark"
                size={14}
                color={colors.brand.verification}
              />
              <Text className="text-button-sm font-medium text-verification">
                Mark as read
              </Text>
            </Pressable>
            <View className="w-px bg-border" />
            <Pressable
              onPress={() => handleDismiss(active.id)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              className="flex-1 h-10 flex-row items-center justify-center gap-1.5 active:opacity-70"
            >
              <Ionicons name="close" size={14} color={colors.text.muted} />
              <Text className="text-button-sm font-medium text-text-secondary">
                Dismiss
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
