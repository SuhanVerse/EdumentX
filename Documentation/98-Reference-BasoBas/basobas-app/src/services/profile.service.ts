import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadAvatar } from './storage.service'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import type { Database } from '@/src/types/database.types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProfileRow {
  clerk_id:             string
  phone:                string | null
  full_name:            string | null
  avatar_url:           string | null
  avatar_path:          string | null
  city:                 string | null
  active_role:          'tenant' | 'landlord' | null
  onboarding_complete:  boolean
  created_at:           string
  updated_at:           string
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

/** Fetch the current user's full profile by Clerk ID. */
export async function getProfile(
  clerkId: string,
  supabase: SupabaseClient<Database>
): Promise<Result<ProfileRow>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    if (error) return err(getErrorMessage(error))
    if (!data)  return err('Profile not found.')

    return ok(data as ProfileRow)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** Fetch a user's roles by Clerk ID. */
export async function getUserRoles(
  clerkId: string,
  supabase: SupabaseClient<Database>
): Promise<Result<('tenant' | 'landlord')[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('clerk_id', clerkId)

    if (error) return err(getErrorMessage(error))

    return ok((data ?? []).map((r) => r.role as 'tenant' | 'landlord'))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/** Update basic profile fields (name, city). */
export async function updateProfile(
  clerkId: string,
  updates: Partial<ProfileRow>,
  supabase: SupabaseClient<Database>
): Promise<Result<ProfileRow>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (error) return err(getErrorMessage(error))
    if (!data)  return err('Failed to update profile.')

    return ok(data as ProfileRow)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** Upload avatar and update the avatar_url on the profile. */
export async function updateAvatar(
  clerkId: string,
  localUri: string,
  supabase: SupabaseClient<Database>
): Promise<Result<string>> {
  try {
    const uploadResult = await uploadAvatar(clerkId, localUri, supabase)
    if (!uploadResult.success) return err(uploadResult.error)

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url:  uploadResult.data.publicUrl,
        avatar_path: uploadResult.data.path,
        updated_at:  new Date().toISOString(),
      })
      .eq('clerk_id', clerkId)

    if (error) return err(getErrorMessage(error))

    return ok(uploadResult.data.publicUrl)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** Switch the user's active_role between tenant and landlord. */
export async function switchActiveRole(
  clerkId: string,
  role: 'tenant' | 'landlord',
  supabase: SupabaseClient<Database>
): Promise<Result<void>> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ active_role: role, updated_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)

    if (error) return err(getErrorMessage(error))
    return ok(undefined)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}
