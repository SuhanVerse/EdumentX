import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUp,
  BadgeCheck,
  Check,
  Clock,
  Infinity,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react-native';

import { ProPill } from '@/src/components/shared/ProPill';
import { useUserStore } from '@/src/store/userStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';

// ─── Constants ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 15000;

type Status = 'checking' | 'pending' | 'confirmed' | 'failed' | 'error';

type Feature = {
  title: string;
  iconBg: string;
  iconColor: string;
  Icon: typeof Zap;
};

const UNLOCKED: Feature[] = [
  {
    title: '24-Hour Early Access',
    iconBg: 'rgba(234,179,8,0.10)',
    iconColor: '#CA8A04',
    Icon: Zap,
  },
  {
    title: 'AI Rental Suggestions',
    iconBg: 'rgba(26,107,74,0.10)',
    iconColor: '#1A6B4A',
    Icon: Sparkles,
  },
  {
    title: 'Priority Visit Requests',
    iconBg: 'rgba(59,130,246,0.10)',
    iconColor: '#3B82F6',
    Icon: ArrowUp,
  },
  {
    title: 'Unlimited Requests',
    iconBg: '#F5F5F5',
    iconColor: '#6B6B6B',
    Icon: Infinity,
  },
  {
    title: 'Pro Verified Badge',
    iconBg: 'rgba(26,107,74,0.10)',
    iconColor: '#1A6B4A',
    Icon: Shield,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transaction_uuid?: string }>();
  const supabase = useClerkSupabase();
  const activatePro = useUserStore((s) => s.activatePro);

  const [status, setStatus] = useState<Status>('checking');
  const [planName, setPlanName] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const transactionUuid = params.transaction_uuid;

  // ── Verify payment status on mount ──────────────────────────────
  const verifyPayment = useCallback(async () => {
    if (!transactionUuid) {
      setStatus('error');
      setErrorMsg('No transaction reference found.');
      return;
    }

    setStatus('checking');

    try {
      const { data, error } = await supabase.functions.invoke(
        'check-payment-status',
        { body: { transaction_uuid: transactionUuid } }
      );

      if (error) {
        console.error('check-payment-status error:', error);
        setStatus('error');
        setErrorMsg('Could not verify payment. Please check your Pro status later.');
        return;
      }

      const result = data as any;
      const txStatus = result?.status;

      if (txStatus === 'COMPLETE') {
        await onConfirmed(transactionUuid);
        return;
      }

      if (txStatus === 'FAILED' || txStatus === 'CANCELED') {
        setStatus('failed');
        return;
      }

      // Still PENDING — start polling
      setStatus('pending');
    } catch (err: any) {
      console.error('verifyPayment: unexpected error', err);
      setStatus('error');
      setErrorMsg(err?.message ?? 'Something went wrong.');
    }
  }, [transactionUuid, supabase]);

  // ── Handle confirmed payment ───────────────────────────────────
  const onConfirmed = useCallback(
    async (txUuid: string) => {
      setStatus('confirmed');

      let totalDays = 30; // default: monthly

      // Fetch the user_pass to get plan details.
      // user_passes & products tables exist in DB but not yet in generated types.
      // RLS policy (clerk_id = requesting_user_id()) ensures users only see their own rows.
      try {
        const { data: passData } = await supabase
          .from('user_passes' as any)
          .select('*, products(id, name)')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (passData) {
          const pd = passData as any;
          const productName = pd.products?.name ?? '';
          setPlanName(productName);
          setExpiresAt(
            new Date(pd.expires_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          );
          totalDays = pd.product_id === '3month' ? 90 : 30;
        }
      } catch (err) {
        console.error('Failed to fetch user_pass details:', err);
      }

      // Update local store so Profile reflects Pro immediately
      activatePro(totalDays);
    },
    [supabase, activatePro]
  );

  // ── Poll for pending transactions ──────────────────────────────
  useEffect(() => {
    if (status !== 'pending') return;

    const startTime = Date.now();
    const interval = setInterval(async () => {
      // Check if we've exceeded max poll time
      if (Date.now() - startTime > MAX_POLL_MS) {
        clearInterval(interval);
        setStatus('error');
        setErrorMsg(
          'We\'re still confirming your payment. Your Pro status should update shortly. Check back in a moment.'
        );
        return;
      }

      try {
        const { data } = await supabase.functions.invoke(
          'check-payment-status',
          { body: { transaction_uuid: transactionUuid } }
        );

        const result = data as any;
        const txStatus = result?.status;

        if (txStatus === 'COMPLETE') {
          clearInterval(interval);
          await onConfirmed(transactionUuid!);
        } else if (txStatus === 'FAILED' || txStatus === 'CANCELED') {
          clearInterval(interval);
          setStatus('failed');
        }
        // else still PENDING — keep polling
      } catch {
        // Silently retry on network errors during polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, transactionUuid, supabase, onConfirmed]);

  // ── Kick off verification on mount ─────────────────────────────
  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  // ── Loading / checking state ───────────────────────────────────
  if (status === 'checking' || status === 'pending') {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#1A6B4A" />
          <Text className="mt-4 text-center font-display text-[24px] leading-[28px] text-ink">
            {status === 'checking' ? 'Verifying Payment...' : 'Still Confirming...'}
          </Text>
          <Text className="mt-2 text-center font-sans text-[14px] text-ink2">
            {status === 'checking'
              ? 'Please wait while we verify your payment.'
              : 'This is taking longer than expected. Please hold on.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Failed state (eSewa callback said failed) ──────────────────
  if (status === 'failed') {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="h-20 w-20 items-center justify-center rounded-pill"
            style={{ backgroundColor: '#FEE2E2' }}>
            <View
              className="h-[60px] w-[60px] items-center justify-center rounded-pill"
              style={{
                backgroundColor: '#EF4444',
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}>
              <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
          <Text className="mt-6 text-center font-display text-[26px] leading-[30px] text-ink">
            Payment Not Completed
          </Text>
          <Text className="mt-2 text-center font-sans text-[14px] text-ink2">
            The payment was not completed on eSewa's end.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => router.replace('/(tenant)/pro-plan' as any)}
            className="mt-6 h-[54px] w-full items-center justify-center rounded-pill bg-brand">
            <Text className="font-sans text-[16px] font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (network issue or could not verify) ────────────
  if (status === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="h-20 w-20 items-center justify-center rounded-pill"
            style={{ backgroundColor: '#FEF3C7' }}>
            <View
              className="h-[60px] w-[60px] items-center justify-center rounded-pill"
              style={{
                backgroundColor: '#F59E0B',
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}>
              <Clock size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
          <Text className="mt-6 text-center font-display text-[24px] leading-[28px] text-ink">
            Checking Your Status
          </Text>
          <Text className="mt-2 text-center font-sans text-[14px] text-ink2">
            {errorMsg || 'We had trouble confirming your payment status.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to profile"
            onPress={() => router.replace('/(tenant)/(tabs)/profile' as any)}
            className="mt-6 h-[54px] w-full items-center justify-center rounded-pill bg-brand">
            <Text className="font-sans text-[16px] font-semibold text-white">
              Check My Profile
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confirmed success state ────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-6 pt-20">
          {/* Success icon */}
          <View className="items-center">
            <View
              className="h-24 w-24 items-center justify-center rounded-pill"
              style={{ backgroundColor: '#E8F5EE' }}>
              <View
                className="h-[72px] w-[72px] items-center justify-center rounded-pill bg-brand"
                style={{
                  shadowColor: '#1A6B4A',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.30,
                  shadowRadius: 20,
                  elevation: 8,
                }}>
                <Check size={24} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </View>

          {/* Headline */}
          <Text className="mt-6 text-center font-display text-[32px] leading-[36px] text-ink">
            You're Pro
          </Text>
          <Text className="mt-2 text-center font-sans text-[15px] text-ink2">
            BasoBas Pro activated
          </Text>

          {/* Pro Member pill */}
          <View className="mt-3.5 items-center">
            <ProPill label="PRO MEMBER" icon={BadgeCheck} />
          </View>

          {/* Transaction details */}
          {planName && (
            <Text className="mt-2 text-center font-sans text-[12px] text-ink3">
              {transactionUuid
                ? `Transaction: ${transactionUuid.slice(0, 8)}...`
                : ''}
            </Text>
          )}
          {expiresAt && (
            <Text className="mt-0.5 text-center font-sans text-[12px] font-medium text-brand">
              Valid until {expiresAt}
            </Text>
          )}

          {/* Unlocked section */}
          <View className="mt-7">
            <Text className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[1.2px] text-ink3">
              UNLOCKED FOR YOU
            </Text>
            {UNLOCKED.map((feature, idx) => (
              <View
                key={feature.title}
                className={`flex-row items-center py-[14px] ${
                  idx < UNLOCKED.length - 1 ? 'border-b border-divider' : ''
                }`}>
                <View
                  className="h-8 w-8 items-center justify-center rounded-pill"
                  style={{ backgroundColor: feature.iconBg }}>
                  <feature.Icon size={15} color={feature.iconColor} strokeWidth={2.2} />
                </View>
                <Text className="ml-3.5 flex-1 font-sans text-[14px] font-semibold text-ink">
                  {feature.title}
                </Text>
                <Check size={16} color="#1A6B4A" strokeWidth={2.5} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-6" style={{ paddingBottom: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start exploring"
          onPress={() => router.replace('/(tenant)/(tabs)/profile' as any)}
          className="h-[54px] w-full items-center justify-center rounded-pill bg-brand">
          <Text className="font-sans text-[16px] font-semibold text-white">View My Profile →</Text>
        </Pressable>
        <Text className="mt-3 text-center font-sans text-[12px] text-ink3">
          Manage subscription in Profile → Settings
        </Text>
      </View>
    </SafeAreaView>
  );
}
