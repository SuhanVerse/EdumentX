import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, X } from 'lucide-react-native';

import type { EsewaFormFields } from '@/src/hooks/usePurchasePlan';

// ─── User Agent for WebView ────────────────────────────────────────────────
// Custom user agent to prevent CAPTCHA/bot detection on eSewa's payment page.
// WebViews are often detected by CAPTCHA services and blocked.
// Using a real mobile browser UA avoids this issue.
const WEBVIEW_UA = Platform.select({
  android:
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  default:
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
});

// ─── Deep Link Scheme ──────────────────────────────────────────────────────
// The Edge Functions redirect to basobas://payment-success?transaction_uuid=...
// We intercept these in the WebView before they load.
const SUCCESS_PREFIX = 'basobas://payment-success';
const FAILED_PREFIX = 'basobas://payment-failed';

// ─── Helper: parse query string from a URL ─────────────────────────────────
function parseQuery(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const qs = url.includes('?') ? url.split('?')[1] : '';
    for (const part of qs.split('&')) {
      const [key, val] = part.split('=');
      if (key) params[decodeURIComponent(key)] = val ? decodeURIComponent(val) : '';
    }
  } catch {
    /* ignore malformed */
  }
  return params;
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function EsewaWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    formData?: string; // JSON-serialized EsewaFormFields
  }>();

  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse the serialized form data from navigation params
  // Use useMemo to derive both formFields and error synchronously
  // without calling setState during render.
  const { formHtml, baseUrl, parseError } = useMemo(() => {
    if (!params.formData) {
      return {
        formHtml: '',
        baseUrl: undefined,
        parseError: 'Missing payment data.',
      };
    }

    try {
      const fields = JSON.parse(params.formData) as EsewaFormFields;
      // Use eSewa's own origin as the document base URL. When the inline
      // form POSTs to eSewa, the request Origin becomes eSewa's domain
      // instead of "null" (about:blank). A "null" Origin frequently trips
      // Cloudflare/reCAPTCHA bot checks on eSewa's payment page.
      let origin: string | undefined;
      try {
        origin = new URL(fields.form_action_url).origin;
      } catch {
        origin = undefined;
      }
      return {
        formHtml: buildEsewaForm(fields),
        baseUrl: origin,
        parseError: null,
      };
    } catch {
      return {
        formHtml: '',
        baseUrl: undefined,
        parseError: 'Invalid payment data received.',
      };
    }
  }, [params.formData]);

  // Sync parseError into state (runs after render, not during)
  useEffect(() => {
    setError(parseError);
  }, [parseError]);

  // ── Intercept deep link redirects before they load ────────────────────
  // `onShouldStartLoadWithRequest` is called BEFORE navigation and can
  // return false to block the load. This is the correct way to prevent
  // the WebView from rendering the Edge Function's response.
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;

      if (url.startsWith(SUCCESS_PREFIX)) {
        const query = parseQuery(url);
        const transactionUuid = query.transaction_uuid;
        router.replace(
          `/(tenant)/payment-success?transaction_uuid=${transactionUuid ?? ''}` as any
        );
        return false;
      }

      if (url.startsWith(FAILED_PREFIX)) {
        const query = parseQuery(url);
        const transactionUuid = query.transaction_uuid;
        const reason = query.reason ?? 'unknown';
        router.replace(
          `/(tenant)/payment-failed?transaction_uuid=${transactionUuid ?? ''}&reason=${reason}` as any
        );
        return false;
      }

      return true;
    },
    [router]
  );

  // Watch navigation state changes to intercept basobas:// deep links
  // (fires after navigation, as a fallback for onShouldStartLoadWithRequest).
  // for scenarios where onShouldStartLoadWithRequest isn't called.
  const handleNavigationStateChange = useCallback(
    (navState: { url: string }) => {
      const url = navState.url;

      if (url.startsWith(SUCCESS_PREFIX)) {
        const query = parseQuery(url);
        const transactionUuid = query.transaction_uuid;
        router.replace(
          `/(tenant)/payment-success?transaction_uuid=${transactionUuid ?? ''}` as any
        );
      } else if (url.startsWith(FAILED_PREFIX)) {
        const query = parseQuery(url);
        const transactionUuid = query.transaction_uuid;
        const reason = query.reason ?? 'unknown';
        router.replace(
          `/(tenant)/payment-failed?transaction_uuid=${transactionUuid ?? ''}&reason=${reason}` as any
        );
      }
    },
    [router]
  );

  // ── Manual back/cancel — navigate back to Pro Plan ────────────────────
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="h-16 w-16 items-center justify-center rounded-pill"
            style={{ backgroundColor: '#FEE2E2' }}>
            <View className="h-12 w-12 items-center justify-center rounded-pill bg-[#EF4444]">
              <X size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
          <Text className="mt-4 text-center font-sans font-semibold text-[16px] text-ink">
            Unable to start payment
          </Text>
          <Text className="mt-2 text-center font-sans text-[14px] text-ink2">{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleCancel}
            className="mt-6 h-[48px] items-center justify-center rounded-pill bg-brand px-8">
            <Text className="font-sans font-semibold text-[15px] text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel payment"
          onPress={handleCancel}
          className="h-10 w-10 items-center justify-center rounded-pill bg-input">
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
        <Text className="font-sans font-semibold text-[15px] text-ink">eSewa Payment</Text>
        <View className="w-10" />
      </View>

      <View className="h-px w-full bg-line" />

      {loading && (
        <View className="absolute inset-0 z-10 items-center justify-center bg-bg/90">
          <ActivityIndicator size="large" color="#1A6B4A" />
          <Text className="mt-3 font-sans text-[14px] text-ink2">Redirecting to eSewa...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: formHtml, baseUrl }}
        style={styles.webview}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={() => setLoading(false)}
        onError={(event) => {
          console.error('EsewaWebView error:', event.nativeEvent.description);
          setError('Failed to load the payment page. Please try again.');
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        allowsBackForwardNavigationGestures={false}
        javaScriptCanOpenWindowsAutomatically
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        userAgent={WEBVIEW_UA}
      />
    </SafeAreaView>
  );
}

// ─── eSewa Form Builder ────────────────────────────────────────────────────

function buildEsewaForm(fields: EsewaFormFields): string {
  const hiddenFields: { name: string; value: string | number }[] = [
    { name: 'amount', value: fields.amount },
    { name: 'tax_amount', value: fields.tax_amount },
    { name: 'total_amount', value: fields.total_amount },
    { name: 'transaction_uuid', value: fields.transaction_uuid },
    { name: 'product_code', value: fields.product_code },
    { name: 'product_service_charge', value: fields.product_service_charge },
    { name: 'product_delivery_charge', value: fields.product_delivery_charge },
    { name: 'success_url', value: fields.success_url },
    { name: 'failure_url', value: fields.failure_url },
    { name: 'signed_field_names', value: fields.signed_field_names },
    { name: 'signature', value: fields.signature },
  ];

  const inputs = hiddenFields
    .map((f) => `    <input type="hidden" name="${f.name}" value="${f.value}" />`)
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to eSewa...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;  
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #FAFAFA;
      color: #333;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E0E0E0;
      border-top-color: #1A6B4A;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to eSewa payment...</p>
  </div>
  <form id="esewaForm" action="${fields.form_action_url}" method="POST" style="display:none">
${inputs}
  </form>
  <script>
    document.getElementById('esewaForm').submit();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});
