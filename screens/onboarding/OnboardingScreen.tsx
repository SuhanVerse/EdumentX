import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useWindowDimensions, View, XStack, YStack } from 'tamagui';

import { AiMatchIllustration } from '@/components/illustrations/AiMatchIllustration';
import { DiscoverIllustration } from '@/components/illustrations/DiscoverIllustration';
import { VerifiedIllustration } from '@/components/illustrations/VerifiedIllustration';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

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
    subtitle: 'See verified home tutors in your neighborhood - sorted by distance, subject, and rating.',
    backgroundColor: colors.onboarding.mapBackground,
    accentColor: colors.brand.primary,
    Illustration: DiscoverIllustration,
  },
  {
    title: 'Ask AI for the best match',
    subtitle: 'Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.',
    backgroundColor: colors.onboarding.aiBackground,
    accentColor: colors.brand.ai,
    Illustration: AiMatchIllustration,
  },
  {
    title: 'Verified, trusted tutors',
    subtitle: 'Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority.',
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.surface }}>
      <StatusBar style="dark" />
      <YStack flex={1} paddingHorizontal={spacing.xl} paddingBottom={spacing.xl}>
        <XStack justifyContent="flex-end" paddingTop={spacing.xl} marginBottom={spacing.lg}>
          <Button
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleSkip}
            backgroundColor="transparent"
            borderWidth={0}
            minHeight={44}
          >
            <Text {...typography.body} color={colors.text.secondary}>
              Skip
            </Text>
          </Button>
        </XStack>

        <YStack
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          marginBottom={spacing.xxl}
          backgroundColor={slide.backgroundColor}
          height={illustrationHeight}
        >
          <YStack
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={spacing.lg}
          >
            <Illustration />
          </YStack>
        </YStack>

        <YStack flex={1}>
          <Text
            {...typography.heroTitle}
            color={colors.text.primary}
            marginBottom={spacing.md}
          >
            {slide.title}
          </Text>
          <Text {...typography.body} color={colors.text.secondary}>
            {slide.subtitle}
          </Text>
        </YStack>

        <YStack gap={spacing.lg}>
          <XStack height={12} alignItems="center" justifyContent="center" gap={spacing.sm}>
            {slides.map((item, index) => (
              <View
                key={item.title}
                accessibilityLabel={`Show onboarding slide ${index + 1}`}
                accessibilityRole="button"
                onPress={() => setActiveSlide(index)}
                width={index === activeSlide ? 24 : 8}
                height={8}
                borderRadius={999}
                backgroundColor={index === activeSlide ? colors.brand.primary : colors.border.strong}
              />
            ))}
          </XStack>

          <Button
            accessibilityRole="button"
            onPress={handleNext}
            height={52}
            borderRadius={12}
            backgroundColor={colors.brand.primary}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ backgroundColor: colors.brand.primary }}
          >
            <Text {...typography.button} color={colors.text.inverse}>
              {activeSlide === slides.length - 1 ? 'Get started' : 'Next'}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
