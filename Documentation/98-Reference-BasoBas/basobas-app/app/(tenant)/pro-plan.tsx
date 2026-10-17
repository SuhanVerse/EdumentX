import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, ArrowUp, Check, Infinity, Shield, Sparkles, Zap } from 'lucide-react-native';

import { ProPill } from '@/src/components/shared/ProPill';
import { useUserStore } from '@/src/store/userStore';
import { usePurchasePlan } from '@/src/hooks/usePurchasePlan';

type PlanId = '15day' | '30day';

type Plan = {
  id: PlanId;
  label: string;
  price: string;
  /** "for 15 days" — shown under the big price. */
  subtitle: string;
};

const PLANS: Plan[] = [
  { id: '15day', label: '15 Days', price: 'NPR 149', subtitle: 'for 15 days' },
  { id: '30day', label: '30 Days', price: 'NPR 249', subtitle: 'for 30 days' },
];

type Feature = {
  title: string;
  benefit: string;
  iconBg: string;
  iconColor: string;
  Icon: typeof Zap;
};

const FEATURES: Feature[] = [
  {
    title: '24hr Early Access',
    benefit: 'See listings before anyone else',
    iconBg: 'rgba(234,179,8,0.10)',
    iconColor: '#CA8A04',
    Icon: Zap,
  },
  {
    title: 'AI Rental Suggestions',
    benefit: 'Smart picks from your preferences',
    iconBg: 'rgba(26,107,74,0.10)',
    iconColor: '#1A6B4A',
    Icon: Sparkles,
  },
  {
    title: 'Priority Visit Requests',
    benefit: "Top of every landlord's inbox",
    iconBg: 'rgba(59,130,246,0.10)',
    iconColor: '#3B82F6',
    Icon: ArrowUp,
  },
  {
    title: 'Unlimited Requests',
    benefit: 'No 3-request cap, ever',
    iconBg: '#F5F5F5',
    iconColor: '#6B6B6B',
    Icon: Infinity,
  },
  {
    title: 'Pro Verified Badge',
    benefit: 'Show landlords you are serious',
    iconBg: 'rgba(26,107,74,0.10)',
    iconColor: '#1A6B4A',
    Icon: Shield,
  },
];

