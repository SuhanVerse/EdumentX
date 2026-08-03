-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: kyc_electricity_bill
-- Adds electricity_bill_path column to kyc_submissions and updates
-- the insert_kyc_submission RPC to accept the new column.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Add electricity_bill_path column to kyc_submissions
--    This stores the Supabase storage path for the landlord's
--    electricity bill document.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS electricity_bill_path TEXT;

COMMENT ON COLUMN public.kyc_submissions.electricity_bill_path IS
  'Supabase storage path for the landlord electricity bill. Format: kyc-documents/{clerk_id}/{submission_id}/electricity.jpg';


-- ────────────────────────────────────────────────────────────────────
-- 2. Recreate insert_kyc_submission to accept p_electricity_bill_path
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.insert_kyc_submission(
  p_clerk_id               TEXT,
  p_document_type          TEXT,
  p_front_image_path       TEXT,
  p_back_image_path        TEXT,
  p_electricity_bill_path  TEXT DEFAULT NULL
)
RETURNS public.kyc_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count      INTEGER;
  v_submission public.kyc_submissions;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.kyc_submissions WHERE clerk_id = p_clerk_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 verification attempts reached';
  END IF;

  INSERT INTO public.kyc_submissions (
    clerk_id, document_type, front_image_path,
    back_image_path, electricity_bill_path,
    status, attempt_number
  )
  VALUES (
    p_clerk_id, p_document_type, p_front_image_path,
    p_back_image_path, p_electricity_bill_path,
    'UNDER_REVIEW', v_count + 1
  )
  RETURNING * INTO v_submission;

  RETURN v_submission;
END;
$$;
