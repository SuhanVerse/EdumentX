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

export interface UploadedPropertyPhoto {
  path:      string
  publicUrl: string
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
 *
 * `onProgress` receives a synthetic 0.1 → 0.9 progress signal every ~150ms
 * while the underlying upload is in flight. The Supabase JS Storage SDK
 * doesn't expose raw byte counts, so this is best-effort: callers should
 * still snap to 1.0 from the await site and treat 0.9 as "still working".
 */
export async function uploadKYCDocument(
  clerkId:      string,
  submissionId: string,
  side:         'front' | 'back',
  localUri:     string,
  supabase:     SupabaseClient<Database>,
  onProgress?:  (progress: number) => void
): Promise<Result<UploadedKYCDoc>> {
  let timer: ReturnType<typeof setInterval> | null = null
  try {
    const path = `${clerkId}/${submissionId}/${side}.jpg`

    const { buffer, mimeType } = await localUriToArrayBuffer(localUri)

    // Drive a synthetic 0.1 → 0.9 pulse while the upload runs. We start
    // *after* the local read finishes (the local fetch is instant for small
    // compressed JPEGs), so this loop corresponds roughly to network time.
    onProgress?.(0.1)
    let pulse = 0.1
    timer = setInterval(() => {
      // Converge towards 0.9 so the bar visually "approaches done" without
      // ever quite reaching it — the real 1.0 lands from the caller.
      pulse = Math.min(0.9, pulse + 0.08)
      onProgress?.(pulse)
    }, 150)

    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, buffer, {
        contentType:  mimeType,
        upsert:       false,
        cacheControl: '0',
      })

    if (timer) clearInterval(timer)
    timer = null

    if (error) {
      console.error(`[uploadKYCDocument] ${side} upload error:`, error)
      return err(`KYC ${side} document upload failed: ${error.message}`)
    }

    return ok({ path })
  } catch (e) {
    if (timer) clearInterval(timer)
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


// ─── Property photo upload ────────────────────────────────────────────────────

/**
 * Upload one listing photo to the public `property-photos` bucket.
 * Path: property-photos/{clerkId}/{propertyId}/{index}.jpg
 *
 * `index` is the photo's position in the listing's gallery, so re-uploading the
 * same slot replaces it (`upsert: true`) and the caller's URL array stays
 * order-stable. The bucket is public — RLS keys writes on the first path
 * segment matching the caller's Clerk id, so `clerkId` must be the signed-in
 * user or the insert is rejected.
 */
export async function uploadPropertyPhoto(
  clerkId:    string,
  propertyId: string,
  index:      number,
  localUri:   string,
  supabase:   SupabaseClient<Database>
): Promise<Result<UploadedPropertyPhoto>> {
  try {
    const path = `${clerkId}/${propertyId}/${index}.jpg`

    const { buffer, mimeType } = await localUriToArrayBuffer(localUri)

    const { error } = await supabase.storage
      .from('property-photos')
      .upload(path, buffer, {
        contentType:  mimeType,
        upsert:       true,
        cacheControl: '3600',
      })

    if (error) {
      console.error(`[uploadPropertyPhoto] photo ${index} upload error:`, error)
      return err(`Photo ${index + 1} upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-photos')
      .getPublicUrl(path)

    return ok({ path, publicUrl })
  } catch (e) {
    console.error(`[uploadPropertyPhoto] photo ${index} exception:`, e)
    return err(getErrorMessage(e))
  }
}
