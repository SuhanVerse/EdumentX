import { randomUUID } from 'expo-crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadKYCDocument, uploadKYCElectricityBill, uploadKYCHomeTourVideo } from './storage.service'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import { toKYCStatusUi, type KYCSubmission, type KYCStatus, type KYCStatusUi } from '@/src/types/kyc.types'
import type { Database } from '@/src/types/database.types'

export interface KYCInput {
  clerkId:          string         // Clerk TEXT ID
  documentType:     'CITIZENSHIP' | 'NATIONAL_ID'
  /**
   * Local file URI for the front document. If the user is resubmitting and
   * has not replaced the previously-uploaded front, pass the existing
   * storage path via `existingFrontPath` instead — leaving both `null`/
   * `undefined` for a side will fail the upload.
   */
  frontLocalUri:    string | null
  backLocalUri:     string | null
  /** Path of a previously-uploaded front doc (resubmit flow). */
  existingFrontPath?: string | null
  /** Path of a previously-uploaded back doc (resubmit flow). */
  existingBackPath?:  string | null
  electricityBillLocalUri?: string  // Landlord-only: electricity bill image
  /** Landlord-only optional 1–2 min home-tour video for extra verification. */
  homeTourVideoLocalUri?: string
  /** Session token getter — required when homeTourVideoLocalUri is provided. */
  getToken?:             () => Promise<string | null>
  supabase:         SupabaseClient<Database>
  /**
   * Optional per-side progress callback. Called repeatedly while each
   * document is uploading. `progress` is 0..1.
   *
   * Note: the Supabase JS Storage SDK doesn't expose raw upload bytes, so
   * callers should treat this as a *signal* to animate a progress bar
   * (e.g. drive a synthetic pulse from 0 → 0.9) rather than a true
   * byte counter. The final 1.0 should be reported from the await site
   * on success.
   */
  onProgress?:      (side: 'front' | 'back', progress: number) => void
}

export interface KYCResult {
  submissionId: string
  status:       'UNDER_REVIEW'
}

export async function submitKYC(
  input: KYCInput
): Promise<Result<KYCResult>> {
  const {
    clerkId,
    documentType,
    frontLocalUri,
    backLocalUri,
    existingFrontPath,
    existingBackPath,
    electricityBillLocalUri,
    homeTourVideoLocalUri,
    getToken,
    supabase,
    onProgress,
  } = input
  const submissionId = randomUUID()

  // Resolve front: reuse existing server path if the user didn't replace it,
  // otherwise upload the freshly-picked local file.
  let frontImagePath: string | null = existingFrontPath ?? null
  if (frontLocalUri) {
    onProgress?.('front', 0)
    const frontResult = await uploadKYCDocument(
      clerkId,
      submissionId,
      'front',
      frontLocalUri,
      supabase,
      (p) => onProgress?.('front', p)
    )
    if (!frontResult.success) {
      onProgress?.('front', 0)
      return err(`Front upload failed: ${frontResult.error}`)
    }
    frontImagePath = frontResult.data.path
    onProgress?.('front', 1)
  }
  if (!frontImagePath) {
    return err('Front document is missing — please re-upload.')
  }

  // Resolve back: same pattern.
  let backImagePath: string | null = existingBackPath ?? null
  if (backLocalUri) {
    onProgress?.('back', 0)
    const backResult = await uploadKYCDocument(
      clerkId,
      submissionId,
      'back',
      backLocalUri,
      supabase,
      (p) => onProgress?.('back', p)
    )
    if (!backResult.success) {
      onProgress?.('back', 0)
      return err(`Back upload failed: ${backResult.error}`)
    }
    backImagePath = backResult.data.path
    onProgress?.('back', 1)
  }
  if (!backImagePath) {
    return err('Back document is missing — please re-upload.')
  }

  // Upload electricity bill (landlord only — non-fatal if missing)
  let electricityBillPath: string | null = null
  if (electricityBillLocalUri) {
    const billResult = await uploadKYCElectricityBill(clerkId, submissionId, electricityBillLocalUri, supabase)
    if (!billResult.success) {
      console.warn('[KYC] Electricity bill upload skipped:', billResult.error)
    } else {
      electricityBillPath = billResult.data.path
    }
  }

  // Upload home-tour video (mandatory for landlord submissions).
  let homeTourVideoPath: string | null = null
  if (homeTourVideoLocalUri && getToken) {
    const videoResult = await uploadKYCHomeTourVideo(clerkId, submissionId, homeTourVideoLocalUri, {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      getToken,
    })
    if (!videoResult.success) {
      return err(videoResult.error)
    }
    homeTourVideoPath = videoResult.data.path
  }

  // Insert DB record via SECURITY DEFINER RPC.
  // `p_home_tour_video_path` is always sent — even as null. Omitting it
  // (undefined) makes PostgREST unable to pick between overloads when an
  // older signature lingers, failing the whole submission with PGRST203.
  const { data, error } = await supabase.rpc('insert_kyc_submission', {
    p_clerk_id:               clerkId,
    p_document_type:          documentType,
    p_front_image_path:       frontImagePath,
    p_back_image_path:        backImagePath,
    p_electricity_bill_path:  electricityBillPath ?? undefined,
    p_home_tour_video_path:   homeTourVideoPath ?? undefined,
  })

  if (error) return err(`KYC DB failed: ${error.message}`)

  const row = data as { id: string }
  return ok({ submissionId: row.id, status: 'UNDER_REVIEW' })
}

// ─── Read-side helpers ────────────────────────────────────────────────────────
/**
 * Fetch the most-recent KYC submission for a user.
 * Returns `ok(null)` if the user has never submitted.
 *
 * Used by the Upload screen (for pre-fill on resubmit) and the Status screen
 * (timeline + polling for the VERIFIED/REJECTED terminal state).
 */
export async function getLatestKYCSubmission(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<KYCSubmission | null>> {
  try {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('clerk_id', clerkId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    if (!data) return ok(null)

    const row = data as Database['public']['Tables']['kyc_submissions']['Row']
    return ok({
      id:                row.id,
      clerkId:           row.clerk_id,
      status:            row.status as KYCStatus,
      documentType:      row.document_type as 'CITIZENSHIP' | 'NATIONAL_ID',
      submittedAt:       row.submitted_at,
      reviewedAt:        row.reviewed_at,
      rejectionReason:   row.rejection_reason,
      attemptNumber:     row.attempt_number,
      frontImagePath:    row.front_image_path,
      backImagePath:     row.back_image_path,
      homeTourVideoPath: row.home_tour_video_path,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Resolve the user's UI-facing KYC status.
 *
 * The tenant flow's source of truth is `kyc_submissions` (sorted desc by
 * `submitted_at`). The `profiles.verification_status` column that previously
 * existed has been removed — it lives only on `landlord_profiles` today and
 * is never updated for tenants. We read submissions directly.
 *
 * Used by the Profile tab menu row to decide icon/subtitle/tap target.
 */
export async function getUserKYCStatusUi(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<KYCStatusUi>> {
  const sub = await getLatestKYCSubmission(clerkId, supabase)
  if (!sub.success) return err(sub.error)
  return ok(sub.data ? toKYCStatusUi(sub.data.status, true) : 'not_submitted')
}
