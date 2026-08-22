/**
 * EdumentX — Pro Tutor Upgrade screen
 *
 * The "Pro Tutor" subscription flow (Phase 2, Advanced Architecture):
 *  1. The tutor picks a plan (monthly / 3-month).
 *  2. `createEsewaOrder` calls the Supabase Edge Function, which
 *     signs an eSewa v2 form server-side (HMAC-SHA256 — the secret
 *     key never touches the client) and returns the form fields.
 *  3. An auto-submitting HTML form renders inside a WebView
 *     (ported from the BasoBas reference project's eSewa flow).
 *  4. eSewa redirects to `edumentx://payment-success?...` (sandbox).
 *     The redirect is intercepted in `onShouldStartLoadWithRequest`,
 *     the callback `data` payload is verified against the server-side
 *     secret, and the Pro grant is written to the tutor's profile +
 *     discovery doc.
 *
 * ⚠️ SANDBOX ONLY — merchant code EPAYTEST. See
 * `Documentation/04-Advanced-Features.md` for the trust model.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { colors } from "@/constants/colors";
import { theme } from "@/constants/theme";
import { getSubscriptionRepository } from "@/services/subscription/dataSource";
import type {
  EsewaFormFields,
  ProPlanId,
  SubscriptionState,
  VerifyEsewaResult,
} from "@/services/subscription/types";
import { PRO_PLANS } from "@/services/subscription/types";
import { useAuthStore } from "@/store/authStore";

// ─── WebView user agent — avoid CAPTCHA/bot detection ─────────────
// eSewa's payment page is known to block stock WebView UAs. A real
// mobile browser UA sidesteps that (same trick as the BasoBas port).
const WEBVIEW_UA = Platform.select({
  android:
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  default:
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
});

// eSewa validates that success/failure URLs start with http(s) and
// REJECTS custom deep-link schemes (ES200 "Missing http or https").
// These are synthetic https hosts — the WebView intercepts the
// redirect in `onShouldStartLoadWithRequest` and cancels it BEFORE
// any network request happens, so the host never needs to resolve.
const SUCCESS_PREFIX = "https://edumentx.dev/payment-success";
const FAILED_PREFIX = "https://edumentx.dev/payment-failed";

/** Parse a query string into key/value pairs. */
function parseQuery(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const qs = url.includes("?") ? url.split("?")[1] : "";
    for (const part of qs.split("&")) {
      const [key, val] = part.split("=");
      if (key) {
        params[decodeURIComponent(key)] = val
          ? decodeURIComponent(val)
          : "";
      }
    }
  } catch {
    /* ignore malformed */
  }
  return params;
}

