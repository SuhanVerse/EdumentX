import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiMatchIllustration } from '@/components/illustrations/AiMatchIllustration';
import { DiscoverIllustration } from '@/components/illustrations/DiscoverIllustration';
import { VerifiedIllustration } from '@/components/illustrations/VerifiedIllustration';
import { colors } from '@/constants/colors';

type IllustrationComponent = () => React.JSX.Element;

type OnboardingSlide = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  accentColor: string;
  Illustration: IllustrationComponent;
};

const slides: OnboardingSlide[] = [
  {
    title: 'Discover tutors on the map',
    subtitle:
      'See verified home tutors in your neighborhood - sorted by distance, subject, and rating.',
    backgroundColor: colors.onboarding.mapBackground,
    accentColor: colors.brand.primary,
    Illustration: DiscoverIllustration,
  },
  {
    title: 'Ask AI for the best match',
    subtitle:
      'Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.',
    backgroundColor: colors.onboarding.aiBackground,
    accentColor: colors.brand.ai,
    Illustration: AiMatchIllustration,
  },
  {
    title: 'Verified, trusted tutors',
    subtitle:
      'Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority.',
    backgroundColor: colors.onboarding.verifyBackground,
    accentColor: colors.brand.verification,
    Illustration: VerifiedIllustration,
  },
];

export function OnboardingScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const { width } = useWindowDimensions();
  const slide = slides[activeSlide];
  const Illustration = slide.Illustration;
  const illustrationHeight = Math.min(280, Math.max(220, width * 0.72));

  function handleNext() {
    if (activeSlide < slides.length - 1) {
      setActiveSlide((current) => current + 1);
      return;
    }
    router.replace('/phone-entry');
  }

  function handleSkip() {
    router.replace('/phone-entry');
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      <View className="flex-1 px-5 pb-5">
        <View className="flex-row justify-end pt-5 mb-4">
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleSkip}
            className="min-h-touch items-center justify-center active:opacity-70"
          >
            <Text className="text-body text-text-secondary">Skip</Text>
          </Pressable>
        </View>

        <View
          className="items-center justify-center rounded-[20px] mb-6"
          style={{
            height: illustrationHeight,
            backgroundColor: slide.backgroundColor,
          }}
        >
          <View className="w-full h-full items-center justify-center px-4">
            <Illustration />
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-hero text-text-primary mb-3">
            {slide.title}
          </Text>
          <Text className="text-body text-text-secondary">{slide.subtitle}</Text>
        </View>

        <View className="gap-5">
          <View className="h-3 flex-row items-center justify-center gap-2">
            {slides.map((item, index) => (
              <Pressable
                key={item.title}
                accessibilityLabel={`Show onboarding slide ${index + 1}`}
                accessibilityRole="button"
                onPress={() => setActiveSlide(index)}
                className={`h-2 rounded-pill ${
                  index === activeSlide ? 'w-6 bg-night' : 'w-2 bg-border-strong'
                }`}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            className="min-h-btn rounded-card bg-night items-center justify-center active:opacity-90"
          >
            <Text className="text-button text-white">
              {activeSlide === slides.length - 1 ? 'Get started' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
