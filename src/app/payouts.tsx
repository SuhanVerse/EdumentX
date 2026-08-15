/**
 * EdumentX — Payouts screen (tutor)
 *
 * Two cards:
 *   1. Payout method — where the tutor receives payments directly
 *      (eSewa / Khalti / IME Pay / bank). Stored as a single
 *      `payoutMethod` object on `users/{uid}/tutorProfile/default`.
 *   2. Monthly earnings — derived LIVE from the tutor's roster
 *      (`subscribeEnrollments` count × `monthlyRateNpr`), so it
 *      updates as students join. EdumentX charges no commission.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { PaymentMethodForm } from "@/components/domain/PaymentMethodForm";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { getPaymentMethodsRepository } from "@/services/paymentMethods/dataSource";
import {
  providerLabel,
  PAYMENT_PROVIDERS,
} from "@/services/paymentMethods/providers";
import type { PaymentMethod } from "@/services/paymentMethods/PaymentMethodsRepository";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { fetchTutorProfile } from "@/services/tutors/dataSource";

function providerIcon(providerId: string) {
  return (
    PAYMENT_PROVIDERS.find((p) => p.id === providerId)?.icon ??
    "wallet-outline"
  );
}

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString("en-NP")}`;
}

export default function PayoutsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const paymentsRepo = getPaymentMethodsRepository();
  const enrollRepo = getEnrollmentRepository();

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [rosterCount, setRosterCount] = useState(0);
  const [monthlyRate, setMonthlyRate] = useState(0);

  const uid = user?.uid;

  // Payout method (single, live).
  useEffect(() => {
    if (!uid) {
      setLoaded(true);
      return;
    }
    const unsub = paymentsRepo.subscribePaymentMethods(
      uid,
      "tutor",
      (list) => {
        setMethod(list[0] ?? null);
        setLoaded(true);
      },
      (err) => {
        console.warn("Payouts: subscribe failed", err);
        setLoaded(true);
      },
    );
    return unsub;
  }, [uid, paymentsRepo]);

  // Live roster count for the earnings card.
  useEffect(() => {
    if (!uid) return;
    const unsub = enrollRepo.subscribeEnrollments(
      uid,
      (list) => setRosterCount(list.length),
      (err) =>
        console.warn("Payouts: roster subscribe failed", err),
    );
    return unsub;
  }, [uid, enrollRepo]);

  // Monthly rate from the live tutor profile.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchTutorProfile(uid)
      .then((profile) => {
        if (!cancelled) setMonthlyRate(profile?.monthlyRateNpr ?? 0);
      })
      .catch((err) =>
        console.warn("Payouts: profile fetch failed", err),
      );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function handleSave(provider: string, identifier: string) {
    if (!uid) return;
    setSaving(true);
    try {
      await paymentsRepo.savePaymentMethod(
        uid,
        "tutor",
        provider,
        identifier,
      );
      setEditing(false);
    } catch (err) {
      console.warn("Payouts: save failed", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!uid) return;
    setRemoving(true);
    try {
      await paymentsRepo.removePaymentMethod(uid, "tutor", "default");
    } catch (err) {
      console.warn("Payouts: remove failed", err);
    } finally {
      setRemoving(false);
    }
  }

  const potentialMonthly = rosterCount * monthlyRate;

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between">
          <View className="self-start border-b-2 border-accent pb-0.5">
            <Text className="text-display text-text-primary">Payouts</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-9 h-9 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#2F5D50" />
          </Pressable>
        </View>
        <Text className="text-body text-text-secondary mt-0.5">
          How you receive payments
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color="#2F5D50" />
          </View>
        ) : (
          <View className="gap-6">
            {/* Payout method */}
            <View>
              <Text className="text-label text-ink-muted mb-2">
                Payout method
              </Text>
              {editing ? (
                <PaymentMethodForm
                  initialProvider={(method?.provider as never) ?? null}
                  initialIdentifier={method?.identifier ?? ""}
                  identifierLabel="Bank or eWallet details"
                  identifierPlaceholder="e.g. bank + account / eWallet ID"
                  submitLabel="Save payout method"
                  saving={saving}
                  onSubmit={handleSave}
                  onCancel={() => setEditing(false)}
                />
              ) : method ? (
                <View className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-pill bg-accent-soft items-center justify-center">
                    <Ionicons
                      name={providerIcon(method.provider)}
                      size={18}
                      color={colors.brand.accent}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-card-title text-text-primary font-medium">
                      {providerLabel(method.provider)}
                    </Text>
                    <Text
                      className="text-caption text-text-muted mt-0.5"
                      numberOfLines={1}
                    >
                      {method.identifier}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Change payout method"
                      onPress={() => setEditing(true)}
                      className="px-3 py-2 rounded-pill bg-surface-muted border border-border active:opacity-70"
                    >
                      <Text className="text-micro font-semibold text-text-secondary">
                        Change
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove payout method"
                      onPress={handleRemove}
                      disabled={removing}
                      className="px-3 py-2 rounded-pill bg-surface-muted border border-border active:opacity-70 disabled:opacity-50"
                    >
                      <Text className="text-micro font-semibold text-danger">
                        {removing ? "…" : "Remove"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add payout method"
                  onPress={() => setEditing(true)}
                  className="flex-row items-center justify-center gap-2 min-h-btn rounded-card border-2 border-dashed border-border bg-surface active:opacity-70"
                >
                  <Ionicons name="add" size={18} color={colors.brand.accent} />
                  <Text className="text-button font-semibold text-accent">
                    Add payout method
                  </Text>
                </Pressable>
              )}
              <Text className="text-caption text-text-muted mt-2 px-1">
                Students pay you directly — EdumentX never holds your money.
              </Text>
            </View>

            {/* Earnings summary */}
            <View>
              <Text className="text-label text-ink-muted mb-2">
                Monthly earnings
              </Text>
              <View className="bg-surface border border-border rounded-card p-5">
                <Text className="text-display text-text-primary font-bold">
                  {formatNpr(potentialMonthly)}
                </Text>
                <Text className="text-caption text-text-muted mt-1">
                  {rosterCount} enrolled student
                  {rosterCount === 1 ? "" : "s"} ×{" "}
                  {formatNpr(monthlyRate)}/mo
                </Text>
                <View className="mt-4 flex-row items-center gap-1.5">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={colors.brand.verification}
                  />
                  <Text className="text-caption text-text-secondary">
                    No commission — you keep 100%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
