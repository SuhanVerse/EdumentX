import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { MapIllustration } from '@/src/components/onboarding/MapIllustration';
import { VerifiedIllustration } from '@/src/components/onboarding/VerifiedIllustration';
import { VisitIllustration } from '@/src/components/onboarding/VisitIllustration';
import { PaginationDots } from '@/src/components/onboarding/PaginationDots';
import { NextButton } from '@/src/components/onboarding/NextButton';
import { SkipButton } from '@/src/components/onboarding/SkipButton';

// ─── Data ──────────────────────────────────────────────────────────────────────

interface FeatureSlide {
  overline: string;
  headline: string;
  body: string;
  Illustration: React.FC;
}

const SLIDES: FeatureSlide[] = [
  {
    overline: 'Only Verified',
    headline: 'Real homes.\nVerified humans.',
    body: 'Every listing on BasoBas is checked by system. No catfish. No scams. Just the real deal.',
    Illustration: VerifiedIllustration,
  },
  {
    overline: 'Visits in seconds',
    headline: 'Book a Rental\nin one tap.',
    body: 'Pick a time that works. Landlords confirm fast. Skip the back and forth on chat.',
    Illustration: VisitIllustration,
  },
  {
    overline: 'Search by area',
    headline: 'Explore by\nneighborhood.',
    body: 'See every verified rental on a live map. Filter by price, beds, and what matters most to you.',
    Illustration: MapIllustration,
  },
];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { height, width: screenWidth } = useWindowDimensions();
  const illustrationHeight = Math.round(height * 0.38);

  const [activeIndex, setActiveIndex] = useState(0);
  const isLast = activeIndex === SLIDES.length - 1;

  // ── Shared values ────────────────────────────────────────────────────────────

  // Whole-screen enter
  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(20);

  // Scroll offset of the carousel strip.
  // Page N is visible when contentTranslateX = -(N * screenWidth).
  const contentTranslateX = useSharedValue(0);

  // Mirror activeIndex on the worklet side so gesture callbacks can read it.
  // Updated both from JS (useEffect) and immediately from worklets (gesture/handleNext).
  const activeIndexSv = useSharedValue(0);
  useEffect(() => {
    activeIndexSv.value = activeIndex;
  }, [activeIndex]);

  // ── Mount effect ─────────────────────────────────────────────────────────────

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 500 });
    enterY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Snap the carousel to a target page with a spring.
   *  Updates the pagination dots immediately, no waiting for spring to settle. */
  const snapTo = useCallback(
    (targetIdx: number) => {
      'worklet';
      activeIndexSv.value = targetIdx;
      // Update React state immediately so PaginationDots reflect the new index without delay
      runOnJS(setActiveIndex)(targetIdx);
      const targetOffset = -(targetIdx * screenWidth);
      contentTranslateX.value = withTiming(targetOffset, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    },
    [screenWidth],
  );

  // ── Gesture swipe ────────────────────────────────────────────────────────────

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          'worklet';
          const baseOffset = -(activeIndexSv.value * screenWidth);
          contentTranslateX.value = baseOffset + e.translationX * 0.62;
        })
        .onEnd((e) => {
          'worklet';
          const cur = activeIndexSv.value;
          const threshold = screenWidth * 0.2;
          const velThreshold = 350;

          const leftSwipe = e.translationX < -threshold || e.velocityX < -velThreshold;
          const rightSwipe = e.translationX > threshold || e.velocityX > velThreshold;

          if (leftSwipe && cur < SLIDES.length - 1) {
            snapTo(cur + 1);
          } else if (rightSwipe && cur > 0) {
            snapTo(cur - 1);
          } else {
            // Snap back to current page
            snapTo(cur);
          }
        }),
    [screenWidth, snapTo],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (isLast) {
      router.replace('/(auth)/phone');
    } else {
      snapTo(activeIndex + 1);
    }
  }, [isLast, activeIndex, router, snapTo]);

  const handleSkip = useCallback(() => {
    router.replace('/(auth)/phone');
  }, [router]);

  // ── Animated styles ──────────────────────────────────────────────────────────

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
  }));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View className="flex-1" style={enterStyle}>
        {/* ── STATIC: Header ─────────────────────────────────────────────── */}
        <View className="h-14 flex-row items-center justify-between px-6">
          <View className="flex-row items-center gap-2">
            <Text className="font-display text-[22px] text-ink">BasoBas</Text>
            <View className="rounded bg-brand px-1.5 py-0.5">
              <Text className="font-bold text-[9px] tracking-widest text-white">BETA</Text>
            </View>
          </View>
          <SkipButton onPress={handleSkip} />
        </View>

        {/* ── CAROUSEL: All 3 slides pre-rendered ────────────────────────── */}
        <GestureDetector gesture={panGesture}>
          <View className="flex-1 overflow-hidden">
            <Animated.View
              className="flex-row"
              style={[carouselStyle, { width: screenWidth * SLIDES.length, flex: 1 }]}>
              {SLIDES.map((slide, idx) => {
                const Illustration = slide.Illustration;
                return (
                  <View key={idx} className="flex-1">
                    {/* Illustration */}
                    <View
                      className="mx-5 overflow-hidden rounded-hero"
                      style={{ height: illustrationHeight }}>
                      <Illustration />
                    </View>

                    {/* Text */}
                    <View className="flex-1 justify-center px-6 pb-2 pt-5">
                      <Text className="font-semibold text-label uppercase tracking-[0.13em] text-brand">
                        {slide.overline}
                      </Text>
                      <Text
                        className="mt-1.5 font-display text-[30px] text-ink"
                        style={{ lineHeight: 37 }}>
                        {slide.headline}
                      </Text>
                      <Text className="mt-3 font-sans text-body text-ink2" style={{ lineHeight: 22 }}>
                        {slide.body}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* ── STATIC: Bottom ─────────────────────────────────────────────── */}
        <View className="px-6 pb-4 pt-1">
          <View className="mb-5 items-center">
            <PaginationDots total={3} current={activeIndex} />
          </View>
          <NextButton onPress={handleNext} label={isLast ? 'Get started' : 'Next'} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
