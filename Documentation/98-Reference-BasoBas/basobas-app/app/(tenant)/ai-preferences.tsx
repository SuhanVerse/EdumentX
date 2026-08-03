import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/layout/ScreenHeader';
import { useUserStore } from '@/src/store/userStore';

export default function AIPreferencesScreen() {
  const router = useRouter();
  const isPro = useUserStore((s) => s.profile.pro.active);

  // Defense-in-depth: redirect non-Pro users back.
  // The profile screen gates this via the Pro gate modal, but direct URL access
  // should also be blocked.
  useEffect(() => {
    if (!isPro) {
      router.back();
    }
  }, [isPro, router]);

  if (!isPro) return null;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="AI Preferences" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-sans text-body text-ink2">
          Customize how our AI recommends properties to you. Fine-tune your preferences for smarter
          suggestions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
