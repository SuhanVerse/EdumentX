/**
 * PaymentMethodForm — shared "add/edit payment detail" form.
 *
 * Used by the student Payment Methods screen (adds a new method to
 * the list) and the tutor Payouts screen (replaces the single
 * payout method). Renders provider chips (eSewa / Khalti / IME Pay /
 * Bank) + a free-text identifier field + submit/cancel actions.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/colors";
import {
  PAYMENT_PROVIDERS,
  type PaymentProviderId,
} from "@/services/paymentMethods/providers";

const IDENTIFIER_MIN = 3;

export function PaymentMethodForm({
  initialProvider = null,
  initialIdentifier = "",
  identifierLabel,
  identifierPlaceholder,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: {
  initialProvider?: PaymentProviderId | null;
  initialIdentifier?: string;
  /** Label above the identifier input (e.g. "eWallet ID or account"). */
  identifierLabel: string;
  identifierPlaceholder: string;
  submitLabel: string;
  saving: boolean;
  onSubmit: (provider: string, identifier: string) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<PaymentProviderId | null>(
    initialProvider,
  );
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [touched, setTouched] = useState(false);

  const invalid =
    !provider || identifier.trim().length < IDENTIFIER_MIN;

  function handleSubmit() {
    setTouched(true);
    if (invalid || !provider) return;
    onSubmit(provider, identifier.trim());
  }

  return (
    <View className="bg-surface border border-border rounded-card p-4 gap-4">
      <Text className="text-label text-ink-muted">Payment provider</Text>
      <View className="flex-row flex-wrap gap-2">
        {PAYMENT_PROVIDERS.map((p) => {
          const selected = provider === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${p.label}`}
              accessibilityState={{ selected }}
              onPress={() => {
                setProvider(p.id);
                setTouched(false);
              }}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-pill border active:opacity-80 ${
                selected
                  ? "bg-accent-soft border-accent"
                  : "bg-surface border-border"
              }`}
            >
              <Ionicons
                name={p.icon}
                size={14}
                color={selected ? colors.brand.accent : colors.text.muted}
              />
              <Text
                className={`text-caption font-medium ${
                  selected ? "text-accent" : "text-text-secondary"
                }`}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View>
        <Text className="text-label text-ink-muted mb-2">
          {identifierLabel}
        </Text>
        <TextInput
          value={identifier}
          onChangeText={(v) => {
            setIdentifier(v);
            setTouched(false);
          }}
          placeholder={identifierPlaceholder}
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          className="bg-surface-muted border border-border rounded-card h-input px-4 text-body-lg text-text-primary"
        />
        {touched && invalid && (
          <Text className="text-caption text-danger mt-1.5">
            {!provider
              ? "Pick a payment provider"
              : `Enter at least ${IDENTIFIER_MIN} characters`}
          </Text>
        )}
      </View>

      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onCancel}
          disabled={saving}
          className="flex-1 min-h-btn rounded-card bg-surface-muted border border-border items-center justify-center active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-button font-semibold text-text-secondary">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          onPress={handleSubmit}
          disabled={saving}
          className="flex-1 min-h-btn rounded-card bg-accent items-center justify-center active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-button font-semibold text-text-inverse">
            {saving ? "Saving…" : submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
