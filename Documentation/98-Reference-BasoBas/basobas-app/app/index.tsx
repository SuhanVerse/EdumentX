import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { interpolate } from 'flubber';
import { useAppReadyStore } from '@/src/store/appReadyStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useAuthStore } from '@/src/store/authStore';
import { getProfile } from '@/src/services/profile.service';

/**
 * BasoBas animated splash.
 *
 * The signature move: a brand mark inside a black squircle that truly morphs
 * (path interpolation via flubber, not a cross-fade) from a house silhouette
 * into the BasoBas keyhole and back, on a calm 5.8s loop. Below it the
 * wordmark splits in as two halves meeting in the middle, followed by a
 * minimal indeterminate loading bar. Once it has played (and the app is
 * ready) it resolves the session + profile and routes straight to the
 * destination — home, onboarding, or the sign-in flow.
 */
export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathRef = useRef<Path>(null);
  const doorRef = useRef<Path>(null);
  const rafRef = useRef<number | null>(null);

  // ── RN Animated values ──────────────────────────────────────────────────
  const wordmark = useRef(new Animated.Value(0)).current; // 0 → 1 (both halves)
  const barFade = useRef(new Animated.Value(0)).current; // 0 → 1 (track fade-in)
  const segment = useRef(new Animated.Value(0)).current; // 0 → 1, loops forever

  useEffect(() => {
    // No flash before the first rAF frame — park on the house.
    pathRef.current?.setNativeProps({ d: HOUSE });
    doorRef.current?.setNativeProps({ opacity: 1 });

    // ── Morph loop: house → keyhole → house, forever ────────────────────
    // The mark is pure SVG, so it can run from the very first frame — no
    // fonts needed. This is the ONLY loading UI; there is no intermediate
    // spinner.
    const start = Date.now();
    const loop = () => {
      const phase = ((Date.now() - start) / 1000) % CYCLE;
      let k: number; // "keyness": 0 = house, 1 = keyhole
      if (phase < HOLD) k = 0;
      else if (phase < HOLD + MORPH) k = easeInOut((phase - HOLD) / MORPH);
      else if (phase < HOLD + MORPH + HOLD) k = 1;
      else k = 1 - easeInOut((phase - HOLD - MORPH - HOLD) / MORPH);

      pathRef.current?.setNativeProps({ d: morph(k) });
      // The doorway cutout only reads while the silhouette is clearly a house.
      const doorOpacity = Math.min(1, Math.max(0, 1 - k * 3));
      doorRef.current?.setNativeProps({ opacity: doorOpacity });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Wordmark + loader: start once the fonts land. The splash mounts
  //    immediately, but the text/bar wait so they never flash in a fallback
  //    font — and the handoff below waits for the same readiness signal.
  const fontsReady = useAppReadyStore((s) => s.fontsReady);
  const clerkReady = useAppReadyStore((s) => s.clerkReady);

  useEffect(() => {
    if (!fontsReady) return;

    // Wordmark: both halves converge in the centre.
    const wordmarkAnim = Animated.timing(wordmark, {
      toValue: 1,
      duration: WORDMARK_DURATION,
      delay: WORDMARK_DELAY,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });

    // Loader: track fades in, segment loops forever.
    const barFadeAnim = Animated.timing(barFade, {
      toValue: 1,
      duration: BAR_DURATION,
      delay: BAR_DELAY,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const segmentLoop = Animated.loop(
      Animated.timing(segment, {
        toValue: 1,
        duration: SEGMENT_DURATION,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    );

    Animated.parallel([wordmarkAnim, barFadeAnim]).start();
    // sequence → the first pass waits BAR_DELAY before the loop starts.
    Animated.sequence([Animated.delay(BAR_DELAY), segmentLoop]).start();

    return () => {
      wordmarkAnim.stop();
      barFadeAnim.stop();
      segmentLoop.stop();
    };
  }, [fontsReady, wordmark, barFade, segment]);
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    if (!(fontsReady && clerkReady)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Resolve the session + profile, then route straight to the target.
      let target: string = '/(auth)/onboarding';
      if (isLoaded && isSignedIn && user) {
        try {
          const profileResult = await getProfile(user.id, supabase);
          if (profileResult.success && profileResult.data.onboarding_complete) {
            setProfile(profileResult.data as any);
            const role = profileResult.data.active_role ?? 'tenant';
            target = role === 'landlord' ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)';
          } else {
            target = '/(auth)/phone';
          }
        } catch {
          target = '/(auth)/phone';
        }
      }
      if (!cancelled) router.replace(target as any);
    }, SPLASH_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fontsReady, clerkReady, isLoaded, isSignedIn, user, supabase, router, setProfile]);

  const leftX = wordmark.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] });
  const rightX = wordmark.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
  const segmentX = segment.interpolate({
    inputRange: [0, 1],
    outputRange: [SEGMENT_FROM, SEGMENT_TO],
  });

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* Warm vertical gradient — subtle, NOT radial */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="splashBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BG_TOP} />
            <Stop offset="1" stopColor={BG_BOTTOM} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashBg)" />
      </Svg>

      {/* ── Centre stack ──────────────────────────────────────────────── */}
      <View style={styles.center}>
        {/* Morphing mark */}
        <View style={styles.markShadow}>
          <Svg width={76} height={76} viewBox="17.142857 8.571429 79.285714 79.285714">
            <Rect
              x={17.142857}
              y={8.571429}
              width={79.285714}
              height={79.285714}
              rx={16}
              fill={INK}
            />
            <G transform="translate(56.79 48.2) scale(0.086) translate(-256 -256)">
              <Path ref={pathRef} d={HOUSE} fill={MARK} />
              <Path ref={doorRef} d={DOOR} fill={INK} opacity={1} />
            </G>
          </Svg>
        </View>

        {/* Wordmark — two halves meeting in the middle */}
        <View style={styles.wordmarkRow}>
          <Animated.Text
            style={[
              styles.wordmark,
              { color: INK, opacity: wordmark, transform: [{ translateX: leftX }] },
            ]}>
            Baso
          </Animated.Text>
          <Animated.Text
            style={[
              styles.wordmark,
              { color: BRAND, opacity: wordmark, transform: [{ translateX: rightX }] },
            ]}>
            Bas
          </Animated.Text>
        </View>

        {/* Minimal indeterminate loader */}
        <Animated.View style={[styles.track, { opacity: barFade }]}>
          <Animated.View
            style={[styles.segment, { width: SEGMENT_W, transform: [{ translateX: segmentX }] }]}
          />
        </Animated.View>
      </View>

      {/* ── Footer (pinned) ───────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>v 1.0 · Nepal</Text>
        <View style={styles.homeBar} />
      </View>
    </View>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG_TOP = '#FBF9F4';
const BG_BOTTOM = '#F3F0E9';
const INK = '#141416'; // squircle + wordmark
const BRAND = '#1A6B4A'; // forest-green accent
const MARK = '#FFFFFF'; // silhouette inside the squircle
const TRACK = 'rgba(20, 20, 22, 0.08)';
const FOOTER_TEXT = '#B8B4AB';
const HOME_BAR = 'rgba(20, 20, 22, 0.8)';

// ─── Mark geometry (authored on a 512 grid) ──────────────────────────────────

/** Font Awesome solid "house" — outer silhouette. */
const HOUSE =
  'M277.8 8.6c-12.3-11.4-31.3-11.4-43.5 0l-224 208c-9.6 9-12.8 22.9-8 35.1S18.8 272 32 272l16 0 0 176c0 35.3 28.7 64 64 64l288 0c35.3 0 64-28.7 64-64l0-176 16 0c13.2 0 25-8.1 29.8-20.3s1.6-26.2-8-35.1l-224-208z';

/** Arched doorway, overlaid with the squircle colour so it reads as a hole. */
const DOOR = 'M240 320l32 0c26.5 0 48 21.5 48 48l0 96-128 0 0-96c0-26.5 21.5-48 48-48z';

/** Keyhole — round head + tapered stem, finely sampled so the morph stays smooth. */
const KEYHOLE = (() => {
  const cx = 256;
  const cy = 150;
  const r = 92;
  const startDeg = 112; // neck-left on the circle, near the bottom
  const endDeg = 112 + (360 - 44); // sweep the head, leaving a 44° neck gap
  const pts: [number, number][] = [];
  for (let t = startDeg; t <= endDeg; t += 3) {
    const a = (t * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.push([332, 474]); // stem bottom-right
  pts.push([180, 474]); // stem bottom-left
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return d + ' Z';
})();

/** house(0) → keyhole(1) path interpolator. */
const morph = interpolate(HOUSE, KEYHOLE, { maxSegmentLength: 3 });

// ─── Morph cycle timing ───────────────────────────────────────────────────────

const HOLD = 1.6; // seconds
const MORPH = 1.3; // seconds
const CYCLE = HOLD + MORPH + HOLD + MORPH; // 5.8s
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ─── Entrance / hand-off timing (ms) ─────────────────────────────────────────

const WORDMARK_DELAY = 350;
const WORDMARK_DURATION = 600;
const BAR_DELAY = 700;
const BAR_DURATION = 500;
const SEGMENT_DURATION = 1500;
/** Show the full house → keyhole reveal, then let the auth flow take over. */
const SPLASH_MS = 3400;

// ─── Loader geometry ─────────────────────────────────────────────────────────

const TRACK_W = 92;
const TRACK_H = 2;
const SEGMENT_W = TRACK_W * 0.3; // 30% of the track
const SEGMENT_FROM = -TRACK_W; // -100% of track width
const SEGMENT_TO = TRACK_W * 3.2; // 320% of track width

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG_TOP,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markShadow: {
    // Soft neutral shadow — no colored glow, no halo.
    shadowColor: INK,
    shadowOpacity: 0.2,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  wordmarkRow: {
    flexDirection: 'row',
    marginTop: 26,
  },
  wordmark: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: -0.8,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: TRACK,
    marginTop: 24,
  },
  segment: {
    height: TRACK_H,
    borderRadius: 999,
    backgroundColor: BRAND,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 8,
    letterSpacing: 0.8,
    color: FOOTER_TEXT,
  },
  homeBar: {
    width: 90,
    height: 3,
    borderRadius: 999,
    backgroundColor: HOME_BAR,
  },
});
