import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSignIn, useSignUp, getClerkInstance } from '@clerk/expo';
import { ArrowLeft, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { tokens } from '@/src/theme/tokens';
import { createClerkSupabaseClient } from '@/src/lib/supabase'
import { useAuthStore } from '@/src/store/authStore'
import { getProfile } from '@/src/services/profile.service'

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

/** Masks a phone number for display: +9779812345678 → +97798XXXX78 */
function maskPhone(p: string): string {
  if (!p || p.length < 6) return p;
  const keep = 4;
  return `${p.slice(0, keep)}${'X'.repeat(p.length - keep * 2)}${p.slice(-keep)}`;
}

export default function OTPVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; flow: 'sign-in' | 'sign-up' }>();
  const phone = params.phone ?? '';
  const flow = params.flow ?? 'sign-in';

  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { setProfile } = useAuthStore()

  const [code, codeSet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const isLoading = busy;

  // Countdown for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-submit when all digits entered
  useEffect(() => {
    if (code.length === CODE_LENGTH && !busy) verify(code);
  }, [code]);

  const verify = async (otp: string) => {
    setError(null);
    setBusy(true);

    try {
      if (flow === 'sign-in') {
        // Step 1: Verify the code (Future API)
        const { error: verifyError } = await signIn!.phoneCode.verifyCode({ code: otp });
        if (verifyError) {
          console.error('[OTP] sign-in verifyCode error:', {
            code: verifyError.code,
            message: verifyError.longMessage ?? verifyError.message,
          });
          handleClerkCode(verifyError.code);
          return;
        }

        // Step 2: Finalize the sign-in to create a Clerk session
        const { error: finalizeError } = await signIn!.finalize();
        if (finalizeError) {
          console.error('[OTP] sign-in finalize error:', {
            code: finalizeError.code,
            message: finalizeError.longMessage ?? finalizeError.message,
          });
          setError(finalizeError.longMessage ?? 'Could not complete sign in.');
          codeSet('');
          return;
        }

        // Step 3: Activate the session so Clerk knows the user is signed in
        const clerk = getClerkInstance();
        if (signIn!.createdSessionId && clerk) {
          console.log('[OTP] Activating session:', signIn!.createdSessionId);
          await clerk.setActive({ session: signIn!.createdSessionId });
        }

        // Step 4: Check if the user has already completed onboarding.
        // IMPORTANT: After setActive, we must use getClerkInstance() to get the
        // current user — useUser() from the hook still has the stale pre-render value.
        // We also create a fresh supabase client so the getToken closure captures
        // the newly activated session, not the stale one from the previous render.
        const currentUserId = clerk?.user?.id
        if (currentUserId) {
          console.log('[OTP] Checking onboarding status for user:', currentUserId);
          const freshSupabase = createClerkSupabaseClient(
            () => clerk.session?.getToken() ?? Promise.resolve(null)
          )
          const profileResult = await getProfile(currentUserId, freshSupabase)
          if (profileResult.success && profileResult.data.onboarding_complete) {
            setProfile(profileResult.data as any)
            const role = profileResult.data.active_role ?? 'tenant'
            const target = role === 'landlord' ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)'
            console.log('[OTP] Onboarding complete — routing to home:', target)
            router.replace(target as any)
            return
          }
        }

        // User is new or onboarding not complete → go through onboarding
        console.log('[OTP] Onboarding not complete — routing to role selection')
        router.replace('/(auth)/role');
      } else {
        // sign-up flow — use the underlying SignUp resource directly via clerk.client
        // This bypasses the Future API (which has a broken finalize) and uses the
        // Standard API which handles verification + session creation in one call.
        const clerk = getClerkInstance();
        if (!clerk?.client?.signUp) {
          console.error('[OTP] No sign-up found on clerk.client');
          setError('Session expired. Please restart.');
          codeSet('');
          return;
        }

        const result = await clerk.client.signUp.attemptPhoneNumberVerification({
          code: otp,
        });

        console.log('[OTP] sign-up result:', {
          status: result.status,
          hasSessionId: !!result.createdSessionId,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await clerk.setActive({ session: result.createdSessionId });

          // Step 5: For sign-up, also check if a profile already exists
          // (covers edge case where user partially completed onboarding before).
          const newUser = clerk.user
          if (newUser?.id) {
            const freshSupabase = createClerkSupabaseClient(
              () => clerk.session?.getToken() ?? Promise.resolve(null)
            )
            const profileResult = await getProfile(newUser.id, freshSupabase)
            if (profileResult.success && profileResult.data.onboarding_complete) {
              setProfile(profileResult.data as any)
              const role = profileResult.data.active_role ?? 'tenant'
              const target = role === 'landlord' ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)'
              router.replace(target as any)
              return
            }
          }

          router.replace('/(auth)/role');
        } else {
          console.error('[OTP] sign-up not complete:', result.status);
          setError('Verification incomplete. Please try again.');
          codeSet('');
        }
      }
    } catch (e: unknown) {
      const clerkErr = e as Record<string, unknown>;
      const code =
        (clerkErr?.code as string) ??
        ((clerkErr?.errors as Array<Record<string, unknown>>)?.[0]?.code as string) ??
        '';
      const message =
        (clerkErr?.longMessage as string) ??
        ((clerkErr?.errors as Array<Record<string, unknown>>)?.[0]?.longMessage as string) ??
        (clerkErr?.message as string) ??
        '';

      console.error('[OTP] Verification exception:', { code, message }, e);

      if (code) {
        handleClerkCode(code);
      } else {
        setError(message || 'Verification failed. Please try again.');
      }
      codeSet('');
    } finally {
      setBusy(false);
    }
  };

  const handleClerkCode = (clerkCode: string) => {
    console.error('[OTP] Clerk error code:', clerkCode);
    const messages: Record<string, string> = {
      form_code_incorrect: 'Incorrect code. Please try again.',
      verification_failed: 'Incorrect code. Please try again.',
      verification_expired: 'Code expired. Tap Resend for a new one.',
      too_many_requests: 'Too many attempts. Please wait.',
    };
    setError(messages[clerkCode] ?? `Verification failed (${clerkCode}). Try again.`);
    codeSet('');
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    codeSet('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (flow === 'sign-in') {
        await signIn!.phoneCode.sendCode();
      } else {
        // Use the Standard API via clerk.client for consistency
        const clerk = getClerkInstance();
        if (clerk?.client?.signUp) {
          await clerk.client.signUp.preparePhoneNumberVerification({
            strategy: 'phone_code',
          });
        } else {
          throw new Error('Sign-up not in progress');
        }
      }
      setCountdown(RESEND_SECONDS);
    } catch {
      setError('Could not resend. Please try again.');
    }
  };

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    codeSet(digits);
    if (error) setError(null);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <ArrowLeft size={20} color={tokens.color.ink} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <Text style={s.eyebrow}>ENTER YOUR CODE</Text>
        <Text style={s.headline}>{'Enter the\n6-digit code'}</Text>

        <Text style={s.body}>
          Sent to <Text style={s.phone}>{maskPhone(phone)}</Text>
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.wrong}>Wrong number?</Text>
        </TouchableOpacity>

        {/* OTP boxes */}
        <TouchableOpacity
          style={s.boxes}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const filled = i < code.length;
            const active = i === code.length && !isLoading;
            return (
              <View
                key={i}
                style={[s.box, active && s.boxActive, filled && s.boxFilled, error && s.boxError]}>
                {filled ? <View style={s.dot} /> : null}
                {active ? <View style={s.cursor} /> : null}
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            style={s.hidden}
            autoFocus
            caretHidden
          />
        </TouchableOpacity>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendBody}>Didn't get it? </Text>
          {countdown > 0 ? (
            <Text style={s.resendTimer}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={s.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security note */}
        <View style={s.secCard}>
          <Lock size={15} color={tokens.color.ink3} strokeWidth={2} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.secTitle}>Keep this code private</Text>
            <Text style={s.secBody}>BasoBas will never ask for your code.</Text>
          </View>
        </View>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={s.overlay}>
          <ActivityIndicator color={tokens.color.brand} size="large" />
          <Text style={s.overlayText}>Verifying...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  header: { paddingHorizontal: tokens.space.screenH, paddingTop: 16 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: tokens.color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, paddingHorizontal: tokens.space.screenH, paddingTop: 24 },
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
    lineHeight: 38,
    marginBottom: 8,
  },
  body: { fontFamily: tokens.font.sans, fontSize: tokens.size.body, color: tokens.color.ink2 },
  phone: { fontFamily: tokens.font.semibold, color: tokens.color.ink },
  wrong: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.bodySm,
    color: tokens.color.brand,
    marginTop: 4,
    marginBottom: 32,
  },
  boxes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    position: 'relative',
  },
  box: {
    width: 48,
    height: 58,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1.5,
    borderColor: tokens.color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: tokens.color.ink, backgroundColor: tokens.color.bg },
  boxFilled: { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
  boxError: { borderColor: tokens.color.danger },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.color.bg },
  cursor: { width: 2, height: 22, backgroundColor: tokens.color.ink },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  error: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.danger,
    marginBottom: 8,
  },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  resendBody: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.body,
    color: tokens.color.ink3,
  },
  resendTimer: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.body,
    color: tokens.color.ink,
  },
  resendLink: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.body,
    color: tokens.color.brand,
  },
  secCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: tokens.color.canvas,
    borderRadius: tokens.radius.md,
    padding: 16,
  },
  secTitle: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.bodySm,
    color: tokens.color.ink,
  },
  secBody: { fontFamily: tokens.font.sans, fontSize: tokens.size.body, color: tokens.color.ink2 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  overlayText: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.body,
    color: tokens.color.ink,
  },
});
