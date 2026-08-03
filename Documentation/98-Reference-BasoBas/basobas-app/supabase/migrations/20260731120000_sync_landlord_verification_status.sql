-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: sync_landlord_verification_status
--
-- Problem:
-- The admin repo (basobas-admin) reviews KYC submissions by updating
-- kyc_submissions.status (UNDER_REVIEW -> VERIFIED | REJECTED). The app,
-- however, reads verification from landlord_profiles.verification_status
-- (publish gate in step-4, Profile tab badge, Verification Status screen).
-- Nothing ever propagated kyc_submissions.status to that column, so a
-- landlord whose submission was approved still saw UNDER_REVIEW and could
-- not publish. The only write path (complete_onboarding) hardcodes
-- UNDER_REVIEW.
--
-- Fix:
-- A trigger keeps landlord_profiles.verification_status in sync with the
-- latest kyc_submissions row:
--   * VERIFIED   -> VERIFIED (terminal, never downgraded)
--   * REJECTED   -> REJECTED + reject reason + reviewed_at
--   * UNDER_REVIEW -> UNDER_REVIEW (new resubmission) — but only if the
--                     landlord is not already VERIFIED, so a fresh attempt
--                     can't revoke an existing approval.
-- Tenants (no landlord_profiles row) are unaffected — the UPDATE no-ops.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_landlord_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.landlord_profiles
  SET
    verification_status = CASE NEW.status
                            WHEN 'VERIFIED'   THEN 'VERIFIED'
                            WHEN 'REJECTED'   THEN 'REJECTED'
                            ELSE 'UNDER_REVIEW'
                          END,
    verification_submitted_at = CASE
                                  WHEN NEW.status = 'UNDER_REVIEW' THEN NEW.submitted_at
                                  ELSE verification_submitted_at
                                END,
    verification_reviewed_at = CASE
                                 WHEN NEW.status IN ('VERIFIED', 'REJECTED') THEN NEW.reviewed_at
                                 ELSE verification_reviewed_at
                               END,
    verification_reject_reason = CASE
                                   WHEN NEW.status = 'REJECTED' THEN NEW.rejection_reason
                                   ELSE NULL
                                 END,
    updated_at = NOW()
  WHERE clerk_id = NEW.clerk_id
    AND NOT (NEW.status = 'UNDER_REVIEW' AND verification_status = 'VERIFIED');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_landlord_verification_status IS
  'Keeps landlord_profiles.verification_status in sync with the latest kyc_submissions.status. VERIFIED is terminal — a resubmission (UNDER_REVIEW) never downgrades an approved landlord.';

DROP TRIGGER IF EXISTS trg_kyc_sync_landlord_status ON public.kyc_submissions;

CREATE TRIGGER trg_kyc_sync_landlord_status
  AFTER INSERT OR UPDATE OF status, rejection_reason, reviewed_at
  ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_landlord_verification_status();
