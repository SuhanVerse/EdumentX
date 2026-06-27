import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, ChevronDown, Lock } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { sendOTP } from '@/src/services/auth.service';

// Nepal mobile numbers are exactly 10 digits (9XXXXXXXXX)
const PHONE_LENGTH = 10;

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isValid = phone.length === PHONE_LENGTH;

  // ── Screen enter animation ─────────────────────────────────────────────────
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

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (text: string) => {
    // Digits only, max 10
    setPhone(text.replace(/\D/g, '').slice(0, PHONE_LENGTH));
  };

  const handleContinue = async () => {
    if (!isValid || isSending) return;

    setIsSending(true);
    const result = await sendOTP(phone);
    setIsSending(false);

    if (!result.success) {
      Alert.alert('Failed to send code', result.error);
      return;
    }

    router.push(`/(auth)/otp?phone=${encodeURIComponent(phone)}`);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <Animated.View className="flex-1" style={enterStyle}>
          {/* ── Scrollable content ──────────────────────────────────── */}
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
              Phone Verification
            </Text>

            {/* Headline */}
            <Text className="mb-3 font-display text-[30px] text-ink" style={{ lineHeight: 37 }}>
              {'Welcome to\nBasoBas'}
            </Text>

            {/* Subtitle */}
            <Text className="mb-8 font-sans text-body text-ink2" style={{ lineHeight: 22 }}>
              {"Enter your Nepal phone number.\nWe'll send you a one-time code."}
            </Text>

            {/* Input row ─────────────────────────────────────────────── */}
            <View className="mb-2.5 flex-row items-center gap-2">
              {/* +977 country code — non-editable pill */}
              <View className="h-14 flex-row items-center gap-1.5 rounded-lg bg-canvas px-4">
                <Text className="font-semibold text-body text-ink">+977</Text>
                <ChevronDown size={14} color="#6B6B6B" strokeWidth={2} />
              </View>

              {/* Phone number input */}
              <TextInput
                className="h-14 flex-1 rounded-lg px-4 font-semibold text-body text-ink"
                style={[styles.input, isFocused ? styles.inputFocused : styles.inputIdle]}
                placeholder="9800000000"
                placeholderTextColor="#C0C0C0"
                keyboardType="phone-pad"
                returnKeyType="done"
                maxLength={PHONE_LENGTH}
                value={phone}
                onChangeText={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={handleContinue}
                autoFocus
              />
            </View>

            {/* Hint */}
            <Text className="mb-2 text-caption text-ink3">Nepal (+977) · 10 digits</Text>

            {/* Privacy notice */}
            <View className="flex-row items-center gap-1.5">
              <Lock size={12} color="#AAAAAA" />
              <Text className="text-caption text-ink3">Your number is never shared publicly.</Text>
            </View>
          </View>

          {/* ── Bottom CTA ─────────────────────────────────────────── */}
          <View className="px-6 pb-3">
            <Pressable
              onPress={handleContinue}
              disabled={!isValid || isSending}
              className="h-14 flex-row items-center justify-center gap-2 rounded-pill bg-ink"
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : isValid && !isSending ? 1 : 0.45 })}>
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text className="font-semibold text-body text-white">Send Verification Code</Text>
                  <ArrowRight size={18} color="white" strokeWidth={2.2} />
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet for the border states that className can't express dynamically
const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
  },
  inputIdle: {
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
});
