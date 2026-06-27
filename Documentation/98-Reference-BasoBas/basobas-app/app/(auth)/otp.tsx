import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { OTPInput } from '@/src/components/form/OTPInput';
import { verifyOTP, resendOTP } from '@/src/services/auth.service';

// ─── Constants ─────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const TIMER_START = 42; // seconds

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Formats seconds as MM:SS */
function fmtTimer(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Masks a Nepal phone: 9812345678 → 98XXXXXX78 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  const visible = 2;
  return `${phone.slice(0, visible)}${'X'.repeat(phone.length - visible * 2)}${phone.slice(-visible)}`;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function OTPScreen() {
  const router = useRouter();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(TIMER_START);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const isComplete = otp.length === OTP_LENGTH;
  const masked = `+977 ${maskPhone(phone)}`;

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleResend = async () => {
    if (timer > 0) return;
    setOtp('');
    setError('');
    setTimer(TIMER_START);

    const result = await resendOTP(phone);
    if (!result.success) {
      Alert.alert('Failed to resend', result.error);
    }
  };

  // ── Screen enter animation ───────────────────────────────────────────────────
  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(18);

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 420 });
    enterY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  // ── Verify handler ──────────────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    if (!isComplete || isVerifying) return;

    setIsVerifying(true);
    setError('');

    const result = await verifyOTP(phone, otp);
    setIsVerifying(false);

    if (!result.success) {
      setError(result.error);
      setOtp('');
      return;
    }

    // Navigate to role selection (or onboarding if new user, or home if existing)
    if (result.data.isNewUser) {
      router.replace('/(auth)/role');
    } else {
      // Existing user — navigate to their main app
      // The auth store's onAuthStateChange will handle redirect
      router.replace('/(auth)/role');
    }
  }, [isComplete, isVerifying, otp, phone, router]);

  const handleOTPComplete = useCallback(
    (val: string) => {
      // Auto-verify once all 6 digits are entered
      if (val.length === OTP_LENGTH && !isVerifying) {
        setTimeout(() => {
          handleVerify();
        }, 300);
      }
    },
    [handleVerify, isVerifying]
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View className="flex-1" style={enterStyle}>
          {/* ── Content ──────────────────────────────────────────────── */}
          <View className="flex-1 px-6 pt-4">
            {/* Back button */}
            <Pressable
              onPress={() => router.back()}
              className="mb-7 h-10 w-10 items-center justify-center rounded-full bg-canvas"
              hitSlop={8}>
              <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
            </Pressable>

            {/* Overline */}
            <Text className="mb-2 font-semibold text-label uppercase tracking-widest text-brand">
              Enter your code
            </Text>

            {/* Headline */}
            <Text className="mb-3 font-display text-[30px] text-ink" style={{ lineHeight: 37 }}>
              Enter the code
            </Text>

            {/* Subtitle */}
            <Text className="mb-1 font-sans text-body text-ink2" style={{ lineHeight: 22 }}>
              We sent a 6-digit code to <Text className="font-semibold text-ink">{masked}</Text>
            </Text>
            <Pressable onPress={() => router.back()} className="mb-8">
              <Text className="font-medium text-body-sm text-brand">Wrong number?</Text>
            </Pressable>

            {/* OTP boxes */}
            <OTPInput
              length={OTP_LENGTH}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (error) setError('');
              }}
              onComplete={handleOTPComplete}
              autoFocus
            />

            {/* Error */}
            {!!error && <Text className="mt-2 text-caption text-danger">{error}</Text>}

            {/* Resend row */}
            <View className="mt-4 flex-row items-center justify-center gap-1">
              <Text className="text-caption text-ink3">{"Didn't get it?"}</Text>
              {timer > 0 ? (
                <Text className="font-medium text-caption text-ink2">
                  {' '}
                  Resend in {fmtTimer(timer)}
                </Text>
              ) : (
                <Pressable onPress={handleResend}>
                  <Text className="font-semibold text-caption text-brand"> Resend</Text>
                </Pressable>
              )}
            </View>

            {/* Security notice card */}
            <View className="mt-6 flex-row gap-3 rounded-lg border border-line bg-canvas p-4">
              <ShieldCheck size={18} color="#6B6B6B" strokeWidth={1.8} />
              <View className="flex-1">
                <Text className="font-semibold text-body-sm text-ink">Keep your code private</Text>
                <Text
                  className="mt-0.5 font-sans text-caption text-ink2"
                  style={{ lineHeight: 18 }}>
                  BasoBas will never call or message you asking for this code.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Bottom CTA ─────────────────────────────────────────────── */}
          <View className="px-6 pb-2">
            <Pressable
              onPress={handleVerify}
              disabled={!isComplete || isVerifying}
              className="h-14 items-center justify-center rounded-pill bg-ink"
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : isComplete && !isVerifying ? 1 : 0.45,
              })}>
              <Text className="font-semibold text-body text-white">
                {isVerifying ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </Pressable>
            <Text className="mt-2 text-center text-caption text-ink3">
              Code auto-verifies when all 6 digits are entered.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Ensure no unused import warning
const _styles = StyleSheet.create({});
void _styles;
