import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadAvatar } from './storage.service'
import { submitKYC } from './kyc.service'
import { ok, err, type Result } from '@/src/lib/result'
import type { Database } from '@/src/types/database.types'

export interface OnboardingInput {
  clerkId:        string        // user.id from Clerk
  phone:          string        // user.phoneNumbers[0].phoneNumber from Clerk
  roles:          ('tenant' | 'landlord')[]
  fullName:       string
  city:           string
  avatarLocalUri: string | null
  preferences:    string[]
  kyc: {
    documentType:            'CITIZENSHIP' | 'NATIONAL_ID'
    frontLocalUri:           string
    backLocalUri:            string
    electricityBillLocalUri?: string  // Landlord-only
    homeTourVideoLocalUri?:  string   // Landlord-only optional walkthrough video
  } | null
  /** Session token getter — needed for the optional home-tour video upload. */
  getToken?: () => Promise<string | null>
  supabase: SupabaseClient<Database>
}

export async function completeOnboarding(
  input: OnboardingInput
): Promise<Result<{ onboardingComplete: true; kycSubmitted: boolean }>> {
  const {
    clerkId, phone, roles, fullName, city,
    avatarLocalUri, preferences, kyc, getToken, supabase,
  } = input

  let avatarUrl:       string | null = null
  let avatarPath:      string | null = null
  let kycSubmissionId: string | null = null

  // 1. Upload avatar (non-fatal — do not fail onboarding for this)
  if (avatarLocalUri) {
    const r = await uploadAvatar(clerkId, avatarLocalUri, supabase)
    if (r.success) {
      avatarUrl  = r.data.publicUrl
      avatarPath = r.data.path
    } else {
      console.warn('[Onboarding] Avatar upload skipped:', r.error)
    }
  }

  // 2. Create profile FIRST via complete_onboarding RPC (no KYC ID yet).
  //    This ensures the profile row exists BEFORE we try to insert KYC records
  //    that reference profiles(clerk_id) as a foreign key.
  const { data: profileResult, error: profileError } = await supabase.rpc('complete_onboarding', {
    p_clerk_id:          clerkId,
    p_phone:             phone,
    p_full_name:         fullName,
    p_city:              city,
    p_roles:             roles,
    p_property_types:    preferences,
    p_has_landlord_role: roles.includes('landlord'),
    p_kyc_submission_id: undefined,
    p_avatar_url:        avatarUrl ?? undefined,
    p_avatar_path:       avatarPath ?? undefined,
  })

  if (profileError) return err(`Database error: ${profileError.message}`)

  const profileResultData = profileResult as { success: boolean; error?: string }
  if (!profileResultData?.success) return err(profileResultData?.error ?? 'Onboarding failed.')

  // 3. Now that the profile exists, submit KYC (FK constraint satisfied).
  if (kyc) {
    const r = await submitKYC({
      clerkId, supabase,
      documentType:           kyc.documentType,
      frontLocalUri:          kyc.frontLocalUri,
      backLocalUri:           kyc.backLocalUri,
      electricityBillLocalUri: kyc.electricityBillLocalUri,
      homeTourVideoLocalUri:  kyc.homeTourVideoLocalUri,
      getToken,
    })
    if (!r.success) return err(r.error)
    kycSubmissionId = r.data.submissionId

    // 4. If landlord, update verification status now that KYC has been submitted.
    //    Calling complete_onboarding again is safe — it uses ON CONFLICT DO UPDATE,
    //    so the landlord profile's verification_status gets upgraded to UNDER_REVIEW.
    if (roles.includes('landlord')) {
      const { error: updateError } = await supabase.rpc('complete_onboarding', {
        p_clerk_id:          clerkId,
        p_phone:             phone,
        p_full_name:         fullName,
        p_city:              city,
        p_roles:             roles,
        p_property_types:    preferences,
        p_has_landlord_role: true,
        p_kyc_submission_id: kycSubmissionId,
        p_avatar_url:        avatarUrl ?? undefined,
        p_avatar_path:       avatarPath ?? undefined,
      })
      if (updateError) return err(`Landlord verification update failed: ${updateError.message}`)
    }
  }

  return ok({ onboardingComplete: true, kycSubmitted: kyc !== null })
}
