import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type OnboardingSlide = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  accentColor: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

const slides: OnboardingSlide[] = [
  {
    title: 'Discover tutors on the map',
    subtitle: 'See verified home tutors in your neighborhood - sorted by distance, subject, and rating.',
    backgroundColor: colors.onboarding.mapBackground,
    accentColor: colors.brand.primary,
    icon: 'location-outline',
  },
  {
    title: 'Ask AI for the best match',
    subtitle: 'Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.',
    backgroundColor: colors.onboarding.aiBackground,
    accentColor: colors.brand.ai,
    icon: 'sparkles-outline',
  },
  {
    title: 'Verified, trusted tutors',
    subtitle: 'Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority.',
    backgroundColor: colors.onboarding.verifyBackground,
    accentColor: colors.brand.verification,
    icon: 'shield-checkmark-outline',
  },
];

export function OnboardingScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const { width } = useWindowDimensions();
  const slide = slides[activeSlide];
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.skipRow}>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={[styles.illustrationPanel, { backgroundColor: slide.backgroundColor, height: illustrationHeight }]}>
          <View style={styles.iconCircle}>
            <Ionicons color={slide.accentColor} name={slide.icon} size={58} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((item, index) => (
              <Pressable
                accessibilityLabel={`Show onboarding slide ${index + 1}`}
                accessibilityRole="button"
                key={item.title}
                onPress={() => setActiveSlide(index)}
                style={[styles.dot, index === activeSlide ? styles.dotActive : null]}
              />
            ))}
          </View>

          <Pressable accessibilityRole="button" onPress={handleNext} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{activeSlide === slides.length - 1 ? 'Get started' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.surface,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  illustrationPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.background.surface,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.heroTitle,
    color: colors.text.onboardingTitle,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.onboardingBody,
    color: colors.text.secondary,
  },
  footer: {
    gap: spacing.lg,
  },
  dots: {
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border.strong,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand.primary,
  },
  primaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});
