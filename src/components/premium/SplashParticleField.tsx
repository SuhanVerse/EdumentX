/**
 * SplashParticleField — ambient particle drift behind the splash logo.
 *
 * 24 small circles drift in slow randomized loops driven by a single
 * Reanimated 4 shared value (`t`) that ticks 0 → 1 → 0 over 8 seconds
 * via `withRepeat(withTiming(...), -1, false)`. Each particle reads
 * `t` in a worklet inside `useAnimatedStyle` and applies its own
 * pre-baked `vx`, `vy`, and `phase` so no two particles share a
 * trajectory.
 *
*  We deliberately do NOT use `expo-gl` here — the splash screen is
 *  also the placeholder for the future custom EdumentX logo (the
 *  previous R3F/three.js onboard scenes were removed after a device
 *  crash in `WebGLCapabilities.getMaxPrecision`), and we want a
 *  clean, flat surface so the future logo can be a simple `<Image>`
 *  (or `<Svg>`) without a GL context at all.
 *
 * Pure RN primitives (`View`) — Tailwind `className` for styling.
 * Color: rgba(15, 23, 42, opacity) at 10–20% — subtle dark specks
 * on the light splash bg, never competing with the logo.
 */
import { useEffect, useMemo } from 'react';
import { useWindowDimensions, View, type ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

const PARTICLE_COUNT = 24;
const DRIFT_DURATION_MS = 8000;

// ─── Component ───────────────────────────────────────────────────────────────

export function SplashParticleField() {
  const { width, height } = useWindowDimensions();

  // One shared value ticking forever — drives every particle from a
  // single source. Worklets read it inside `useAnimatedStyle`.
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, {
        duration: DRIFT_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      false,
    );
  }, [t]);

  // Pre-bake each particle's trajectory so `useAnimatedStyle` only
  // does arithmetic per frame, not allocation.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        // Starting position (random across the screen)
        startX: Math.random() * width,
        startY: Math.random() * height,
        // Per-axis drift in pixels over one loop
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        // Size in px (3..7)
        size: 3 + Math.random() * 4,
        // Opacity (0.3..0.7) — feels ambient rather than loud
        opacity: 0.3 + Math.random() * 0.4,
        // Per-particle phase offset so they don't all peak together
        phase: Math.random() * Math.PI * 2,
      })),
    [width, height],
  );

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {particles.map((p, i) => (
        <Particle key={i} {...p} t={t} />
      ))}
    </View>
  );
}

// ─── Single particle ─────────────────────────────────────────────────────────

function Particle({
  startX,
  startY,
  vx,
  vy,
  size,
  opacity,
  phase,
  t,
}: {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  t: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Sin-wave drift over the 0->1 loop. The phase offset gives
    // every particle its own peak so the field looks organic.
    const wave = Math.sin(t.value * Math.PI * 2 + phase);
    return {
      transform: [
        { translateX: startX + vx * wave },
        { translateY: startY + vy * wave },
      ],
    };
  });

  return (
    <AnimatedView
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(15, 23, 42, ${opacity * 0.3})`,
        } as ViewStyle,
      ]}
    />
  );
}