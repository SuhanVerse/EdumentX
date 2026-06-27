import { supabase } from '@/src/lib/supabase'
import { uploadAvatar } from './storage.service'
import { submitKYC } from './kyc.service'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'

export interface OnboardingInput {
  userId:         string
  roles:          ('tenant' | 'landlord')[]

  fullName:       string
  city:           string
  avatarLocalUri: string | null
  preferences:    string[]
  kyc: {
    documentType:  'CITIZENSHIP' | 'NATIONAL_ID'
    frontLocalUri: string
    backLocalUri:  string
  } | null
}

export interface OnboardingResult {
  onboardingComplete: true
  kycSubmitted:       boolean
  kycSubmissionId:    string | null
}

export async function completeOnboarding(
  input: OnboardingInput
): Promise<Result<OnboardingResult>> {
  const { userId, roles, fullName, city, avatarLocalUri, preferences, kyc } = input

  console.log('[completeOnboarding] Starting for user:', userId)

  let avatarUrl:       string | null = null
  let avatarPath:      string | null = null
  let kycSubmissionId: string | null = null

  // ── Step 1: Upload avatar (optional) ───────────────────────────────────
  if (avatarLocalUri) {
    console.log('[completeOnboarding] Uploading avatar...')
    const avatarResult = await uploadAvatar(userId, avatarLocalUri)
    if (avatarResult.success) {
      avatarUrl  = avatarResult.data.publicUrl
      avatarPath = avatarResult.data.path
      console.log('[completeOnboarding] Avatar uploaded:', avatarUrl)
    } else {
      // Avatar failure is non-fatal — log and continue
      console.warn('[completeOnboarding] Avatar upload failed (non-fatal):', avatarResult.error)
    }
  }

  // ── Step 2: Upload KYC documents (if provided) ────────────────────────
  if (kyc) {
    console.log('[completeOnboarding] Uploading KYC documents...')
    const kycResult = await submitKYC({
      userId,
      documentType:  kyc.documentType,
      frontLocalUri: kyc.frontLocalUri,
      backLocalUri:  kyc.backLocalUri,
    })

    if (!kycResult.success) {
      console.error('[completeOnboarding] KYC upload failed:', kycResult.error)
      return err(kycResult.error)
    }

    kycSubmissionId = kycResult.data.submissionId
    console.log('[completeOnboarding] KYC submitted:', kycSubmissionId)
  }

  // ── Step 3: Complete onboarding via atomic RPC ────────────────────────
  console.log('[completeOnboarding] Calling complete_onboarding RPC...')

  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_user_id:           userId,
    p_full_name:         fullName,
    p_city:              city,
    p_roles:             roles,
    p_property_types:    preferences.length > 0 ? preferences : [],
    p_has_landlord_role: roles.includes('landlord'),
    p_kyc_submission_id: kycSubmissionId ?? undefined,
    p_avatar_url:        avatarUrl ?? undefined,
    p_avatar_path:       avatarPath ?? undefined,
  })

  if (error) {
    console.error('[completeOnboarding] RPC error:', error)
    return err(`Account setup failed: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result?.success) {
    console.error('[completeOnboarding] RPC returned failure:', result?.error)
    return err(result?.error ?? 'Account setup failed. Please try again.')
  }

  console.log('[completeOnboarding] Complete! Result:', result)

  return ok({
    onboardingComplete: true,
    kycSubmitted:       kyc !== null,
    kycSubmissionId,
  })
}
