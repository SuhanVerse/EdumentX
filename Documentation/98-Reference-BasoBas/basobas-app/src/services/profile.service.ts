import { db } from '@/src/lib/supabase'
import { uploadAvatar } from './storage.service'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import type { Profile, ProfileUpdate } from '@/src/types/database.types'

// ─── Fetch ──────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's full profile.
 */
export async function getProfile(userId: string): Promise<Result<Profile>> {
  try {
    const { data, error } = await db
      .profiles()
      .select('*')
      .eq('id', userId)
      .single()

    if (error) return err(getErrorMessage(error))
    if (!data)  return err('Profile not found.')

    return ok(data)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Fetch a user's roles.
 */
export async function getUserRoles(
  userId: string
): Promise<Result<('tenant' | 'landlord')[]>> {
  try {
    const { data, error } = await db
      .userRoles()
      .select('role')
      .eq('user_id', userId)

    if (error) return err(getErrorMessage(error))

    return ok((data ?? []).map((r) => r.role))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}


// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update basic profile fields (name, city).
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Result<Profile>> {
  try {
    const { data, error } = await db
      .profiles()
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) return err(getErrorMessage(error))
    if (!data)  return err('Failed to update profile.')

    return ok(data)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Upload avatar and update the avatar_url on the profile.
 * Handles the full flow: upload file → get URL → update DB.
 */
export async function updateAvatar(
  userId: string,
  localUri: string
): Promise<Result<string>> {
  try {
    // 1. Upload to storage
    const uploadResult = await uploadAvatar(userId, localUri)
    if (!uploadResult.success) return err(uploadResult.error)

    // 2. Update profile with new URL and path
    const { error } = await db
      .profiles()
      .update({
        avatar_url:  uploadResult.data.publicUrl,
        avatar_path: uploadResult.data.path,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) return err(getErrorMessage(error))

    return ok(uploadResult.data.publicUrl)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Switch the user's active_role between tenant and landlord.
 */
export async function switchActiveRole(
  userId: string,
  role: 'tenant' | 'landlord'
): Promise<Result<void>> {
  try {
    const { error } = await db
      .profiles()
      .update({ active_role: role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) return err(getErrorMessage(error))
    return ok(undefined)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}
