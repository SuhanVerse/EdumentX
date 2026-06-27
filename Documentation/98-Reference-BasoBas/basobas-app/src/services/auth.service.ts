import { supabase, clearAllAuthStorage } from '@/src/lib/supabase'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import type { Session, User } from '@supabase/supabase-js'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OTPVerifiedResult {
  session:   Session
  user:      User
  isNewUser: boolean
}

// ─── DEV-ONLY: Test OTP Bypass ──────────────────────────────────────────────
// Supabase test credentials may not always intercept before Twilio.
// This bypass uses phone+password auth for the test number.
//
// HOW TO REMOVE: delete the 4 constants, the helper, and the 2 if-blocks below.
// Then delete the test user from Supabase Dashboard → Authentication → Users.

const TEST_PHONE = '+9779765308883'
const TEST_OTP   = '123456'
const TEST_PW    = 'dev-test-basobas-2024'

function isTestPhone(phone: string): boolean {
  return phone === TEST_PHONE || phone.replace(/\D/g, '') === '9765308883'
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Send OTP ─────────────────────────────────────────────────────────────────

export async function sendOTP(phone: string): Promise<Result<void>> {
  try {
    const normalized = normalizeNepalPhone(phone)
    if (!normalized) {
      return err('Invalid Nepal phone number. Enter 10 digits starting with 97 or 98.')
    }

    // DEV BYPASS: skip Twilio for test number
    if (__DEV__ && isTestPhone(normalized)) {
      console.log('[DEV] sendOTP skipped for test number')
      return ok(undefined)
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { channel: 'sms' },
    })

    if (error) {
      console.error('[sendOTP] error:', error)
      return err(mapAuthError(error.message))
    }

    return ok(undefined)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export async function verifyOTP(
  phone: string,
  token: string
): Promise<Result<OTPVerifiedResult>> {
  try {
    const normalized = normalizeNepalPhone(phone)
    if (!normalized) return err('Invalid phone number.')

    // DEV BYPASS: accept test pin, sign in via phone+password
    if (__DEV__ && isTestPhone(normalized) && token.trim() === TEST_OTP) {
      console.log('[DEV] verifyOTP bypass — phone+password auth')

      // NUCLEAR: Clear ALL auth storage (AsyncStorage + SecureStore)
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      await clearAllAuthStorage()
      console.log('[DEV] Nuked all auth storage')

      // Try sign-in first (user may exist with password)
      const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
        phone: normalized,
        password: TEST_PW,
      })

      console.log('[DEV] signIn result:', {
        hasSession: !!signIn?.session,
        hasUser: !!signIn?.user,
        error: signInErr?.message,
      })

      if (signIn?.session && signIn?.user) {
        console.log('[DEV] Signed in (existing user with password)')
        return await finishAuth(signIn.session, signIn.user, normalized)
      }

      // Try sign-up (creates user with password)
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        phone: normalized,
        password: TEST_PW,
      })

      console.log('[DEV] signUp result:', {
        hasUser: !!signUpData?.user,
        error: signUpErr?.message,
      })

      if (signUpErr) {
        const errMsg = signUpErr.message ?? ''
        const isAlreadyRegistered = errMsg.toLowerCase().includes('already registered') ||
                                   errMsg.toLowerCase().includes('already exists')

        if (isAlreadyRegistered) {
          // User exists but without password — need to delete from dashboard
          return err(
            'Test user exists without a password.\n\n' +
            'Go to Supabase Dashboard → Authentication → Users (NOT profiles table),\n' +
            'delete the user with phone +9779765308883, then try again.\n\n' +
            'Error details: ' + errMsg
          )
        }

        // Different error — return it
        return err(`Dev bypass sign-up failed: ${errMsg}`)
      }

      // Sign-up succeeded — now sign in
      const { data: signIn2, error: signIn2Err } = await supabase.auth.signInWithPassword({
        phone: normalized,
        password: TEST_PW,
      })

      console.log('[DEV] signIn after signUp result:', {
        hasSession: !!signIn2?.session,
        hasUser: !!signIn2?.user,
        error: signIn2Err?.message,
      })

      if (signIn2Err || !signIn2?.session || !signIn2?.user) {
        return err(`Dev bypass sign-in failed after sign-up: ${signIn2Err?.message ?? 'unknown error'}`)
      }

      console.log('[DEV] Signed in (new user)')
      return await finishAuth(signIn2.session, signIn2.user, normalized)
    }

    // ── Normal OTP flow ─────────────────────────────────────────────────
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: token.trim(),
      type:  'sms',
    })

    if (error) {
      console.error('[verifyOTP] error:', error)
      return err(mapAuthError(error.message))
    }

    if (!data.session || !data.user) {
      return err('Verification failed. Please try again.')
    }

    return await finishAuth(data.session, data.user, normalized)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Shared post-auth logic ───────────────────────────────────────────────────

async function finishAuth(
  session: Session,
  user:    User,
  phone:   string
): Promise<Result<OTPVerifiedResult>> {
  // Ensure profile row exists
  const { error: upsertError } = await supabase.rpc(
    'upsert_profile_on_auth',
    { p_user_id: user.id, p_phone: phone }
  )

  if (upsertError) {
    console.warn('[verifyOTP] profile upsert warning:', upsertError.message)
  }

  // Determine if new user
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .single()

  const isNewUser = !(profile?.onboarding_complete ?? false)

  return ok({ session, user, isNewUser })
}

// ─── Resend OTP ──────────────────────────────────────────────────────────────

export async function resendOTP(phone: string): Promise<Result<void>> {
  return sendOTP(phone)
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<Result<void>> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) return err(getErrorMessage(error))
    return ok(undefined)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeNepalPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('977')) {
    return `+${digits}`
  }
  if (digits.length === 10 && (digits.startsWith('97') || digits.startsWith('98'))) {
    return `+977${digits}`
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const stripped = digits.slice(1)
    if (stripped.startsWith('97') || stripped.startsWith('98')) {
      return `+977${stripped}`
    }
  }
  return null
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid') && m.includes('otp'))  return 'Incorrect code. Please try again.'
  if (m.includes('expired'))                        return 'Code expired. Tap Resend for a new one.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a few minutes.'
  return message
}
