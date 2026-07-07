-- ════════════════════════════════════════════════
-- requesting_user_id()
-- Reads Clerk user ID from JWT sub claim.
-- Replaces auth.uid() in all RLS policies.
-- Returns TEXT like "user_2abc123xyz"
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$;

COMMENT ON FUNCTION public.requesting_user_id() IS
  'Extracts Clerk user ID from JWT. Use instead of auth.uid().';


-- ════════════════════════════════════════════════
-- DROP OLD TABLES (from Supabase Auth era)
-- ════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_auth_new_user       ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_landlord_updated_at ON public.landlord_profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.upsert_profile_on_auth(UUID, TEXT);
DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT, TEXT, TEXT[], TEXT[], BOOLEAN, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_kyc_submission(UUID, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS public.kyc_submissions    CASCADE;
DROP TABLE IF EXISTS public.user_preferences   CASCADE;
DROP TABLE IF EXISTS public.landlord_profiles  CASCADE;
DROP TABLE IF EXISTS public.user_roles         CASCADE;
DROP TABLE IF EXISTS public.profiles           CASCADE;


-- ════════════════════════════════════════════════
-- PROFILES (clerk_id is TEXT, not UUID)
-- ════════════════════════════════════════════════

CREATE TABLE public.profiles (
  clerk_id              TEXT        PRIMARY KEY,
  phone                 TEXT        UNIQUE,
  full_name             TEXT,
  avatar_url            TEXT,
  avatar_path           TEXT,
  city                  TEXT,
  active_role           TEXT        CHECK (active_role IN ('tenant', 'landlord')),
  onboarding_complete   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════
-- USER_ROLES
-- ════════════════════════════════════════════════

CREATE TABLE public.user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT        NOT NULL REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('tenant', 'landlord')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, role)
);


-- ════════════════════════════════════════════════
-- LANDLORD_PROFILES
-- ════════════════════════════════════════════════

