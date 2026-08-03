/**
 * Canonical KYC types for the BasoBas tenant app.
 *
 * The `KYCStatus` matches the database enum (`public.kyc_status_type`) and the
 * `verification_status_type` column on `profiles`. UI rendering uses a derived
 * `KYCStatusUi` enum that collapses `'UNVERIFIED'` into `'not_submitted'` and
 * the otherwise-distinct pending / under-verification states into a single
 * `'pending'` display state — the backend has no distinction and the screen
 * renders them identically.
 */
import type { Database } from './database.types';

/** Mirrors the DB enum. */
export type KYCStatus =
  | 'UNVERIFIED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

/**
 * UI-facing status. `'not_submitted'` covers the case where the tenant never
 * submitted at all — the profile column is null or `UNVERIFIED` and there's no
 * submission row to look at. `'pending'` covers everything in-flight.
 */
export type KYCStatusUi =
  | 'not_submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

export type KYCDocumentSlot = 'front' | 'back';

/** What `getLatestKYCSubmission()` returns — slimmed-down DB row. */
export interface KYCSubmission {
  id: string;
  clerkId: string;
  status: KYCStatus;
  documentType: 'CITIZENSHIP' | 'NATIONAL_ID';
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  attemptNumber: number;
  frontImagePath: string | null;
  backImagePath: string | null;
}

/** Helper: render UI state from a DB status. */
export const toKYCStatusUi = (
  dbStatus: KYCStatus | null | undefined,
  hasSubmission: boolean
): KYCStatusUi => {
  if (!hasSubmission || !dbStatus || dbStatus === 'UNVERIFIED') {
    return 'not_submitted';
  }
  switch (dbStatus) {
    case 'UNDER_REVIEW':
      return 'pending';
    case 'VERIFIED':
      return 'verified';
    case 'REJECTED':
      return 'rejected';
    default:
      return 'not_submitted';
  }
};

export type KYCSubmissionRow = Database['public']['Tables']['kyc_submissions']['Row'];
