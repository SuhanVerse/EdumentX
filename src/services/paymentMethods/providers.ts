/**
 * EdumentX — Payment methods / payout constants
 *
 * Zero-budget payment model: EdumentX never touches money. Students
 * agree with their tutor on a direct transfer (eSewa, Khalti, IME
 * Pay or bank) — these entries just record "how I'll pay / get
 * paid" so both sides have the details at hand. The provider list is
 * shared by the student "Payment methods" screen and the tutor
 * "Payouts" screen.
 */

import type { Ionicons } from "@expo/vector-icons";

export type PaymentProviderId =
  | "esewa"
  | "khalti"
  | "imepay"
  | "bank";

export interface PaymentProviderOption {
  id: PaymentProviderId;
  label: string;
  /** Display icon — a generic wallet/bank glyph (no brand icons). */
  icon: keyof typeof Ionicons.glyphMap;
}

export const PAYMENT_PROVIDERS: PaymentProviderOption[] = [
  { id: "esewa", label: "eSewa", icon: "wallet-outline" },
  { id: "khalti", label: "Khalti", icon: "wallet-outline" },
  { id: "imepay", label: "IME Pay", icon: "phone-portrait-outline" },
  { id: "bank", label: "Bank", icon: "business-outline" },
];

export function providerLabel(providerId: string): string {
  return (
    PAYMENT_PROVIDERS.find((p) => p.id === providerId)?.label ??
    providerId
  );
}
