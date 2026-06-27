import { supabase } from '@/src/lib/supabase'
import { uploadKYCDocument } from './storage.service'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import type { KYCSubmission } from '@/src/types/database.types'

export interface KYCSubmitInput {
  userId:        string
  documentType:  'CITIZENSHIP' | 'NATIONAL_ID'
  frontLocalUri: string
  backLocalUri:  string
}

export interface KYCSubmitResult {
  submissionId: string
  status:       'UNDER_REVIEW'
  frontPath:    string
  backPath:     string
}

/**
 * THE FIX: Upload files first (independently), then insert the DB
 * record via the SECURITY DEFINER RPC function to bypass any
 * RLS timing issues.
 */
export async function submitKYC(
  input: KYCSubmitInput
): Promise<Result<KYCSubmitResult>> {
  const { userId, documentType, frontLocalUri, backLocalUri } = input

  // Generate submission ID upfront (used for storage path)
  const submissionId = crypto.randomUUID()

  console.log('[submitKYC] Starting upload for submission:', submissionId)

  // ── 1. Upload front image ─────────────────────────────────────────────
  const frontResult = await uploadKYCDocument(
    userId, submissionId, 'front', frontLocalUri
  )
  if (!frontResult.success) {
    console.error('[submitKYC] Front upload failed:', frontResult.error)
    return err(`Front document upload failed: ${frontResult.error}`)
  }

  console.log('[submitKYC] Front uploaded:', frontResult.data.path)

  // ── 2. Upload back image ──────────────────────────────────────────────
  const backResult = await uploadKYCDocument(
    userId, submissionId, 'back', backLocalUri
  )
  if (!backResult.success) {
    console.error('[submitKYC] Back upload failed:', backResult.error)
    return err(`Back document upload failed: ${backResult.error}`)
  }

  console.log('[submitKYC] Back uploaded:', backResult.data.path)

  // ── 3. Insert DB record via RPC (SECURITY DEFINER bypasses RLS) ───────
  const { data, error } = await supabase.rpc('insert_kyc_submission', {
    p_user_id:          userId,
    p_document_type:    documentType,
    p_front_image_path: frontResult.data.path,
    p_back_image_path:  backResult.data.path,
  })

  if (error) {
    console.error('[submitKYC] DB insert failed:', error)
    return err(`KYC record save failed: ${error.message}`)
  }

  const submission = data as KYCSubmission
  console.log('[submitKYC] DB record created:', submission.id)

  return ok({
    submissionId: submission.id,
    status:       'UNDER_REVIEW',
    frontPath:    frontResult.data.path,
    backPath:     backResult.data.path,
  })
}

export async function getLatestKYCSubmission(
  userId: string
): Promise<Result<KYCSubmission | null>> {
  try {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    return ok(data)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}
