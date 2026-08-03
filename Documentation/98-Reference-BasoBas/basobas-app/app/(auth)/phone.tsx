import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp, useAuth, getClerkInstance } from '@clerk/expo';
import CountryPicker, { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { ArrowLeft, ChevronDown, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { tokens } from '@/src/theme/tokens';

// Countries to show at the top of the picker list
const PREFERRED: CountryCode[] = ['NP', 'IN', 'US', 'GB', 'AU', 'CA'];

export default function PhoneEntryScreen() {
  const router = useRouter();

  // Clerk hooks — both needed for sign-in-or-up flow
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { signOut, isSignedIn } = useAuth();

  const [phone, phoneSet] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('NP');
  const [callingCode, setCallingCode] = useState('977');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');
  const canSend = digits.length >= 6 && !isPending;
  const fullPhone = `+${callingCode}${digits}`;

  const onCountrySelect = useCallback((country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(String(country.callingCode?.[0] ?? ''));
    setPickerOpen(false);
  }, []);

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPending(true);

    // ── Guard: sign out any existing Clerk session before starting fresh auth ──
    // This prevents the "You are already signed in" error when a different user
    // tries to register on a device that has a stale Clerk session from a previous user.
    if (isSignedIn) {
      console.warn('[PhoneEntry] Existing Clerk session detected — signing out first');
      try {
        await signOut();
      } catch (signOutErr) {
        console.warn('[PhoneEntry] signOut during warmup failed (non-fatal):', signOutErr);
      }
    }

    try {
      // ——— Step 1: Try sign-in (works if user already exists) ———
      const signInAttempt = await signIn!.create({ identifier: fullPhone });

      // Clerk may return errors as objects (not throw) — normalize here
      if (signInAttempt?.error) {
        throw signInAttempt.error;
      }

      // Success — send the OTP code
      await signIn!.phoneCode.sendCode();
      setIsPending(false);
      router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone, flow: 'sign-in' } });
      return;
    } catch (siErr: any) {
      // ——— Step 2: signIn.create() failed — try sign-up as fallback ———
      // Clerk may return various error codes (form_identifier_not_found,
      // api_response_error, etc.). We attempt sign-up for ANY error to
      // handle both new users and edge cases robustly.
      const siCode =
        siErr?.code ?? siErr?.errors?.[0]?.code ?? '';
      const siMessage =
        siErr?.longMessage ??
        siErr?.errors?.[0]?.longMessage ??
        siErr?.message ??
        '';

      console.warn('[PhoneEntry] signIn.create error — trying sign-up fallback:', { code: siCode, message: siMessage });

      try {
        console.log('[PhoneEntry] Trying sign-up for:', fullPhone);
        // Use the underlying Clerk client (Standard API) consistently
        const clerk = getClerkInstance();
        if (!clerk) {
          throw new Error('Clerk not loaded. Please restart the app.');
        }

        const afterCreate = await clerk.client!.signUp.create({ phoneNumber: fullPhone });
        console.log('[PhoneEntry] Sign-up created, missing fields:', (afterCreate as any)?.missingFields);

        // Must specify strategy explicitly for the Standard API
        const afterPrepare = await clerk.client!.signUp.preparePhoneNumberVerification({
          strategy: 'phone_code',
        });
        console.log('[PhoneEntry] Verification prepared, status:', (afterPrepare as any)?.status);

        setIsPending(false);
        router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone, flow: 'sign-up' } });
        return;
      } catch (suErr: any) {
        const suCode =
          suErr?.code ?? suErr?.errors?.[0]?.code ?? '';
        const suMessage =
          suErr?.longMessage ??
          suErr?.errors?.[0]?.longMessage ??
          suErr?.message ??
          '';

        console.error('[PhoneEntry] signUp.create error:', { code: suCode, message: suMessage });

        // If the user already exists in Clerk, guide to sign in
        if (suCode === 'form_identifier_exists') {
          setError('This number is already registered. Please try signing in.');
        } else {
          setError(
            suMessage ||
              `Could not create account (${suCode || 'unknown'}). Check Clerk Dashboard: ensure Phone strategy is enabled.`
          );
        }
        setIsPending(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <ArrowLeft size={20} color={tokens.color.ink} strokeWidth={2} />
          </TouchableOpacity>

          {/* Eyebrow */}
          <Text style={styles.eyebrow}>PHONE VERIFICATION</Text>

          {/* Headline */}
          <Text style={styles.headline}>{"What's your\nphone number?"}</Text>

          {/* Body */}
          <Text style={styles.body}>
            {"We'll send a 6-digit code to verify.\nNo password needed — ever."}
          </Text>

          {/* Input row */}
          <View style={styles.inputRow}>
            {/* Country picker pill */}
            <TouchableOpacity
              style={styles.countryPill}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel="Select country code"
              accessibilityRole="button">
              <CountryPicker
                countryCode={countryCode}
                withFlag
                withCallingCode
                withFilter
                withAlphaFilter
                preferredCountries={PREFERRED}
                visible={pickerOpen}
                onSelect={onCountrySelect}
                onClose={() => setPickerOpen(false)}
                renderFlagButton={() => null}
              />
              <Text style={styles.flagEmoji}>{countryCodeToFlag(countryCode)}</Text>
              <Text style={styles.callingCode}>+{callingCode}</Text>
              <ChevronDown size={12} color={tokens.color.ink3} strokeWidth={2} />
            </TouchableOpacity>

            {/* Phone number input */}
            <TextInput
              style={[
                styles.phoneInput,
                isFocused && styles.phoneInputActive,
                error ? styles.phoneInputErr : null,
              ]}
              value={phone}
              onChangeText={(v) => {
                phoneSet(v);
                setError(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={countryCode === 'NP' ? '98XXXXXXXX' : 'Phone number'}
              placeholderTextColor={tokens.color.placeholder}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleSend}
              autoFocus
              accessibilityLabel="Phone number input"
            />
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Privacy */}
          <View style={styles.privacyRow}>
            <Lock size={12} color={tokens.color.ink3} strokeWidth={2} />
            <Text style={styles.privacyText}>Your number is never shared with anyone.</Text>
          </View>
        </ScrollView>

        {/* CTA above keyboard */}
        <View style={styles.ctaArea}>
          <TouchableOpacity
            style={[styles.btn, !canSend && styles.btnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button">
            <Text style={[styles.btnText, !canSend && styles.btnTextDisabled]}>
              {isPending ? 'Sending...' : 'Send Verification Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Convert ISO country code to flag emoji
function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.screenH, paddingTop: 32, flexGrow: 1 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: tokens.color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  eyebrow: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.label,
    color: tokens.color.brand,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headline: {
    fontFamily: tokens.font.display,
    fontSize: 30,
    color: tokens.color.ink,
    lineHeight: 37,
    marginBottom: 12,
  },
  body: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.body,
    color: tokens.color.ink2,
    lineHeight: 22,
    marginBottom: 32,
  },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: tokens.space.inputH,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1.5,
    borderColor: tokens.color.line,
  },
  flagEmoji: { fontSize: 20 },
  callingCode: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.body,
    color: tokens.color.ink,
  },
  phoneInput: {
    flex: 1,
    height: tokens.space.inputH,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.input,
    borderWidth: 1.5,
    borderColor: tokens.color.line,
    paddingHorizontal: 16,
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.h3,
    color: tokens.color.ink,
  },
  phoneInputActive: { borderColor: tokens.color.ink, borderWidth: 2 },
  phoneInputErr: { borderColor: tokens.color.danger },
  error: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.danger,
    marginBottom: 8,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  privacyText: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.ink3,
  },
  ctaArea: {
    paddingHorizontal: tokens.space.screenH,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: tokens.color.bg,
  },
  btn: {
    height: tokens.space.buttonH,
    backgroundColor: tokens.color.ink,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: tokens.font.semibold, fontSize: tokens.size.body, color: tokens.color.bg },
  btnTextDisabled: { color: tokens.color.ink3 },
});