CREATE TABLE public.landlord_profiles (
  clerk_id                    TEXT        PRIMARY KEY
                                REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  verification_status         TEXT        NOT NULL DEFAULT 'UNVERIFIED'
                                CHECK (verification_status IN (
                                  'UNVERIFIED','UNDER_REVIEW','VERIFIED','REJECTED'
                                )),
  verification_submitted_at   TIMESTAMPTZ,
  verification_reviewed_at    TIMESTAMPTZ,
  verification_reject_reason  TEXT,
  avg_rating                  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_reviews               INTEGER      NOT NULL DEFAULT 0,
  is_phone_shared_default     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════
-- USER_PREFERENCES
-- ════════════════════════════════════════════════

CREATE TABLE public.user_preferences (
  clerk_id          TEXT        PRIMARY KEY
                      REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  property_types    TEXT[]      NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════
-- KYC_SUBMISSIONS
-- ════════════════════════════════════════════════

CREATE TABLE public.kyc_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id            TEXT        NOT NULL
                        REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  document_type       TEXT        NOT NULL CHECK (document_type IN ('CITIZENSHIP','NATIONAL_ID')),
  front_image_path    TEXT        NOT NULL,
  back_image_path     TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'UNDER_REVIEW'
                        CHECK (status IN ('UNDER_REVIEW','VERIFIED','REJECTED')),
  rejection_reason    TEXT,
  attempt_number      INTEGER     NOT NULL DEFAULT 1,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT
);


-- ════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════

CREATE INDEX idx_profiles_phone        ON public.profiles(phone);
CREATE INDEX idx_profiles_city         ON public.profiles(city);
CREATE INDEX idx_profiles_onboarding   ON public.profiles(onboarding_complete);
CREATE INDEX idx_user_roles_clerk_id   ON public.user_roles(clerk_id);
CREATE INDEX idx_landlord_verification ON public.landlord_profiles(verification_status);
CREATE INDEX idx_kyc_clerk_id          ON public.kyc_submissions(clerk_id);
CREATE INDEX idx_kyc_status            ON public.kyc_submissions(status);


-- ════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_landlord_updated_at
  BEFORE UPDATE ON public.landlord_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ════════════════════════════════════════════════
-- RLS POLICIES
-- All use requesting_user_id() not auth.uid()
-- ════════════════════════════════════════════════

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions   ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_read"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (clerk_id = requesting_user_id())
  WITH CHECK (clerk_id = requesting_user_id());

-- user_roles
CREATE POLICY "roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (clerk_id = requesting_user_id());

CREATE POLICY "roles_insert_own"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "roles_delete_own"
  ON public.user_roles FOR DELETE TO authenticated
  USING (clerk_id = requesting_user_id());

-- landlord_profiles
CREATE POLICY "landlord_read"
  ON public.landlord_profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "landlord_insert_own"
  ON public.landlord_profiles FOR INSERT TO authenticated
  WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "landlord_update_own"
  ON public.landlord_profiles FOR UPDATE TO authenticated
  USING (clerk_id = requesting_user_id())
  WITH CHECK (clerk_id = requesting_user_id());

-- user_preferences
CREATE POLICY "prefs_own_all"
  ON public.user_preferences FOR ALL TO authenticated
  USING (clerk_id = requesting_user_id())
  WITH CHECK (clerk_id = requesting_user_id());

-- kyc_submissions
CREATE POLICY "kyc_select_own"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (clerk_id = requesting_user_id());

CREATE POLICY "kyc_insert_own"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (clerk_id = requesting_user_id());


-- ════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',       'avatars',       TRUE,  5242880,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('kyc-documents', 'kyc-documents', FALSE, 10485760,
   ARRAY['image/jpeg','image/jpg','image/png'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"  ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_owner_read"   ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_owner_insert" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

CREATE POLICY "kyc_docs_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

CREATE POLICY "kyc_docs_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );


-- ════════════════════════════════════════════════
-- complete_onboarding RPC
-- p_clerk_id is TEXT not UUID
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_clerk_id           TEXT,
  p_phone              TEXT,
  p_full_name          TEXT,
  p_city               TEXT,
  p_roles              TEXT[],
  p_property_types     TEXT[],
  p_has_landlord_role  BOOLEAN,
  p_kyc_submission_id  UUID    DEFAULT NULL,
  p_avatar_url         TEXT    DEFAULT NULL,
  p_avatar_path        TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_clerk_id IS NULL OR TRIM(p_clerk_id) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'clerk_id required');
  END IF;
  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'full_name required');
  END IF;
  IF p_city IS NULL OR TRIM(p_city) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'city required');
  END IF;

  INSERT INTO public.profiles (
    clerk_id, phone, full_name, city, active_role,
    avatar_url, avatar_path, onboarding_complete
  )
  VALUES (
    p_clerk_id, p_phone, TRIM(p_full_name), TRIM(p_city),
    p_roles[1], p_avatar_url, p_avatar_path, TRUE
  )
  ON CONFLICT (clerk_id) DO UPDATE SET
    phone               = COALESCE(EXCLUDED.phone, profiles.phone),
    full_name           = EXCLUDED.full_name,
    city                = EXCLUDED.city,
    active_role         = EXCLUDED.active_role,
    avatar_url          = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    avatar_path         = COALESCE(EXCLUDED.avatar_path, profiles.avatar_path),
    onboarding_complete = TRUE,
    updated_at          = NOW();

  FOREACH v_role IN ARRAY p_roles LOOP
    INSERT INTO public.user_roles (clerk_id, role)
    VALUES (p_clerk_id, v_role)
    ON CONFLICT (clerk_id, role) DO NOTHING;
  END LOOP;

  INSERT INTO public.user_preferences (clerk_id, property_types)
  VALUES (p_clerk_id, p_property_types)
  ON CONFLICT (clerk_id) DO UPDATE
    SET property_types = EXCLUDED.property_types, updated_at = NOW();

  IF p_has_landlord_role THEN
    INSERT INTO public.landlord_profiles (
      clerk_id, verification_status, verification_submitted_at
    )
    VALUES (
      p_clerk_id,
      CASE WHEN p_kyc_submission_id IS NOT NULL THEN 'UNDER_REVIEW' ELSE 'UNVERIFIED' END,
      CASE WHEN p_kyc_submission_id IS NOT NULL THEN NOW() ELSE NULL END
    )
    ON CONFLICT (clerk_id) DO UPDATE SET
      verification_status       = EXCLUDED.verification_status,
      verification_submitted_at = EXCLUDED.verification_submitted_at,
      updated_at                = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success',             TRUE,
    'clerk_id',            p_clerk_id,
    'onboarding_complete', TRUE,
    'kyc_submitted',       p_kyc_submission_id IS NOT NULL
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;


-- ════════════════════════════════════════════════
-- insert_kyc_submission RPC
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.insert_kyc_submission(
  p_clerk_id         TEXT,
  p_document_type    TEXT,
  p_front_image_path TEXT,
  p_back_image_path  TEXT
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
    back_image_path, status, attempt_number
  )
  VALUES (
    p_clerk_id, p_document_type, p_front_image_path,
    p_back_image_path, 'UNDER_REVIEW', v_count + 1
  )
  RETURNING * INTO v_submission;

  RETURN v_submission;
END;
$$;
