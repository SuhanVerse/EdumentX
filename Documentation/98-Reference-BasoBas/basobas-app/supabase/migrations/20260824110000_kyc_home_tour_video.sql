-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: kyc_home_tour_video
-- Landlords can attach an optional 1–2 minute home-tour walkthrough
-- video to their KYC submission for extra verification.
--
--   1. New nullable column: kyc_submissions.home_tour_video_path
--   2. insert_kyc_submission gains an optional p_home_tour_video_path
--      param (all existing behaviour preserved, including 'PENDING')
--   3. New private `kyc-videos` storage bucket (100 MB cap, video mimes)
--      with owner-only RLS mirroring the kyc-documents policies
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Column
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS home_tour_video_path TEXT;


-- ────────────────────────────────────────────────────────────────────
-- 2. RPC — extends the live definition with p_home_tour_video_path.
--    Existing params/behaviour are unchanged.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.insert_kyc_submission(
  p_clerk_id               TEXT,
  p_document_type          TEXT,
  p_front_image_path       TEXT,
  p_back_image_path        TEXT,
  p_electricity_bill_path  TEXT DEFAULT NULL,
  p_selfie_image_path      TEXT DEFAULT NULL,
  p_verification_type      TEXT DEFAULT NULL,
  p_utility_bill_back_path TEXT DEFAULT NULL,
  p_utility_bill_type      TEXT DEFAULT NULL,
  p_home_tour_video_path   TEXT DEFAULT NULL
)
RETURNS public.kyc_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_submission public.kyc_submissions;
  v_verification_type TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.kyc_submissions
  WHERE clerk_id = p_clerk_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 verification attempts reached';
  END IF;

  v_verification_type := COALESCE(
    p_verification_type,
    CASE WHEN p_electricity_bill_path IS NULL THEN 'TENANT' ELSE 'LANDLORD' END
  );

  IF v_verification_type NOT IN ('TENANT', 'LANDLORD') THEN
    RAISE EXCEPTION 'Invalid verification type';
  END IF;
  IF p_utility_bill_type IS NOT NULL AND p_utility_bill_type NOT IN ('WATER', 'ELECTRICITY') THEN
    RAISE EXCEPTION 'Invalid utility bill type';
  END IF;

  INSERT INTO public.kyc_submissions (
    clerk_id,
    document_type,
    front_image_path,
    back_image_path,
    electricity_bill_path,
    utility_bill_front_path,
    utility_bill_back_path,
    utility_bill_type,
    selfie_image_path,
    verification_type,
    status,
    attempt_number,
    home_tour_video_path
  ) VALUES (
    p_clerk_id,
    p_document_type,
    p_front_image_path,
    p_back_image_path,
    p_electricity_bill_path,
    p_electricity_bill_path,
    p_utility_bill_back_path,
    p_utility_bill_type,
    p_selfie_image_path,
    v_verification_type,
    'PENDING',
    v_count + 1,
    p_home_tour_video_path
  )
  RETURNING * INTO v_submission;

  RETURN v_submission;
END;
$function$;

COMMENT ON FUNCTION public.insert_kyc_submission(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Creates a KYC submission (status PENDING). Optionally stores a landlord home-tour video path for extra verification. Status is managed server-side only.';


-- ────────────────────────────────────────────────────────────────────
-- 3. Storage bucket + owner-only RLS (mirrors kyc-documents)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-videos',
  'kyc-videos',
  FALSE,
  104857600,  -- 100 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = FALSE;

DROP POLICY IF EXISTS kyc_videos_owner_read ON storage.objects;
CREATE POLICY kyc_videos_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-videos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

DROP POLICY IF EXISTS kyc_videos_owner_insert ON storage.objects;
CREATE POLICY kyc_videos_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-videos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

DROP POLICY IF EXISTS kyc_videos_owner_delete ON storage.objects;
CREATE POLICY kyc_videos_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-videos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );
