import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Sparkles } from 'lucide-react-native';

import { ProPill } from '@/src/components/shared/ProPill';
import { useProGateStore } from '@/src/hooks/useProGate';

export default function ProGateModal() {
  const router = useRouter();
  const close = useProGateStore((s) => s.close);

  const handleUpgrade = () => {
    close();
    router.push('/(tenant)/pro-plan' as any);
  };

  const handleDismiss = () => {
    close();
    router.back();
  };

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
      }}>
      {/* Grab handle */}
      <View className="items-center pt-3 pb-2">
        <View className="h-[4px] w-[36px] rounded-pill bg-line" />
      </View>

      <View className="flex-1 items-center justify-center px-6 pb-12">
        {/* Icon */}
        <View
          className="h-16 w-16 items-center justify-center rounded-pill"
          style={{ backgroundColor: '#E8F5EE' }}>
          <View
            className="h-12 w-12 items-center justify-center rounded-pill bg-brand"
            style={{
              shadowColor: '#1A6B4A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 6,
            }}>
            <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>

        {/* Headline */}
        <Text className="mt-5 text-center font-display text-[24px] leading-[28px] text-ink">
          Pro Feature
        </Text>
        <Text className="mt-2 text-center font-sans text-[15px] leading-[22px] text-ink2">
          Upgrade to BasoBas Pro to unlock{'\n'}this and other premium features.
        </Text>

        {/* PRO badge */}
        <View className="mt-4 items-center">
          <ProPill label="PRO MEMBER" icon={Crown} />
        </View>

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
          onPress={handleUpgrade}
          className="mt-8 h-[54px] w-full items-center justify-center rounded-pill bg-brand">
          <Text className="font-sans text-[16px] font-semibold text-white">Upgrade to Pro</Text>
        </Pressable>

        {/* Dismiss */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
          onPress={handleDismiss}
          className="mt-3.5 px-1 py-2">
          <Text className="font-sans text-[14px] text-ink3">Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}
