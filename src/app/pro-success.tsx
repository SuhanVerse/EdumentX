/**
 * EdumentX — Pro activation success (`/pro-success`)
 *
 * Landed here from ProUpgradeScreen after `verifyEsewaCallback`
 * returned valid — the tier was ALREADY granted server-side by the
 * edge function (Aug 24 audit fix; there is no client grant path).
 * This screen confirms activation, shows the live expiry from the
 * subscription snapshot, and routes back to the dashboard.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  ScreenHeader,
  ScreenLayout,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { getSubscriptionRepository } from "@/services/subscription/dataSource";
import {
  PRO_PLANS,
  type ProPlanId,
  type SubscriptionState,
} from "@/services/subscription/types";
import { useAuthStore } from "@/store/authStore";

const BENEFITS = [
  "Raise your active-student capacity beyond the free cap",
  "Unlimited group batches",
  "Priority placement in student search & map",
];

function fmtExpiry(ms: number | null): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProSuccessScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const planParam = useLocalSearchParams<{ plan?: string }>().plan;
  const plan: ProPlanId | undefined =
    planParam === "monthly" || planParam === "3month" ? planParam : undefined;

  const [sub, setSub] = useState<SubscriptionState | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = getSubscriptionRepository().subscribeSubscription(
      user.uid,
      (state) => setSub(state),
      (err) => console.warn("[ProSuccess] subscribe failed", err),
    );
    return unsub;
  }, [user]);

  const expiry = fmtExpiry(sub?.expiresAt ?? null);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">Pro activated</ScreenHeader>
      <ScreenScroll>
        <View className="items-center pt-6 pb-4">
          <View className="w-20 h-20 rounded-pill bg-verification-light items-center justify-center mb-4">
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.brand.verification}
            />
          </View>
          <Text className="text-card-title font-semibold text-text-primary text-center">
            You&apos;re Pro
            {plan ? ` — ${PRO_PLANS[plan].name}` : ""}
          </Text>
          <Text className="text-body-sm text-text-muted text-center mt-2 px-6">
            Payment verified. Your tutor account now runs with elevated
            limits.
          </Text>
        </View>

        <View className="bg-surface border border-border rounded-card p-4 mb-4 gap-3">
          <Text className="text-button-sm font-semibold text-text-primary">
            What&apos;s unlocked
          </Text>
          {BENEFITS.map((b) => (
            <View key={b} className="flex-row items-start gap-2.5">
              <Ionicons
                name="checkmark"
                size={16}
                color={colors.brand.verification}
              />
              <Text className="text-body-sm text-text-secondary flex-1">
                {b}
              </Text>
            </View>
          ))}
          {expiry ? (
            <View className="flex-row items-start gap-2.5 mt-1">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text className="text-body-sm text-text-muted flex-1">
                Active until {expiry}
              </Text>
            </View>
          ) : null}
        </View>

        <PrimaryButton
          label="Back to dashboard"
          onPress={() => router.replace("/tutor-home")}
        />
      </ScreenScroll>
    </ScreenLayout>
  );
}
