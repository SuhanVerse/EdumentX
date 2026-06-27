-- ============================================================
-- MIGRATION: fix_onboarding_flow
-- Fixes profile trigger, RLS, and complete_onboarding function
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- FIX 1: Drop and recreate profiles table with correct defaults
-- The phone column must allow NULL initially because the trigger
-- fires before auth.users.phone is confirmed in some Supabase versions
-- ────────────────────────────────────────────────────────────

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET phone = EXCLUDED.phone
    WHERE public.profiles.phone = ''
       OR public.profiles.phone IS NULL;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation due to profile trigger failure
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop old trigger and recreate to ensure it's active
DROP TRIGGER IF EXISTS trg_auth_new_user ON auth.users;
CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- FIX 2: Add upsert-safe profile creation function
-- Called from the client right after OTP verification
-- This is the reliable alternative to the trigger
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_profile_on_auth(
  p_user_id UUID,
  p_phone   TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (p_user_id, p_phone)
  ON CONFLICT (id) DO UPDATE
    SET phone = EXCLUDED.phone
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- FIX 3: Drop all old RLS policies and recreate cleanly
-- Old policies may conflict with each other
-- ────────────────────────────────────────────────────────────

-- PROFILES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read any profile
-- (needed for tenant viewing landlord, landlord viewing tenant requests)
CREATE POLICY "profiles_authenticated_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- User can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User can update only their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- USER_ROLES
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_select_own"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_own"  ON public.user_roles;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert_own"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_delete_own"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- LANDLORD_PROFILES
ALTER TABLE public.landlord_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "landlord_profiles_select_own"    ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_select_public" ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_insert_own"    ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_update_own"    ON public.landlord_profiles;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landlord_profiles_authenticated_read"
  ON public.landlord_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "landlord_profiles_insert_own"
  ON public.landlord_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "landlord_profiles_update_own"
  ON public.landlord_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- USER_PREFERENCES
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_own_all"
  ON public.user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- KYC_SUBMISSIONS
ALTER TABLE public.kyc_submissions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc_select_own"  ON public.kyc_submissions;
DROP POLICY IF EXISTS "kyc_insert_own"  ON public.kyc_submissions;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_select_own"
  ON public.kyc_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "kyc_insert_own"
  ON public.kyc_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- FIX 4: Rewrite complete_onboarding with step-by-step
-- error handling so failures are visible
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_user_id            UUID,
  p_full_name          TEXT,
  p_city               TEXT,
  p_roles              TEXT[],
  p_property_types     TEXT[],
  p_has_landlord_role  BOOLEAN,
  p_kyc_submission_id  UUID DEFAULT NULL,
  p_avatar_url         TEXT DEFAULT NULL,
  p_avatar_path        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_role  TEXT;
  v_role        TEXT;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'user_id is required');
  END IF;

  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'full_name is required');
  END IF;

  IF p_city IS NULL OR TRIM(p_city) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'city is required');
  END IF;

  IF p_roles IS NULL OR array_length(p_roles, 1) IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'at least one role is required');
  END IF;

  v_first_role := p_roles[1];

  -- Step 1: Update the profile
  UPDATE public.profiles
  SET
    full_name           = TRIM(p_full_name),
    city                = TRIM(p_city),
    active_role         = v_first_role::user_role_type,
    avatar_url          = COALESCE(p_avatar_url, avatar_url),
    avatar_path         = COALESCE(p_avatar_path, avatar_path),
    onboarding_complete = TRUE,
    updated_at          = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    -- Profile doesn't exist yet (trigger may have failed) — create it
    SELECT phone INTO STRICT v_first_role
    FROM auth.users WHERE id = p_user_id;

    -- Reset v_first_role
    v_first_role := p_roles[1];

    INSERT INTO public.profiles (
      id, phone, full_name, city, active_role,
      avatar_url, avatar_path, onboarding_complete
    )
    SELECT
      p_user_id, au.phone,
      TRIM(p_full_name),
      TRIM(p_city),
      v_first_role::user_role_type,
      p_avatar_url, p_avatar_path, TRUE
    FROM auth.users au
    WHERE au.id = p_user_id
    ON CONFLICT (id) DO UPDATE SET
      full_name           = EXCLUDED.full_name,
      city                = EXCLUDED.city,
      active_role         = EXCLUDED.active_role,
      avatar_url          = EXCLUDED.avatar_url,
      avatar_path         = EXCLUDED.avatar_path,
      onboarding_complete = TRUE,
      updated_at          = NOW();
  END IF;

  -- Step 2: Insert roles
  FOREACH v_role IN ARRAY p_roles LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, v_role::user_role_type)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  -- Step 3: Upsert preferences
  INSERT INTO public.user_preferences (user_id, property_types)
  VALUES (p_user_id, p_property_types::property_type_enum[])
  ON CONFLICT (user_id) DO UPDATE
    SET property_types = EXCLUDED.property_types,
        updated_at     = NOW();

  -- Step 4: Create landlord profile if needed
  IF p_has_landlord_role THEN
    INSERT INTO public.landlord_profiles (
      user_id,
      verification_status,
      verification_submitted_at
    )
    VALUES (
      p_user_id,
      CASE
        WHEN p_kyc_submission_id IS NOT NULL THEN 'UNDER_REVIEW'::verification_status_type
        ELSE 'UNVERIFIED'::verification_status_type
      END,
      CASE
        WHEN p_kyc_submission_id IS NOT NULL THEN NOW()
        ELSE NULL
      END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      verification_status       = EXCLUDED.verification_status,
      verification_submitted_at = EXCLUDED.verification_submitted_at,
      updated_at                = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success',             TRUE,
    'user_id',             p_user_id,
    'onboarding_complete', TRUE,
    'kyc_submitted',       p_kyc_submission_id IS NOT NULL,
    'kyc_submission_id',   p_kyc_submission_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error',   SQLERRM,
    'detail',  SQLSTATE
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- FIX 5: Create KYC submission insert function
-- Bypasses RLS timing issues by using SECURITY DEFINER
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.insert_kyc_submission(
  p_user_id          UUID,
  p_document_type    TEXT,
  p_front_image_path TEXT,
  p_back_image_path  TEXT
)
RETURNS public.kyc_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_submission    public.kyc_submissions;
BEGIN
  -- Check attempt limit
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.kyc_submissions
  WHERE user_id = p_user_id;

  IF v_attempt_count >= 5 THEN
    RAISE EXCEPTION 'Maximum verification attempts (5) reached for user %', p_user_id;
  END IF;

  INSERT INTO public.kyc_submissions (
    user_id,
    document_type,
    front_image_path,
    back_image_path,
    status,
    attempt_number
  )
  VALUES (
    p_user_id,
    p_document_type::document_type_type,
    p_front_image_path,
    p_back_image_path,
    'UNDER_REVIEW'::kyc_status_type,
    v_attempt_count + 1
  )
  RETURNING * INTO v_submission;

  RETURN v_submission;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- FIX 6: Storage bucket policies (drop + recreate cleanly)
-- ────────────────────────────────────────────────────────────

-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',        'avatars',        TRUE,  5242880,  ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('kyc-documents',  'kyc-documents',  FALSE, 10485760, ARRAY['image/jpeg','image/jpg','image/png'])
ON CONFLICT (id) DO UPDATE
  SET public           = EXCLUDED.public,
      file_size_limit  = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies (clean slate)
DROP POLICY IF EXISTS "avatars_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"   ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_owner_read"    ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_owner_insert"  ON storage.objects;

-- AVATARS: public read
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- AVATARS: authenticated owner can upload
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- AVATARS: owner can replace (upsert)
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- AVATARS: owner can delete
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- KYC DOCS: owner can read their own files only
CREATE POLICY "kyc_docs_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- KYC DOCS: owner can upload
CREATE POLICY "kyc_docs_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
