/**
 * EdumentX — Splash Screen (Phase 3, Reanimated 4).
 *
 * Layout (top to bottom):
 *   - 64×64 surface tile containing a placeholder "E" mark. This tile
 *     is the slot for the future custom EdumentX logo — once that
 *     artwork ships, swap the `<Text>E</Text>` for an `<Image>` /
 *     `<Svg>` of identical dimensions and the surrounding animation
 *     keeps working without changes.
 *   - "EdumentX" wordmark — slides up + fades in.
 *   - "Find your perfect tutor nearby" tagline.
 *   - Progress bar at the bottom — sweeps 0 → 100% over 1.4 s using
 *     a Material-standard easing.
 *
 * Behind everything: a 24-particle ambient field driven by a single
 * `withRepeat` worklet (`<SplashParticleField>`). No WebGL — keeps the
 * splash surface clean for the future custom-logo slot.
 *
 * Replaced the legacy `Animated.Value` + `Animated.timing` API
 * entirely. All animations now run on the UI thread via Reanimated 4
 * worklets; JS-thread jank is gone.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SplashParticleField } from '@/components/premium/SplashParticleField';
import { colors } from '@/constants/colors';

// ─── Splash ──────────────────────────────────────────────────────────────────

export function SplashScreen() {
  // Animation shared values — all start at "before-entrance" state and
  // animate to "rest" state on mount.
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.88);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(16);
  const taglineOpacity = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700 });
    logoScale.value = withTiming(1, { duration: 600 });
    wordmarkOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 700 }),
    );
    wordmarkY.value = withDelay(200, withTiming(0, { duration: 700 }));
    taglineOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 600 }),
    );
    progress.value = withDelay(
      400,
      withTiming(1, {
        duration: 1400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    );
  }, [
    logoOpacity,
    logoScale,
    wordmarkOpacity,
    wordmarkY,
    taglineOpacity,
    progress,
  ]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <SafeAreaView className="flex-1 bg-splash px-5">
      <StatusBar style="light" />

      {/* Ambient particle field behind everything */}
      <SplashParticleField />

      {/* Center column */}
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={logoStyle}
          className="w-16 h-16 items-center justify-center rounded-2xl bg-surface mb-4"
        >
          {/* Future custom-logo slot — keep the 64×64 surface tile;
              replace this `<Text>` with the real logo asset when it
              ships. */}
          <Text
            className="text-splash-mark"
            style={{ color: colors.brand.primary }}
          >
            E
          </Text>
        </Animated.View>

        <Animated.Text
          style={wordmarkStyle}
          className="text-splash-wordmark text-splash-text mb-2"
        >
          EdumentX
        </Animated.Text>

        <Animated.Text
          style={taglineStyle}
          className="text-splash-text text-tagline mb-12"
        >
          Find your perfect tutor nearby
        </Animated.Text>
      </View>

      {/* Progress bar pinned to the bottom */}
      <View className="pb-6 items-center">
        <View className="w-splash-bar h-1 overflow-hidden rounded-pill bg-splash-track">
          <Animated.View
            style={[
              progressStyle,
              {
                height: '100%',
                borderRadius: 999,
                backgroundColor: colors.text.inverse,
              },
            ]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}