/**
 * NotificationBell — shared header bell with unread badge.
 *
 * Subscribes to `notifications/{uid}` via `onSnapshot` and renders an
 * Ionicons `notifications` glyph plus a small red pill containing the
 * unread count (capped at "9+").
 *
 * Three dashboards (StudentHome / TutorHome / AdminHome) used to ship
 * without a bell — tapping the avatar or hamburger was the only way to
 * reach `/notification`. Adding this component to the dark hero header
 * gives the user a constant, glanceable unread count.
 *
 * Two visual tones to match the surrounding screen:
 *   - `dark`  — glass-strong tile + glass-border hairline + white glyph
 *               (used on the night hero headers).
 *   - `light` — solid surface tile + amber glyph + standard border.
 *
 * The bell also has a tiny press-scale (`motion.scale.iconPressed`,
 * 0.85) so taps register visually even when the surrounding tile is
 * already animating.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
} from "@react-native-firebase/firestore";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";
import { useAuthStore } from "@/store/authStore";

export function NotificationBell({
  tone = "dark",
}: {
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [unread, setUnread] = useState(0);

  // Live count of unread notifications for the signed-in user. We only
  // care about the count here — the actual rows are read by
  // `NotificationsCenter` itself. The subscription is torn down on
  // sign-out / route swap so we never leak a Firestore listener.
  useEffect(() => {
    if (!user?.uid) {
      setUnread(0);
      return;
    }
    const db = getFirestore(getApp());
    const unsub = onSnapshot(
      collection(db, "notifications", user.uid, "items"),
      (snap) => {
        let n = 0;
        snap.forEach((d) => {
          const data = d.data() as { read?: boolean };
          if (!data.read) n += 1;
        });
        setUnread(n);
      },
      (err) => {
        // Mid sign-out races — silently zero out. The bell is
        // decorative; the notification center is the source of truth.
        console.warn("[NotificationBell] snapshot error", err);
        setUnread(0);
      },
    );
    return unsub;
  }, [user?.uid]);

  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });

  // Tone-specific surfaces so the bell sits correctly on either the
  // night hero or the light surface above a card.
  const tileClass =
    tone === "dark"
      ? "w-10 h-10 rounded-pill bg-glass-strong border border-glass-border items-center justify-center"
      : "w-10 h-10 rounded-pill bg-surface border border-border items-center justify-center";
  const glyphColor = tone === "dark" ? "#FFFFFF" : "#1F2A24";

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0
          ? `Notifications, ${unread} unread`
          : "Notifications"
      }
      onPress={() => router.push("/notification")}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={tileClass}
      hitSlop={6}
    >
      <Ionicons name="notifications-outline" size={20} color={glyphColor} />
      {unread > 0 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-danger items-center justify-center"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <Text className="text-[10px] font-semibold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}