export default function ProPlanScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>('30day');
  const isPro = useUserStore((s) => s.profile.pro.active);
  const proExpiresAt = useUserStore((s) => s.profile.pro.expiresAt);
  const { loading, error, formFields, purchasePlan, reset } = usePurchasePlan();

  const currentPlan = PLANS.find((p) => p.id === selected)!;

  // ── Navigate to WebView when form fields arrive from eSewa ────
  const prevFieldsRef = useRef<typeof formFields>(null);

  useEffect(() => {
    if (formFields && formFields !== prevFieldsRef.current) {
      prevFieldsRef.current = formFields;
      router.push({
        pathname: '/(tenant)/esewa-webview' as any,
        params: { formData: JSON.stringify(formFields) },
      } as any);
    }
  }, [formFields, router]);

  // ── Clear errors on unmount ───────────────────────────────────
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  const onStart = async () => {
    await purchasePlan(selected);
  };

  // ── Format expiry date for already-Pro users ──────────────────
  const expiryStr = proExpiresAt
    ? proExpiresAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header row */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-pill bg-input">
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
          onPress={() => router.back()}
          className="px-1 py-2">
          <Text className="font-sans text-[13px] text-ink3">Maybe later</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-8">
          {/* Pill badge */}
          <View className="items-center">
            <ProPill label="BasoBas Pro" />
          </View>

          {/* Headline */}
          <View className="mt-5">
            <Text className="font-display text-[32px] leading-[38px] text-ink">
              Find your room,
            </Text>
            <Text className="font-display text-[32px] leading-[38px] text-brand">
              before anyone else.
            </Text>
          </View>

          {/* Subtext */}
          <Text className="mt-2.5 font-sans text-[15px] text-ink2">
            Skip the broker. Skip the wait.
          </Text>

          {/* Plan toggle */}
          <View className="mt-7 h-[76px] flex-row rounded-[14px] bg-input p-[5px]">
            {PLANS.map((plan) => {
              const isSelected = plan.id === selected;
              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${plan.label} plan at ${plan.price}`}
                  onPress={() => setSelected(plan.id)}
                  className={`h-[66px] flex-1 items-center justify-center rounded-[10px] ${
                    isSelected ? 'border-[1.5px] border-ink bg-bg' : 'bg-transparent'
                  }`}
                  style={
                    isSelected
                      ? {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 4,
                          elevation: 2,
                        }
                      : undefined
                  }>
                  <Text
                    className={`font-sans text-[14px] ${
                      isSelected
                        ? 'font-semibold text-ink'
                        : 'font-medium text-ink2'
                    }`}>
                    {plan.label}
                  </Text>
                  <Text
                    className={`mt-0.5 font-sans text-[13px] ${
                      isSelected ? 'font-semibold text-brand' : 'text-ink3'
                    }`}>
                    {plan.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price display for the selected plan */}
          <View className="mt-5 items-center">
            <Text className="font-display text-[48px] leading-[52px] text-ink">
              {currentPlan.price}
            </Text>
            <Text className="mt-2 font-sans text-[13px] text-ink3">
              {currentPlan.subtitle}
            </Text>
          </View>

          {/* Feature list */}
          <View className="mt-6">
            {FEATURES.map((feature, idx) => (
              <View
                key={feature.title}
                className={`flex-row items-center py-[14px] ${
                  idx < FEATURES.length - 1 ? 'border-b border-divider' : ''
                }`}>
                <View
                  className="h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: feature.iconBg }}>
                  <feature.Icon size={17} color={feature.iconColor} strokeWidth={2} />
                </View>
                <View className="ml-3.5 flex-1 pr-2">
                  <Text className="font-sans text-[14px] font-semibold text-ink">
                    {feature.title}
                  </Text>
                  <Text className="mt-[3px] font-sans text-[12px] text-ink3">
                    {feature.benefit}
                  </Text>
                </View>
                <Check size={16} color="#1A6B4A" strokeWidth={2.5} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Error banner */}
      {error && (
        <View className="mx-6 mt-4 flex-row items-center rounded-[10px] bg-[#FFF5F5] px-4 py-3">
          <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
          <Text className="ml-2.5 flex-1 font-sans text-[13px] text-[#DC2626]">
            {error}
          </Text>
        </View>
      )}

      {/* Already-Pro banner */}
      {isPro && (
        <View className="mx-6 mt-4 flex-row items-center rounded-[10px] bg-brand-light px-4 py-3">
          <Check size={16} color="#1A6B4A" strokeWidth={2.5} />
          <Text className="ml-2.5 flex-1 font-sans text-[13px] text-brand">
            You're Pro until {expiryStr}.{/* Buying extends your pass. */}
          </Text>
        </View>
      )}

      {/* Bottom CTA */}
      <View
        className="px-6 pt-2"
        style={{
          paddingBottom: 28,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            selected === '15day' ? 'Start 15-Day Pass' : 'Start 30-Day Pass'
          }
          onPress={onStart}
          disabled={loading}
          className="h-[54px] w-full items-center justify-center rounded-pill bg-brand"
          style={loading ? { opacity: 0.6 } : undefined}>
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="ml-2 font-sans text-[16px] font-semibold text-white">
                Processing...
              </Text>
            </View>
          ) : (
            <Text className="font-sans text-[16px] font-semibold text-white">
              {selected === '15day' ? 'Start 15-Day Pass →' : 'Start 30-Day Pass →'}
            </Text>
          )}
        </Pressable>
        <Text className="mt-2.5 text-center font-sans text-[12px] text-ink3">
          One-time charge · Cancel anytime
        </Text>
      </View>
    </SafeAreaView>
  );
}
