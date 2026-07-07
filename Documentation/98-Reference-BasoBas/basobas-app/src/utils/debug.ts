// src/utils/debug.ts  (DEV ONLY)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/src/types/database.types'

/** Run this after onboarding to check DB state (DEV ONLY) */
export async function debugOnboardingState(
  clerkId: string,
  supabase: SupabaseClient<Database>
) {
  if (!__DEV__) return

  console.group('=== ONBOARDING DEBUG ===')

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .single()
  console.log('PROFILE:', profile, profileErr?.message)

  const { data: roles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('*')
    .eq('clerk_id', clerkId)
  console.log('ROLES:', roles, rolesErr?.message)

  const { data: prefs, error: prefsErr } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle()
  console.log('PREFERENCES:', prefs, prefsErr?.message)

  const { data: landlord, error: landlordErr } = await supabase
    .from('landlord_profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle()
  console.log('LANDLORD_PROFILE:', landlord, landlordErr?.message)

  const { data: kyc, error: kycErr } = await supabase
    .from('kyc_submissions')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('submitted_at', { ascending: false })
    .limit(1)
  console.log('KYC_SUBMISSIONS:', kyc, kycErr?.message)

  // Check avatar storage
  const { data: avatarFiles } = await supabase.storage
    .from('avatars')
    .list(clerkId)
  console.log('AVATAR_STORAGE_FILES:', avatarFiles)

  // Check KYC storage (latest submission folder)
  if (kyc?.[0]) {
    const { data: kycFiles } = await supabase.storage
      .from('kyc-documents')
      .list(`${clerkId}/${kyc[0].id}`)
    console.log('KYC_STORAGE_FILES:', kycFiles)
  }

  console.groupEnd()
}
