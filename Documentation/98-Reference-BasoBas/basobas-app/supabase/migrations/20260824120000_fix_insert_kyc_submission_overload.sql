-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: fix_insert_kyc_submission_overload
--
-- Problem:
-- 20260824110000_kyc_home_tour_video.sql used CREATE OR REPLACE to add
-- p_home_tour_video_path, but the live project also had an older 9-param
-- definition. CREATE OR REPLACE only replaces a function with the SAME
-- argument list — so Postgres ended up with TWO overloads:
--
--   insert_kyc_submission(9 params)   -- legacy
--   insert_kyc_submission(10 params)  -- with p_home_tour_video_path
--
-- Every call that omits p_home_tour_video_path (all submissions without
-- a video) is then ambiguous and PostgREST rejects it with PGRST203
-- ("Could not choose the best candidate function"). New submissions
-- never reach the DB, so the Verification Status screen stays stuck on
-- an older row while landlord_profiles still shows VERIFIED.
--
-- Fix:
--   1. Drop the legacy 9-param overload — one canonical function remains.
--   2. Harden sync_landlord_verification_status: in-flight states
--      (PENDING / FLAGGED) must not downgrade an already-VERIFIED
--      landlord either (previously only UNDER_REVIEW was guarded).
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Remove the ambiguous legacy overload
-- ────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.insert_kyc_submission(
  TEXT, -- p_clerk_id
  TEXT, -- p_document_type
  TEXT, -- p_front_image_path
  TEXT, -- p_back_image_path
  TEXT, -- p_electricity_bill_path
  TEXT, -- p_selfie_image_path
  TEXT, -- p_verification_type
  TEXT, -- p_utility_bill_back_path
  TEXT  -- p_utility_bill_type
);

-- Refresh PostgREST's schema cache so the RPC resolves immediately.
NOTIFY pgrst, 'reload schema';


-- ────────────────────────────────────────────────────────────────────
-- 2. Sync trigger: treat every in-flight status as non-downgrading
-- ────────────────────────────────────────────────────────────────────

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
                            WHEN 'VERIFIED' THEN 'VERIFIED'
                            WHEN 'REJECTED' THEN 'REJECTED'
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
    AND NOT (
      NEW.status IN ('UNDER_REVIEW', 'PENDING', 'FLAGGED')
      AND verification_status = 'VERIFIED'
    );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_landlord_verification_status IS
  'Keeps landlord_profiles.verification_status in sync with the latest kyc_submissions.status. VERIFIED is terminal — an in-flight resubmission (UNDER_REVIEW/PENDING/FLAGGED) never downgrades an approved landlord.';