/** Build the auto-submitting eSewa form HTML (BasoBas port). */
function buildEsewaForm(fields: EsewaFormFields): string {
  const hiddenFields: { name: string; value: string }[] = [
    { name: "amount", value: fields.amount },
    { name: "tax_amount", value: fields.tax_amount },
    { name: "total_amount", value: fields.total_amount },
    { name: "transaction_uuid", value: fields.transaction_uuid },
    { name: "product_code", value: fields.product_code },
    { name: "product_service_charge", value: fields.product_service_charge },
    { name: "product_delivery_charge", value: fields.product_delivery_charge },
    { name: "success_url", value: "https://edumentx.dev/payment-success" },
    { name: "failure_url", value: "https://edumentx.dev/payment-failed" },
    { name: "signed_field_names", value: fields.signed_field_names },
    { name: "signature", value: fields.signature },
  ];
  const inputs = hiddenFields
    .map(
      (f) =>
        `    <input type="hidden" name="${f.name}" value="${f.value}" />`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to eSewa…</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #FAFAFA; color: #333; }
    .loader { text-align: center; }
    .spinner { width: 36px; height: 36px; border: 3px solid #E0E0E0;
               border-top-color: #2F5D50; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to eSewa payment…</p>
  </div>
  <form id="esewaForm" action="${fields.form_action_url}" method="POST" style="display:none">
${inputs}
  </form>
  <script>document.getElementById('esewaForm').submit();</script>
</body>
</html>`;
}

export function ProUpgradeScreen() {
  const router = useRouter();
  const tutorUid = useAuthStore((s) => s.user?.uid ?? null);
  const repo = getSubscriptionRepository();
  const insets = useSafeAreaInsets();

  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: "free",
    expiresAt: null,
  });
  const [selected, setSelected] = useState<ProPlanId>("monthly");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eSewa WebView state
  const [formHtml, setFormHtml] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Live tier subscription
  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeSubscription(
      tutorUid,
      setSubscription,
      (err) => console.warn("ProUpgrade: subscription subscribe failed", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  const isPro = subscription.tier === "pro";

  // Initiate the payment — get the signed form from the edge function.
  const handleUpgrade = useCallback(async () => {
    if (!tutorUid || creating || verifying) return;
    setCreating(true);
    setError(null);
    try {
      const fields = await repo.createEsewaOrder(selected);
      let origin: string | undefined;
      try {
        origin = new URL(fields.form_action_url).origin;
      } catch {
        origin = undefined;
      }
      setFormHtml(buildEsewaForm(fields));
      setBaseUrl(origin);
      setWebViewLoading(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setCreating(false);
    }
  }, [repo, selected, tutorUid, creating, verifying]);

  const finishPayment = useCallback(
    async (status: string, query: Record<string, string>) => {
      setWebViewLoading(false);
      const data = query.data;
      if (status === "success") {
        // Verify the callback payload server-side before granting Pro:
        // HMAC signature + ledger one-time-use + amount/product
        // cross-check + eSewa status API.
        setVerifying(true);
        try {
          const result: VerifyEsewaResult = data
            ? await repo.verifyEsewaCallback(data)
            : { valid: false, reason: "missing_data" };
          if (!result.valid) {
            setError(
              result.reason === "status_check_unavailable"
                ? "Payment verification is temporarily unavailable. If you were charged, retry — the transaction is safe to reconcile."
                : "Payment could not be verified. No charge was applied — please try again.",
            );
            return;
          }
          // Replays of an already-reconciled transaction report valid
          // with alreadyGranted=true — never re-grant (no stacking).
          if (!result.alreadyGranted) {
            // The months come from OUR product table (server PRODUCTS
            // is the price source), not from the eSewa payload.
            await repo.applyProGrant(
              tutorUid ?? "",
              PRO_PLANS[selected].months,
            );
          }
          setSuccess(true);
          setFormHtml(null);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Verification failed. Contact support if you were charged.",
          );
        } finally {
          setVerifying(false);
        }
      } else {
        setError("Payment was cancelled or failed. You have not been charged.");
        setFormHtml(null);
      }
    },
    [repo, selected, tutorUid],
  );

  // Intercept the deep-link redirect BEFORE the WebView loads it.
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;
      if (url.includes("/payment-success")) {
        finishPayment("success", parseQuery(url));
        return false;
      }
      if (url.includes("/payment-failed")) {
        finishPayment("failed", parseQuery(url));
        return false;
      }
      return true;
    },
    [finishPayment],
  );

  // Fallback interceptor — fires after navigation, catches deep links
  // that onShouldStartLoadWithRequest misses on some platforms.
  const handleNavigationStateChange = useCallback(
    (navState: { url: string }) => {
      const url = navState.url;
      if (url.includes("/payment-success")) {
        finishPayment("success", parseQuery(url));
      } else if (url.includes("/payment-failed")) {
        finishPayment("failed", parseQuery(url));
      }
    },
    [finishPayment],
  );

  const closeWebView = useCallback(() => {
    setFormHtml(null);
    setWebViewLoading(false);
  }, []);

  const expiryLabel = useMemo(() => {
    if (!subscription.expiresAt) return null;
    return new Date(subscription.expiresAt).toLocaleDateString();
  }, [subscription.expiresAt]);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Text className="text-body text-text-secondary mb-0.5">Tutor subscription</Text>
        <Text className="text-screen-title font-medium text-text-primary">
          Go Pro
        </Text>
      </ScreenHeader>

      <ScreenScroll>
        {success ? (
          <View className="px-5 py-10 items-center">
            <View className="w-16 h-16 rounded-pill bg-verification-light items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={34} color={colors.brand.verification} />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">                You&apos;re Pro! 🎉
            </Text>
            <Text className="text-body text-text-secondary text-center mt-2">
              Your Pro badge is live and your higher limits are active.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              className="mt-8 h-11 px-8 rounded-card bg-primary items-center justify-center active:opacity-80"
            >
              <Text className="text-button-sm font-semibold text-white">
                Back to dashboard
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Status banner */}
            <View className="mx-5 mt-4">
              {isPro ? (
                <View className="flex-row items-center gap-2.5 bg-verification-light rounded-card px-4 py-3">
                  <Ionicons name="sparkles" size={18} color={colors.brand.verification} />
                  <View className="flex-1">
                    <Text className="text-button-sm font-medium text-verification">
                      Pro active
                    </Text>
                    {expiryLabel ? (
                      <Text className="text-caption text-text-secondary">
                        Renews / expires {expiryLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-card px-4 py-3">
                  <Text className="text-button-sm font-medium text-text-primary">
                    Free tier
                  </Text>
                  <Text className="text-caption text-text-muted mt-0.5">
                    Upgrade for bigger batches, priority visibility, and the
                    Pro badge.
                  </Text>
                </View>
              )}
            </View>

            {/* Perks */}
            <View className="mx-5 mt-4 bg-surface border border-border rounded-card p-4 gap-3">
              <Text className="text-caption font-medium text-text-primary uppercase tracking-wider">
                Pro perks
              </Text>
              <Perk icon="people" text="Raised student & batch limits" />
              <Perk icon="navigate" text="Priority spot in tutor search" />
              <Perk icon="sparkles" text="Pro badge on your profile & cards" />
            </View>

            {/* Plan picker */}
            <View className="mx-5 mt-4 gap-3">
              {(Object.keys(PRO_PLANS) as ProPlanId[]).map((id) => {
                const p = PRO_PLANS[id];
                const active = selected === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    onPress={() => setSelected(id)}
                    className={`flex-row items-center gap-3 rounded-card border p-4 active:opacity-80 ${
                      active
                        ? "border-amber bg-amber-light"
                        : "border-border bg-surface"
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-pill border-2 items-center justify-center ${
                        active ? "border-amber" : "border-border"
                      }`}
                    >
                      {active ? (
                        <View className="w-2.5 h-2.5 rounded-pill bg-amber" />
                      ) : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-button-sm font-medium text-text-primary">
                        {p.name}
                      </Text>
                      <Text className="text-caption text-text-muted mt-0.5">
                        {p.blurb}
                      </Text>
                    </View>
                    <Text className="text-card-title font-semibold text-text-primary">
                      Rs {p.priceNpr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <View className="mx-5 mt-4 bg-danger-bg rounded-card px-4 py-3">
                <Text className="text-caption text-danger">{error}</Text>
              </View>
            ) : null}

            <View className="mx-5 mt-4 mb-8">
              <Pressable
                accessibilityRole="button"
                disabled={creating || verifying || isPro}
                onPress={handleUpgrade}
                className="h-12 rounded-card bg-primary items-center justify-center active:opacity-80 disabled:opacity-50"
              >
                {creating || verifying ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text className="text-button font-semibold text-white">
                    {isPro ? "Already Pro" : `Upgrade — Rs ${PRO_PLANS[selected].priceNpr}`}
                  </Text>
                )}
              </Pressable>
              <Text className="text-micro text-text-muted text-center mt-3">
                Sandbox test payment — no real charge. eSewa test PIN works in the
                payment page.
              </Text>
              {!isPro && (
                <Pressable
                  accessibilityRole="button"
                  disabled={creating || verifying}
                  onPress={async () => {
                    if (!tutorUid || creating || verifying) return;
                    setCreating(true);
                    try {
                      await repo.applyProGrant(
                        tutorUid,
                        PRO_PLANS[selected].months,
                      );
                      setSuccess(true);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Demo grant failed.",
                      );
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="h-10 mt-4 rounded-card border border-border bg-surface items-center justify-center active:opacity-80"
                >
                  <Text className="text-caption font-medium text-text-secondary">
                    Demo — Skip eSewa (sandbox is down)
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScreenScroll>

      {/* ── eSewa Payment Modal ──────────────────────────────────── */}
      <Modal
        visible={!!formHtml}
        animationType="slide"
        onRequestClose={closeWebView}
      >
        <View className="flex-1 bg-background">
          {/* Header — branded, back-button, safe-area aware */}
          <View
            className="flex-row items-center gap-3 border-b border-border bg-surface px-4"
            style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={closeWebView}
              className="h-9 w-9 items-center justify-center rounded-pill bg-surface-muted active:opacity-70"
            >
              <Ionicons name="arrow-back" size={18} color={colors.text.primary} />
            </Pressable>
            <Text className="flex-1 text-button-sm font-medium text-text-primary">
              eSewa Payment
            </Text>
          </View>

          {/* WebView — fills remaining space */}
          {formHtml ? (
            <WebView
              ref={webViewRef}
              source={{ html: formHtml, baseUrl }}
              userAgent={WEBVIEW_UA}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadEnd={() => setWebViewLoading(false)}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              // ── Cookie support (critical for reCAPTCHA) ──────────────
              // Google reCAPTCHA validates sessions via third-party cookies.
              // Without these, the captcha silently fails and eSewa's
              // login rejects the request with "Invalid username or
              // Password/MPIN" — the same symptom as wrong credentials.
              // Verified by comparing with the working BasoBas reference
              // project (Documentation/98-Reference-BasoBas/basobas-app).
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              mixedContentMode="always"
              // Allow all URL schemes — needed for deep-link interception
              // (edumentx://…) and eSewa's redirect flow.
              originWhitelist={["*"]}
              // Disable swipe-back so the user doesn't accidentally
              // navigate away mid-payment.
              allowsBackForwardNavigationGestures={false}
              onError={(e) => {
                console.error("eSewa WebView error:", e.nativeEvent.description);
                setError("Payment page failed to load. Please try again.");
                setFormHtml(null);
              }}
              style={{ flex: 1, backgroundColor: theme.colors.background }}
            />
          ) : null}

          {/* Branded loading overlay */}
          {webViewLoading && (
            <View className="absolute inset-0 items-center justify-center bg-background/80">
              <View className="items-center rounded-card bg-surface px-8 py-6 shadow-sm">
                <ActivityIndicator size="small" color={colors.brand.primary} />
                <Text className="text-caption text-text-muted mt-3">
                  Loading eSewa payment page…
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </ScreenLayout>
  );
}

function Perk({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="w-8 h-8 rounded-pill bg-amber-light items-center justify-center">
        <Ionicons name={icon} size={15} color={colors.brand.accent} />
      </View>
      <Text className="flex-1 text-body-sm text-text-secondary">{text}</Text>
    </View>
  );
}
