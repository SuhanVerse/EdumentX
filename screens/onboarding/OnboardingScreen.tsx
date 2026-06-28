/**
 * EdumentX — Onboarding Carousel (Phase 3, 3D + animations).
 *
 * Three slides:
 *   1. "Discover tutors on the map" — 3D `<DiscoverScene3D>` rendered
 *      inside `<PremiumHero3D>`.
 *   2. "Ask AI for the best match" — 3D `<AiOrb3D>` (floating indigo
 *      sphere + amber Sparkles) inside `<PremiumHero3D>`.
 *   3. "Verified, trusted tutors" — pure SVG `<VerifiedIllustration>`
 *      wrapped in a Reanimated 4 entrance (slide-up + fade).
 *
 * Transitions:
 *   - Title/subtitle fade + translateY on slide change (Reanimated 4).
 *   - Pagination dots spring-snap width via `<PaginationDots>`.
 *   - Primary CTA uses `<PrimaryButton>` (scale 0.96 spring press).
 *
 * Skip jumps straight to `/email-signup`; Next advances one slide;
 * the last slide's Next becomes "Get started" and routes to the
 * unified auth entry.
 */
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AiOrb3D } from "@/components/illustrations/AiOrb3D";
import { DiscoverScene3D } from "@/components/illustrations/DiscoverScene3D";
import { VerifiedIllustration } from "@/components/illustrations/VerifiedIllustration";
import { PaginationDots } from "@/components/ui/PaginationDots";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PremiumHero3D } from "@/components/premium/PremiumHero3D";
import { colors } from "@/constants/colors";
import type { OnboardingIllustration, OnboardingSlide } from "@/types/onboarding";

// ─── Slide data ──────────────────────────────────────────────────────────────

/** A static wrapper that mounts the 3D scene for slide 1. Keeping
 *  it a function means the `slides` array's `Illustration` slot has
 *  the same shape across all three slides. */
const DiscoverHero: OnboardingIllustration = () => (
  <PremiumHero3D>
    <DiscoverScene3D />
  </PremiumHero3D>
);

const AiHero: OnboardingIllustration = () => (
  <PremiumHero3D>
    <AiOrb3D />
  </PremiumHero3D>
);

const VerifiedHero: OnboardingIllustration = () => <VerifiedIllustration />;

const slides: OnboardingSlide[] = [
  {
    title: "Discover tutors on the map",
    subtitle:
      "See verified home tutors in your neighborhood - sorted by distance, subject, and rating.",
    backgroundColor: colors.onboarding.mapBackground,
    accentColor: colors.brand.primary,
    Illustration: DiscoverHero,
  },
  {
    title: "Ask AI for the best match",
    subtitle:
      "Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.",
    backgroundColor: colors.onboarding.aiBackground,
    accentColor: colors.brand.ai,
    Illustration: AiHero,
  },
  {
    title: "Verified, trusted tutors",
    subtitle:
      "Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority.",
    backgroundColor: colors.onboarding.verifyBackground,
    accentColor: colors.brand.verification,
    Illustration: VerifiedHero,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const { width } = useWindowDimensions();

  const slide = slides[activeSlide];
  const Illustration = slide.Illustration;
  const illustrationHeight = Math.min(280, Math.max(220, width * 0.72));
  const isLastSlide = activeSlide === slides.length - 1;

  // Slide-change fade + translateY. 0 = hidden (16px down),
  // 1 = rest position. We snap to 0 on every change and animate to 1.
  const textEnter = useSharedValue(1);

  useEffect(() => {
    textEnter.value = 0;
    textEnter.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeSlide, textEnter]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textEnter.value,
    transform: [{ translateY: (1 - textEnter.value) * 16 }],
  }));

  function handleNext() {
    if (!isLastSlide) {
      setActiveSlide((current) => current + 1);
      return;
    }
    // Last slide → drop the user at the auth entry screen. The
    // `EmailSignUp` screen handles both Sign up and Log in via its
    // mode toggle. (June 21, 2026 pivot away from phone OTP.)
    router.replace('/email-signup');
  }

  function handleSkip() {
    router.replace('/email-signup');
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

        {/* Illustration panel — coloured background, illustration
            mounts inside. pointerEvents none on the GL scenes lets
            taps fall through to the button below. */}
        <View
          className="items-center justify-center rounded-[20px] mb-6 overflow-hidden"
          style={{
            height: illustrationHeight,
            backgroundColor: slide.backgroundColor,
          }}
        >
          <Illustration />
        </View>

        <Animated.View style={textStyle} className="flex-1">
          <Text className="text-hero text-text-primary mb-3">
            {slide.title}
          </Text>
          <Text className="text-body text-text-secondary">
            {slide.subtitle}
          </Text>
        </Animated.View>

        <View className="gap-5">
          <PaginationDots
            total={slides.length}
            current={activeSlide}
            onPress={setActiveSlide}
          />

          <PrimaryButton
            label={isLastSlide ? "Get started" : "Next"}
            onPress={handleNext}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
