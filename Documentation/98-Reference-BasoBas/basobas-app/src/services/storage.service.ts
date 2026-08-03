import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import type { Database } from '@/src/types/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadedAvatar {
  path:      string
  publicUrl: string
}

export interface UploadedKYCDoc {
  path: string   // private storage path — never a public URL
}

// ─── Core uploader ───────────────────────────────────────────────────────────

/**
 * THE FIX: React Native requires ArrayBuffer, not Blob/FormData,
 * for Supabase Storage uploads. fetch(uri).blob() silently produces
 * an invalid object in React Native's runtime.
 */
async function localUriToArrayBuffer(
  uri: string
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const response  = await fetch(uri)
  const blob      = await response.blob()
  const mimeType  = blob.type || 'image/jpeg'

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({
      buffer:   reader.result as ArrayBuffer,
      mimeType,
    })
    reader.onerror = () => reject(new Error('FileReader failed to read file.'))
    reader.readAsArrayBuffer(blob)
  })
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

/**
 * Upload profile avatar.
 * Path: avatars/{clerkId}/avatar.jpg
 * upsert: true — replaces the existing file.
 */
export async function uploadAvatar(
  clerkId:  string,
  localUri: string,
  supabase: SupabaseClient<Database>
): Promise<Result<UploadedAvatar>> {
  try {
    const path = `${clerkId}/avatar.jpg`

    const { buffer, mimeType } = await localUriToArrayBuffer(localUri)

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType:  mimeType,
        upsert:       true,
        cacheControl: '3600',
      })

    if (error) {
      console.error('[uploadAvatar] storage error:', error)
      return err(`Avatar upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    return ok({ path, publicUrl })
  } catch (e) {
    console.error('[uploadAvatar] exception:', e)
    return err(getErrorMessage(e))
  }
}


// ─── KYC document upload ──────────────────────────────────────────────────────

/**
 * Upload one side of a KYC document to the private bucket.
 * Path: kyc-documents/{clerkId}/{submissionId}/{side}.jpg
 * Returns the storage path only — never a public URL.
 */
export async function uploadKYCDocument(
  clerkId:      string,
  submissionId: string,
  side:         'front' | 'back',
  localUri:     string,
  supabase:     SupabaseClient<Database>
): Promise<Result<UploadedKYCDoc>> {
  try {
    const path = `${clerkId}/${submissionId}/${side}.jpg`

    const { buffer, mimeType } = await localUriToArrayBuffer(localUri)

    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, buffer, {
        contentType:  mimeType,
        upsert:       false,
        cacheControl: '0',
      })

    if (error) {
      console.error(`[uploadKYCDocument] ${side} upload error:`, error)
      return err(`KYC ${side} document upload failed: ${error.message}`)
    }

    return ok({ path })
  } catch (e) {
    console.error(`[uploadKYCDocument] ${side} exception:`, e)
    return err(getErrorMessage(e))
  }
}


// ─── KYC Electricity Bill Upload ─────────────────────────────────────────────

/**
 * Upload the landlord's electricity bill to the private kyc-documents bucket.
 * Path: kyc-documents/{clerkId}/{submissionId}/electricity.jpg
 * Returns the storage path only — never a public URL.
 */
export async function uploadKYCElectricityBill(
  clerkId:      string,
  submissionId: string,
  localUri:     string,
  supabase:     SupabaseClient<Database>
): Promise<Result<UploadedKYCDoc>> {
  try {
    const path = `${clerkId}/${submissionId}/electricity.jpg`

    const { buffer, mimeType } = await localUriToArrayBuffer(localUri)

    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, buffer, {
        contentType:  mimeType,
        upsert:       false,
        cacheControl: '0',
      })

    if (error) {
      console.error('[uploadKYCElectricityBill] upload error:', error)
      return err(`Electricity bill upload failed: ${error.message}`)
    }

    return ok({ path })
  } catch (e) {
    console.error('[uploadKYCElectricityBill] exception:', e)
    return err(getErrorMessage(e))
  }
}
