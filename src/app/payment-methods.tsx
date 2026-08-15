/**
 * EdumentX — Payment Methods screen (student)
 *
 * Live list of the student's saved payment details — the methods
 * they'll use to pay their tutor directly (eSewa / Khalti / IME Pay /
 * bank). EdumentX never processes payments; these entries are just
 * "how I'll pay" references stored on the student's own profile doc.
 *
 * Data: `users/{uid}/studentProfile/default.paymentMethods` map via
 * `services/paymentMethods/`. Add uses the shared
 * `PaymentMethodForm`; each row can be removed with one tap.
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

function providerIcon(providerId: string) {
  return (
    PAYMENT_PROVIDERS.find((p) => p.id === providerId)?.icon ??
    "wallet-outline"
  );
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const repo = getPaymentMethodsRepository();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    const unsub = repo.subscribePaymentMethods(
      user.uid,
      "student",
      (list) => {
        setMethods(list);
        setLoaded(true);
      },
      (err) => {
        console.warn("PaymentMethods: subscribe failed", err);
        setLoaded(true);
      },
    );
    return unsub;
  }, [user, repo]);

  async function handleAdd(provider: string, identifier: string) {
    if (!user) return;
    setSaving(true);
    try {
      await repo.savePaymentMethod(user.uid, "student", provider, identifier);
      setAdding(false);
    } catch (err) {
      console.warn("PaymentMethods: save failed", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(methodId: string) {
    if (!user) return;
    setBusyId(methodId);
    try {
      await repo.removePaymentMethod(user.uid, "student", methodId);
    } catch (err) {
      console.warn("PaymentMethods: remove failed", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between">
          <View className="self-start border-b-2 border-accent pb-0.5">
            <Text className="text-display text-text-primary">
              Payment methods
            </Text>
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
          {loaded
            ? `${methods.length} method${methods.length === 1 ? "" : "s"} saved`
            : "Loading…"}
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color="#2F5D50" />
          </View>
        ) : (
          <View className="gap-4">
            {/* Payment methods list */}
            {methods.length === 0 ? (
              <View className="items-center justify-center pt-10 px-6">
                <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
                  <Ionicons name="card-outline" size={26} color="#E5A03B" />
                </View>
                <Text className="text-card-title font-medium text-text-primary text-center">
                  No payment methods yet
                </Text>
                <Text className="text-body-sm text-text-muted text-center mt-1.5">
                  Add how you&apos;ll pay your tutor — eSewa, Khalti,
                  IME Pay or bank.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {methods.map((m) => (
                  <View
                    key={m.id}
                    className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-3"
                  >
                    <View className="w-10 h-10 rounded-pill bg-accent-soft items-center justify-center">
                      <Ionicons
                        name={providerIcon(m.provider)}
                        size={18}
                        color={colors.brand.accent}
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-card-title text-text-primary font-medium">
                        {providerLabel(m.provider)}
                      </Text>
                      <Text
                        className="text-caption text-text-muted mt-0.5"
                        numberOfLines={1}
                      >
                        {m.identifier}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${providerLabel(m.provider)} method`}
                      onPress={() => handleRemove(m.id)}
                      disabled={busyId === m.id}
                      hitSlop={8}
                      className="w-9 h-9 rounded-pill bg-surface-muted border border-border items-center justify-center active:opacity-70 disabled:opacity-50"
                    >
                      <Ionicons
                        name={busyId === m.id ? "ellipsis-horizontal" : "trash-outline"}
                        size={16}
                        color={colors.semantic.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Add form (inline expand) */}
            {adding ? (
              <PaymentMethodForm
                identifierLabel="eWallet ID or account"
                identifierPlaceholder="e.g. 98XXXXXXXX / bank + account"
                submitLabel="Save method"
                saving={saving}
                onSubmit={handleAdd}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add payment method"
                onPress={() => setAdding(true)}
                className="flex-row items-center justify-center gap-2 min-h-btn rounded-card border-2 border-dashed border-border bg-surface active:opacity-70"
              >
                <Ionicons name="add" size={18} color={colors.brand.accent} />
                <Text className="text-button font-semibold text-accent">
                  Add payment method
                </Text>
              </Pressable>
            )}

            <Text className="text-caption text-text-muted px-1 leading-relaxed">
              EdumentX doesn&apos;t process payments. You settle fees
              directly with your tutor using the method above.
            </Text>
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
