import { randomUUID } from 'expo-crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadKYCDocument, uploadKYCElectricityBill } from './storage.service'
import { ok, err, type Result } from '@/src/lib/result'
import type { Database } from '@/src/types/database.types'

export interface KYCInput {
  clerkId:          string         // Clerk TEXT ID
  documentType:     'CITIZENSHIP' | 'NATIONAL_ID'
  frontLocalUri:    string
  backLocalUri:     string
  electricityBillLocalUri?: string  // Landlord-only: electricity bill image
  supabase:         SupabaseClient<Database>
}

export interface KYCResult {
  submissionId: string
  status:       'UNDER_REVIEW'
}

export async function submitKYC(
  input: KYCInput
): Promise<Result<KYCResult>> {
  const { clerkId, documentType, frontLocalUri, backLocalUri, electricityBillLocalUri, supabase } = input
  const submissionId = randomUUID()

  // Upload front
  const frontResult = await uploadKYCDocument(clerkId, submissionId, 'front', frontLocalUri, supabase)
  if (!frontResult.success) return err(`Front upload failed: ${frontResult.error}`)

  // Upload back
  const backResult = await uploadKYCDocument(clerkId, submissionId, 'back', backLocalUri, supabase)
  if (!backResult.success) return err(`Back upload failed: ${backResult.error}`)

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

  // Insert DB record via SECURITY DEFINER RPC
  const { data, error } = await supabase.rpc('insert_kyc_submission', {
    p_clerk_id:               clerkId,
    p_document_type:          documentType,
    p_front_image_path:       frontResult.data.path,
    p_back_image_path:        backResult.data.path,
    p_electricity_bill_path:  electricityBillPath,
  })

  if (error) return err(`KYC DB failed: ${error.message}`)

  const row = data as { id: string }
  return ok({ submissionId: row.id, status: 'UNDER_REVIEW' })
}
