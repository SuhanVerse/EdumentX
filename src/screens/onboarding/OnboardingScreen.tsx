/**
 * EdumentX — Onboarding Carousel (Phase 3.5 stabilization, flat SVG).
 *
 * The 3D slides (`PremiumHero3D`/`DiscoverScene3D`/`AiOrb3D`) crashed
 * on device inside three.js's `WebGLCapabilities.getMaxPrecision`, so
 * this screen is rebuilt with the BasoBas onboarding layout patterns
 * (`OnboardingLayout` / `OnboardingEyebrow`) and pure-SVG
 * illustrations — zero GL, zero crash risk in the bundle.
 *
 *   - Header: wordmark left, haptic "Skip" right.
 *   - Illustration panel: fixed proportional height (~36% of screen)
 *     with the slide's background colour; SVG scene fills it.
 *   - Text section: uppercase overline (eyebrow), title with the
 *     amber signature underline, subtitle — fades + slides up on
 *     slide change (Reanimated 4).
 *   - Footer: spring-snap `PaginationDots` + `PrimaryButton`.
 *
 * Skip jumps straight to `/email-signup`; Next advances one slide;
 * the last slide's Next becomes "Get started" and routes to the
 * unified auth entry.
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AiMatchIllustration } from "@/components/illustrations/AiMatchIllustration";
import { DiscoverIllustration } from "@/components/illustrations/DiscoverIllustration";
import { VerifiedIllustration } from "@/components/illustrations/VerifiedIllustration";
import { AnimatedPressable, usePressScale } from "@/components/motion";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { PaginationDots } from "@/components/ui/PaginationDots";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import type { OnboardingIllustration, OnboardingSlide } from "@/types/onboarding";

// ─── Slide data ──────────────────────────────────────────────────────────────

const DiscoverHero: OnboardingIllustration = () => <DiscoverIllustration />;
const AiHero: OnboardingIllustration = () => <AiMatchIllustration />;
const VerifiedHero: OnboardingIllustration = () => <VerifiedIllustration />;

const slides: OnboardingSlide[] = [
  {
    overline: "Find your tutor",
    title: "Discover tutors on the map",
    subtitle:
      "See verified home tutors in your neighborhood — sorted by distance, subject, and rating.",
    backgroundColor: colors.onboarding.mapBackground,
    accentColor: colors.brand.primary,
    Illustration: DiscoverHero,
  },
  {
    overline: "Powered by AI",
    title: "Ask AI for the best match",
    subtitle:
      "Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.",
    backgroundColor: colors.onboarding.aiBackground,
    accentColor: colors.brand.ai,
    Illustration: AiHero,
  },
  {
    overline: "Verified & trusted",
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const { height } = useWindowDimensions();

  const slide = slides[activeSlide];
  const Illustration = slide.Illustration;
  // BasoBas pattern: illustration height = ~36% of the screen,
  // clamped so it never dominates small displays or wastes space on
  // tablets.
  const illustrationHeight = Math.round(
    Math.min(360, Math.max(220, height * 0.36)),
  );
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
    router.replace("/email-signup");
  }

  function handleSkip() {
    router.replace("/email-signup");
  }

  return (
    <ScreenLayout variant="surface">
      {/* ── Header: title mark left, Skip right ── */}
      <View className="h-14 flex-row items-center justify-between px-6">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Text className="text-micro font-bold text-white">Ex</Text>
          </View>
          <Text className="text-body font-semibold text-ink">EdumentX</Text>
        </View>
        <OnboardingSkip onPress={handleSkip} />
      </View>

      {/* ── Illustration panel — SVG scene fills the tinted panel ── */}
      <View
        className="mx-5 overflow-hidden rounded-card"
        style={{
          height: illustrationHeight,
          backgroundColor: slide.backgroundColor,
        }}
      >
        <Illustration />
      </View>

      {/* ── Text section — overline, title, body ── */}
      <Animated.View
        style={textStyle}
        className="flex-1 justify-center px-6 pb-2 pt-5"
      >
        <Text className="text-micro font-semibold uppercase tracking-[0.16em] text-text-secondary">
          {slide.overline}
        </Text>
        <View className="mt-2 self-start border-b-2 border-accent pb-0.5 mb-3">
          <Text className="text-display text-ink">{slide.title}</Text>
        </View>
        <Text className="text-body text-ink-muted">{slide.subtitle}</Text>
      </Animated.View>

      {/* ── Footer: dots + full-width CTA ── */}
      <View
        className="gap-5 px-6"
        style={{ paddingBottom: 20 + insets.bottom }}
      >
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
    </ScreenLayout>
  );
}

// ─── Skip — haptic + spring-scale, per the app's interaction contract ────────

function OnboardingSkip({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Skip onboarding"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-touch items-center justify-center px-2"
    >
      <Text className="text-body text-text-secondary">Skip</Text>
    </AnimatedPressable>
  );
}