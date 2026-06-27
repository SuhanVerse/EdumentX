import React, { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { PaginationDots } from './PaginationDots';
import { NextButton } from './NextButton';
import { SkipButton } from './SkipButton';

interface OnboardingLayoutProps {
  currentStep: 1 | 2 | 3;
  overline: string;
  headline: string;
  body: string;
  illustration: React.ReactNode;
  onSkip: () => void;
  onNext: () => void;
  isLast?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  overline,
  headline,
  body,
  illustration,
  onSkip,
  onNext,
  isLast = false,
}) => {
  const { height } = useWindowDimensions();

  // Illustration height = ~38% of screen — balanced between visual and text
  const illustrationHeight = Math.round(height * 0.38);

  // ── Enter animation ──────────────────────────────────────────────────────
  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(20);

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 480 });
    enterY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View className="flex-1" style={enterStyle}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View className="h-14 flex-row items-center justify-between px-6">
          <View className="flex-row items-center gap-2">
            <Text className="font-display text-[22px] text-ink">BasoBas</Text>
            <View className="rounded bg-brand px-1.5 py-0.5">
              <Text className="font-bold text-[9px] tracking-widest text-white">BETA</Text>
            </View>
          </View>
          <SkipButton onPress={onSkip} />
        </View>

        {/* ── Illustration (fixed proportional height) ─────────────────── */}
        {/*
          Using a calculated height instead of flex-1 so the illustration
          never dominates the screen and the text section always has room.
          overflow-hidden + rounded-hero clips the float-scale animation.
        */}
        <View className="mx-5 overflow-hidden rounded-hero" style={{ height: illustrationHeight }}>
          {illustration}
        </View>

        {/* ── Text section (flex-1 fills space between illustration + bottom) */}
        <View className="flex-1 justify-center px-6 pb-2 pt-5">
          <Text className="font-semibold text-label uppercase tracking-[0.13em] text-brand">
            {overline}
          </Text>
          <Text className="mt-1.5 font-display text-[30px] text-ink" style={{ lineHeight: 37 }}>
            {headline}
          </Text>
          <Text className="mt-3 font-sans text-body text-ink2" style={{ lineHeight: 22 }}>
            {body}
          </Text>
        </View>

        {/* ── Bottom: centered dots + full-width button ─────────────────── */}
        <View className="px-6 pb-4 pt-1">
          {/* Dots centered horizontally */}
          <View className="mb-5 items-center">
            <PaginationDots total={3} current={currentStep - 1} />
          </View>
          <NextButton onPress={onNext} label={isLast ? 'Get started' : 'Next'} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

OnboardingLayout.displayName = 'OnboardingLayout';
export { OnboardingLayout };
