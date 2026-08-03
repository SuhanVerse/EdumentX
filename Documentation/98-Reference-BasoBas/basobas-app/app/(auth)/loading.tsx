import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase'
import { useAuthStore } from '@/src/store/authStore'
import { getProfile } from '@/src/services/profile.service'

const PROGRESS_WIDTH = 160;
const LOAD_DURATION = 2200;
const NAV_DELAY = 2450;

export default function LoadingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const supabase = useClerkSupabase()
  const { setProfile } = useAuthStore()

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    progressWidth.value = withTiming(PROGRESS_WIDTH, {
      duration: LOAD_DURATION,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    const t = setTimeout(async () => {
      // ── Check if the user is already signed in with a valid Clerk session ──
      if (isLoaded && isSignedIn && user) {
        console.log('[Loading] User already signed in — checking onboarding status')
        const profileResult = await getProfile(user.id, supabase)
        if (profileResult.success && profileResult.data.onboarding_complete) {
          setProfile(profileResult.data as any)
          const role = profileResult.data.active_role ?? 'tenant'
          const target = role === 'landlord' ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)'
          console.log('[Loading] Onboarding complete — routing to home:', target)
          router.replace(target as any)
          return
        }
        console.log('[Loading] Signed in but onboarding not complete — routing to onboarding')
        router.replace('/(auth)/phone')
        return
      }
      // ── Not signed in — show onboarding slides ──
      router.replace('/(auth)/onboarding')
    }, NAV_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink">
        {/* ── Centre content ─────────────────────────────────────────── */}
        <Animated.View className="flex-1 items-center justify-center" style={enterStyle}>
          {/* Logo mark */}
          <View className="mb-8 items-center justify-center">
            {/* Green glow halo behind the mark */}
            <View style={styles.glow} />

            {/* White rounded container */}
            <View
              className="h-[100px] w-[100px] items-center justify-center rounded-[20px] bg-bg"
              style={styles.markShadow}>
              <LogoMark />
            </View>
          </View>

          {/* Brand name + BETA badge */}
          <View className="mb-2 flex-row items-center gap-2">
            <Text className="font-display text-[26px] text-white">BasoBas</Text>
            <View className="rounded bg-brand px-1.5 py-0.5">
              <Text className="font-bold text-[9px] tracking-widest text-white">BETA</Text>
            </View>
          </View>

          {/* Tagline */}
          <Text className="mb-10 font-medium text-[11px] uppercase tracking-[0.2em] text-ink3">
            Find your home
          </Text>

          {/* Progress bar */}
          <View style={styles.track}>
            <Animated.View className="h-full rounded-full bg-brand" style={barStyle} />
          </View>
        </Animated.View>

        {/* ── Version footer ──────────────────────────────────────────── */}
        <View className="items-center pb-5">
          <Text className="text-micro text-ink2">v 1.0</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const ARCH_W = 42; // outer arch width
const ARCH_H = 52; // outer arch height (> half-width for the rectangular shaft)
const INNER_W = 25; // inner (brand-green) cutout width
const INNER_H = 35; // inner cutout height

function LogoMark() {
  return (
    <View style={styles.archOuter}>
      {/* Brand-green arch — the "light" inside the doorway */}
      <View style={styles.archInner} />
      {/* Thin horizontal step at the base — door threshold */}
      <View style={styles.archBase} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: '#1A6B4A',
    opacity: 0.14,
    shadowColor: '#1A6B4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 48,
    elevation: 0,
  },

  markShadow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  track: {
    width: PROGRESS_WIDTH,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Outer arch: ink-coloured rectangle with a semicircular top
  archOuter: {
    width: ARCH_W,
    height: ARCH_H,
    borderTopLeftRadius: ARCH_W / 2,
    borderTopRightRadius: ARCH_W / 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Brand-green inner arch — sits flush at the bottom of the outer arch
  archInner: {
    position: 'absolute',
    bottom: 0,
    width: INNER_W,
    height: INNER_H,
    borderTopLeftRadius: INNER_W / 2,
    borderTopRightRadius: INNER_W / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#1A6B4A',
  },

  // Thin ink base stripe — door threshold
  archBase: {
    position: 'absolute',
    bottom: -1,
    left: -4,
    right: -4,
    height: 4,
    backgroundColor: '#0A0A0A',
  },
});
