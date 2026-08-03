-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: fix_kyc_submissions_rpc
-- Fixes the insert_kyc_submission RPC and kyc_submissions table
-- schema to match what the app expects.
--
-- Background:
-- The admin repo (basobas-admin) may have applied migrations that
-- altered the kyc_submissions table or the insert_kyc_submission
-- RPC, causing a CHECK constraint violation on the `status` column
-- when the app tries to submit KYC documents.
--
-- This migration ensures:
--   1. kyc_submissions.status CHECK allows 'UNDER_REVIEW' | 'VERIFIED' |
--   'REJECTED' (the 3 values the app uses — never UNVERIFIED for submissions)
--   2. The insert_kyc_submission RPC accepts 5 params and hardcodes
--   'UNDER_REVIEW' for the status column
--   3. electricity_bill_path column exists (added by prior migration)
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Fix the CHECK constraint on kyc_submissions.status
--    Drop any existing constraint and recreate with the correct values.
--
--    PostgreSQL auto-names it as "kyc_submissions_status_check" when
--    defined inline. Admin migrations may have renamed or replaced it,
--    so we find-and-drop by column name rather than relying on the
--    auto-generated name.
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Find any CHECK constraint on kyc_submissions that references the
  -- status column — regardless of its generated or custom name.
  SELECT con.conname INTO v_conname
  FROM   pg_constraint con
  JOIN   pg_class     cls ON con.conrelid = cls.oid
  JOIN   pg_namespace nsp ON cls.relnamespace = nsp.oid
  WHERE  nsp.nspname    = 'public'
  AND    cls.relname    = 'kyc_submissions'
  AND    con.contype    = 'c'
  AND    con.conkey     = ARRAY[
           (SELECT a.attnum
            FROM   pg_attribute a
            WHERE  a.attrelid = cls.oid
            AND    a.attname  = 'status')
         ];

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.kyc_submissions DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- Recreate with the canonical set of status values.
-- UNVERIFIED is NOT included — submissions are never created in that
-- state (the RPC hardcodes 'UNDER_REVIEW'). UNVERIFIED lives on
-- landlord_profiles.verification_status, not on kyc_submissions.
ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_status_check
  CHECK (status IN ('UNDER_REVIEW', 'VERIFIED', 'REJECTED'));

COMMENT ON CONSTRAINT kyc_submissions_status_check ON public.kyc_submissions IS
  'Submissions are created as UNDER_REVIEW, then moved to VERIFIED or REJECTED. UNVERIFIED is not a valid submission status — it exists only on landlord_profiles.verification_status.';


-- ────────────────────────────────────────────────────────────────────
-- 2. Ensure electricity_bill_path column exists
--    (Safe to re-run — IF NOT EXISTS is a no-op if present.)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS electricity_bill_path TEXT;

COMMENT ON COLUMN public.kyc_submissions.electricity_bill_path IS
  'Supabase storage path for the landlord electricity bill. Format: kyc-documents/{clerk_id}/{submission_id}/electricity.jpg';


-- ────────────────────────────────────────────────────────────────────
-- 3. Recreate the insert_kyc_submission RPC with the canonical
--    5-parameter signature.
--
--    Drop all known overloads first (UUID-based from the pre-Clerk era,
--    and any 4-param TEXT variant that the admin repo may have left
--    behind) before creating the canonical version.
-- ────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.insert_kyc_submission(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_kyc_submission(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_kyc_submission(TEXT, TEXT, TEXT, TEXT, TEXT);

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
  -- Enforce the 5-attempt limit
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

COMMENT ON FUNCTION public.insert_kyc_submission IS
  'Creates a KYC submission with status hardcoded to UNDER_REVIEW. Status is managed server-side only — the app never passes a status value.';


-- ────────────────────────────────────────────────────────────────────
-- 4. Ensure RLS policies on kyc_submissions are correct for Clerk JWT
--    Drop any stale policies (from the pre-Clerk auth.uid() era) and
--    recreate using requesting_user_id() which reads the Clerk JWT sub
--    claim.
-- ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "kyc_select_own"          ON public.kyc_submissions;
DROP POLICY IF EXISTS "kyc_insert_own"          ON public.kyc_submissions;
DROP POLICY IF EXISTS "kyc_select_own"          ON public.kyc_submissions;
DROP POLICY IF EXISTS "kyc_insert_own"          ON public.kyc_submissions;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_select_own"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (clerk_id = requesting_user_id());

CREATE POLICY "kyc_insert_own"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (clerk_id = requesting_user_id());
