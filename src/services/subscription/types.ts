/**
 * EdumentX — Pro Tutor subscription domain types
 *
 * The "Pro Tutor" tier is a sandbox eSewa-backed subscription that
 * unlocks elevated limits + marketplace visibility. The tier lives on
 * the tutor's profile (`users/{uid}/tutorProfile/default`) and is
 * mirrored onto the discovery doc (`tutors/{uid}`) so search + map
 * can rank and badge without a profile read per card.
 *
 * ⚠️ SANDBOX ONLY — the eSewa integration uses the public test
 * merchant (`EPAYTEST`) and must never be pointed at live merchant
 * credentials without an explicit, separate decision (see
 * `Documentation/04-Advanced-Features.md`).
 */

export type SubscriptionTier = "free" | "pro";

/** Monthly vs 3-month plans — prices are the SERVER-side source of
 *  truth (the Edge Function looks them up; the client never sends an
 *  amount, so a tampered client can't pay Rs 1 for a Rs 249 pass). */
export type ProPlanId = "monthly" | "3month";

export const PRO_PLANS: Record<
  ProPlanId,
  { id: ProPlanId; name: string; priceNpr: number; months: number; blurb: string }
> = {
  monthly: {
    id: "monthly",
    name: "Pro — Monthly",
    priceNpr: 249,
    months: 1,
    blurb: "30 days of Pro perks. Cancel anytime — just let it lapse.",
  },
  "3month": {
    id: "3month",
    name: "Pro — 3 Months",
    priceNpr: 549,
    months: 3,
    blurb: "Best value — 3 months for the price of ~2.",
  },
};

/** eSewa form fields returned by the `create-esewa-order` Edge
 *  Function, exactly as the auto-submitting WebView form needs them. */
export interface EsewaFormFields {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
  form_action_url: string;
}

/** The subscription state exposed to the UI. */
export interface SubscriptionState {
  tier: SubscriptionTier;
  expiresAt: number | null;
}

/** Result of verifying an eSewa callback payload.
 *
 *  `valid` means every server-side check passed (HMAC + ledger
 *  ownership/one-time-use + amount/product cross-check + eSewa status
 *  API COMPLETE). `alreadyGranted` is true when the SAME
 *  transaction_uuid was reconciled before — a replay — in which case
 *  the client must NOT re-grant (idempotent success). `reason` carries
 *  a machine-readable failure code for the error message. */
export interface VerifyEsewaResult {
  valid: boolean;
  alreadyGranted?: boolean;
  reason?: string;
  transaction_uuid?: string;
  payload?: Record<string, unknown>;
}
