import {
  Pressable,
  ScrollView,
  View,
  Text,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Clock,
  Lock,
  ShieldAlert,
  X,
} from 'lucide-react-native';

import { ScreenHeader } from '@/src/components/layout/ScreenHeader';

// ─── Failure reason mapping ────────────────────────────────────────────────

const REASON_INFO: Record<string, { title: string; description: string }> = {
  missing_data: {
    title: 'No data received',
    description: 'eSewa did not send back the required payment data. This usually means the payment was cancelled or did not complete on eSewa\'s side.',
  },
  signature_mismatch: {
    title: 'Security verification failed',
    description: 'The payment response could not be verified. This may indicate a tampered request.',
  },
  invalid_payload: {
    title: 'Invalid response from eSewa',
    description: 'The payment response was malformed or incomplete.',
  },
  transaction_not_found: {
    title: 'Transaction not found',
    description: 'We could not find a matching transaction for this payment.',
  },
  amount_mismatch: {
    title: 'Amount mismatch',
    description: 'The payment amount did not match what was expected.',
  },
  product_code_mismatch: {
    title: 'Product code mismatch',
    description: 'There was a configuration error with the payment.',
  },
  status_check_unavailable: {
    title: 'Verification unavailable',
    description: 'We could not verify the payment status with eSewa. Please check your Pro status later.',
  },
  esewa_status_failed: {
    title: 'Payment failed on eSewa',
    description: 'eSewa reported that the payment was not successful.',
  },
  esewa_status_canceled: {
    title: 'Payment cancelled',
    description: 'The payment was cancelled during processing.',
  },
  product_not_found: {
    title: 'Product configuration error',
    description: 'There was an issue with the plan configuration.',
  },
  cancelled: {
    title: 'Payment cancelled',
    description: 'You exited the payment before completing it.',
  },
  unknown: {
    title: 'Payment unsuccessful',
    description: 'We couldn\'t process your payment. Your account has not been charged.',
  },
};

const GENERAL_REASONS = [
  'Insufficient eSewa wallet balance',
  'Payment session expired or timed out',
  'Network error during payment',
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaymentFailedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transaction_uuid?: string;
    reason?: string;
  }>();

  const reason = params.reason ?? 'unknown';
  const reasonInfo = REASON_INFO[reason] ?? REASON_INFO.unknown;
  const isCancelled = reason === 'cancelled';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Payment" showBack />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-12">
          {/* Fail icon — varies by reason */}
          <View className="items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-pill"
              style={{ backgroundColor: isCancelled ? '#FEF3C7' : '#FEE2E2' }}>
              <View
                className="h-[60px] w-[60px] items-center justify-center rounded-pill"
                style={{
                  backgroundColor: isCancelled ? '#F59E0B' : '#EF4444',
                  shadowColor: isCancelled ? '#F59E0B' : '#EF4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: 6,
                }}>
                {isCancelled ? (
                  <Ban size={20} color="#FFFFFF" strokeWidth={2.5} />
                ) : reason === 'signature_mismatch' || reason === 'amount_mismatch' ? (
                  <ShieldAlert size={20} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <X size={20} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </View>
            </View>
          </View>

          {/* Headline */}
          <Text className="mt-6 text-center font-display text-[26px] leading-[30px] text-ink">
            {isCancelled ? 'Payment Cancelled' : 'Payment Unsuccessful'}
          </Text>

          {/* Reason */}
          <View className="mt-2.5 items-center">
            <Text className="text-center font-sans text-[15px] font-semibold text-ink">
              {reasonInfo.title}
            </Text>
            <Text className="mt-1 text-center font-sans text-[15px] leading-[22px] text-ink2">
              {reasonInfo.description}
            </Text>
          </View>

          {/* General reasons card */}

          {!isCancelled && reason === 'unknown' && (
            <View
              className="mt-6 rounded-[12px] border border-[#FECACA] bg-[#FFF5F5] p-4">
              <View className="flex-row items-center">
                <AlertTriangle size={15} color="#EF4444" strokeWidth={2.2} fill="#EF4444" />
                <Text className="ml-2 font-sans text-[14px] font-semibold text-ink">
                  What might have happened
                </Text>
              </View>

              <View className="mt-3">
                {GENERAL_REASONS.map((r) => (
                  <View key={r} className="mb-2 flex-row items-center last:mb-0">
                    <View
                      className="h-1.5 w-1.5 rounded-pill"
                      style={{ backgroundColor: '#AAAAAA' }}
                    />
                    <Text className="ml-2 flex-1 font-sans text-[13px] text-ink2">
                      {r}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Transaction reference (if available) */}
          {params.transaction_uuid && (
            <Text className="mt-4 text-center font-sans text-[11px] text-ink3">
              Ref: {params.transaction_uuid.slice(0, 12)}...
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom area */}
      <View className="px-6" style={{ paddingBottom: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try payment again"
          onPress={() => router.replace('/(tenant)/pro-plan' as any)}
          className="h-[54px] w-full items-center justify-center rounded-pill bg-brand">
          <Text className="font-sans text-[16px] font-semibold text-white">Try Again</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Contact support"
          onPress={() => Linking.openURL('mailto:support@basobas.app').catch(() => {})}
          className="mt-3.5 items-center">
          <Text
            className="font-sans text-[13px] text-brand"
            style={{ textDecorationLine: 'underline' }}>
            Need help? Contact Support
          </Text>
        </Pressable>

        <View className="mt-4 flex-row items-center justify-center">
          <Lock size={12} color="#AAAAAA" strokeWidth={2} />
          <Text className="ml-1.5 font-sans text-[11px] text-ink3">
            Your payment details are never stored on our servers
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
