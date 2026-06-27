-- ============================================================================
-- BasoBas — Supabase Database Migration (FULL RESET + FRESH SETUP)
-- Run this entire file in the Supabase SQL Editor.
-- Safe to re-run. Will drop and recreate all BasoBas objects.
-- ============================================================================
-- Order of operations:
--   0. CLEANUP — drop all existing BasoBas objects (types, tables, functions, etc.)
--   1. Extensions
--   2. Enums
--   3. Tables
--   4. Indexes
--   5. Triggers & Functions
--   6. Row Level Security (RLS) Policies
--   7. Storage Buckets & Policies
-- ============================================================================


-- ============================================================
-- 0. CLEANUP — drop all existing BasoBas objects
--    Safe to re-run. If object doesn't exist, error is suppressed.
-- ============================================================

-- ── Storage policies ──────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "kyc_docs_owner_read"   ON storage.objects;
  DROP POLICY IF EXISTS "kyc_docs_owner_insert" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
  DROP POLICY IF EXISTS "avatars_owner_insert"  ON storage.objects;
  DROP POLICY IF EXISTS "avatars_owner_update"  ON storage.objects;
  DROP POLICY IF EXISTS "avatars_owner_delete"  ON storage.objects;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ── RLS policies on public tables ───────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select_own"         ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_public"       ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert_own"          ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own"          ON public.profiles;
  DROP POLICY IF EXISTS "user_roles_select_own"        ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles_insert_own"        ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles_delete_own"        ON public.user_roles;
  DROP POLICY IF EXISTS "landlord_profiles_select_own" ON public.landlord_profiles;
  DROP POLICY IF EXISTS "landlord_profiles_select_public" ON public.landlord_profiles;
  DROP POLICY IF EXISTS "landlord_profiles_insert_own" ON public.landlord_profiles;
  DROP POLICY IF EXISTS "landlord_profiles_update_own" ON public.landlord_profiles;
  DROP POLICY IF EXISTS "user_preferences_select_own"  ON public.user_preferences;
  DROP POLICY IF EXISTS "user_preferences_insert_own"  ON public.user_preferences;
  DROP POLICY IF EXISTS "user_preferences_update_own"  ON public.user_preferences;
  DROP POLICY IF EXISTS "kyc_select_own"               ON public.kyc_submissions;
  DROP POLICY IF EXISTS "kyc_insert_own"               ON public.kyc_submissions;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ── Triggers ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_profiles_updated_at       ON public.profiles;
  DROP TRIGGER IF EXISTS trg_landlord_profiles_updated_at ON public.landlord_profiles;
  DROP TRIGGER IF EXISTS trg_auth_new_user             ON auth.users;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ── Functions ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP FUNCTION IF EXISTS public.update_updated_at();
  DROP FUNCTION IF EXISTS public.handle_new_user();
  DROP FUNCTION IF EXISTS public.get_next_kyc_attempt(p_user_id UUID);
  DROP FUNCTION IF EXISTS public.complete_onboarding(
    p_user_id UUID, p_full_name TEXT, p_city TEXT,
    p_roles user_role_type[], p_property_types property_type_enum[],
    p_has_landlord_role BOOLEAN, p_kyc_submission_id UUID
  );
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ── Tables (CASCADE handles foreign-key dependencies) ───────────────────────

DROP TABLE IF EXISTS public.kyc_submissions   CASCADE;
DROP TABLE IF EXISTS public.landlord_profiles CASCADE;
DROP TABLE IF EXISTS public.user_preferences  CASCADE;
DROP TABLE IF EXISTS public.user_roles        CASCADE;
DROP TABLE IF EXISTS public.profiles          CASCADE;

-- ── Custom enum types (CASCADE drops any remaining dependent functions) ─────

DROP TYPE IF EXISTS public.property_type_enum       CASCADE;
DROP TYPE IF EXISTS public.kyc_status_type           CASCADE;
DROP TYPE IF EXISTS public.document_type_type        CASCADE;
DROP TYPE IF EXISTS public.verification_status_type  CASCADE;
DROP TYPE IF EXISTS public.user_role_type            CASCADE;


-- ============================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
-- 2. ENUMS (safe to re-run — skips if type already exists)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('tenant', 'landlord');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status_type AS ENUM (
    'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type_type AS ENUM ('CITIZENSHIP', 'NATIONAL_ID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status_type AS ENUM (
    'UNDER_REVIEW', 'VERIFIED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE property_type_enum AS ENUM (
    'ROOM', 'APARTMENT', 'HOUSE', 'OFFICE', 'FLAT'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ============================================================
-- 3. TABLES (IF NOT EXISTS — safe to re-run)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                 TEXT        UNIQUE NOT NULL,
  full_name             TEXT,
  avatar_url            TEXT,
  avatar_path           TEXT,
  city                  TEXT,
  active_role           user_role_type,
  onboarding_complete   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profile data extending auth.users. Created on first OTP verification.';
COMMENT ON COLUMN public.profiles.avatar_path IS 'Internal storage path used to delete/replace the file. Format: avatars/{user_id}/avatar.jpg';
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'Set to TRUE only after all mandatory onboarding steps are done.';


-- ── user_roles ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        user_role_type  NOT NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

COMMENT ON TABLE public.user_roles IS 'Many-to-many between users and roles. One user can be both tenant and landlord.';


-- ── landlord_profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.landlord_profiles (
  user_id                     UUID                      PRIMARY KEY
                                REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_status         verification_status_type  NOT NULL DEFAULT 'UNVERIFIED',
  verification_submitted_at   TIMESTAMPTZ,
  verification_reviewed_at    TIMESTAMPTZ,
  verification_reject_reason  TEXT,
  avg_rating                  DECIMAL(3, 2)             NOT NULL DEFAULT 0.00,
  total_reviews               INTEGER                   NOT NULL DEFAULT 0,
  is_phone_shared_default     BOOLEAN                   NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.landlord_profiles IS 'Created when a user selects the landlord role during onboarding.';


-- ── user_preferences ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id           UUID                  PRIMARY KEY
                      REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_types    property_type_enum[]  NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);


-- ── kyc_submissions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id                  UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                  NOT NULL
                        REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type       document_type_type    NOT NULL,
  front_image_path    TEXT                  NOT NULL,
  back_image_path     TEXT                  NOT NULL,
  status              kyc_status_type       NOT NULL DEFAULT 'UNDER_REVIEW',
  rejection_reason    TEXT,
  attempt_number      INTEGER               NOT NULL DEFAULT 1,
  submitted_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID                  REFERENCES auth.users(id)
);

COMMENT ON TABLE public.kyc_submissions IS 'One row per KYC submission attempt. Attempt number increments on resubmission.';
COMMENT ON COLUMN public.kyc_submissions.front_image_path IS 'Supabase storage path (not URL). Format: kyc-documents/{user_id}/{submission_id}/front.jpg';
COMMENT ON COLUMN public.kyc_submissions.back_image_path IS 'Supabase storage path. Format: kyc-documents/{user_id}/{submission_id}/back.jpg';


-- ============================================================
-- 4. INDEXES (IF NOT EXISTS — safe to re-run)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_phone       ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_city        ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding  ON public.profiles(onboarding_complete);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role      ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_landlord_verification ON public.landlord_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status  ON public.kyc_submissions(status);


-- ============================================================
-- 5. TRIGGERS & FUNCTIONS
-- ============================================================

-- ── update_updated_at ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_landlord_profiles_updated_at
  BEFORE UPDATE ON public.landlord_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ── handle_new_user (auto-create profile on signup) ───────────────────────────

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
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_auth_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ── get_next_kyc_attempt ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_next_kyc_attempt(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.kyc_submissions
  WHERE user_id = p_user_id;
  RETURN v_count + 1;
END;
$$;


-- ── complete_onboarding (atomic finalization) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_user_id           UUID,
  p_full_name         TEXT,
  p_city              TEXT,
  p_roles             user_role_type[],
  p_property_types    property_type_enum[],
  p_has_landlord_role BOOLEAN,
  p_kyc_submission_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Update profile
  UPDATE public.profiles
  SET
    full_name           = p_full_name,
    city                = p_city,
    active_role         = p_roles[1],
    onboarding_complete = TRUE
  WHERE id = p_user_id;

  -- 2. Insert roles (upsert to handle duplicates)
  INSERT INTO public.user_roles (user_id, role)
  SELECT p_user_id, UNNEST(p_roles)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Upsert preferences
  INSERT INTO public.user_preferences (user_id, property_types)
  VALUES (p_user_id, p_property_types)
  ON CONFLICT (user_id) DO UPDATE
    SET property_types = EXCLUDED.property_types,
        updated_at     = NOW();

  -- 4. Create landlord profile if needed
  IF p_has_landlord_role THEN
    INSERT INTO public.landlord_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 5. Return summary
  SELECT jsonb_build_object(
    'success',              TRUE,
    'user_id',              p_user_id,
    'onboarding_complete',  TRUE,
    'roles',                p_roles,
    'kyc_submission_id',    p_kyc_submission_id
  ) INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ── Enable RLS on all tables (safe to re-run) ─────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions   ENABLE ROW LEVEL SECURITY;


-- ── profiles policies ─────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── user_roles policies ───────────────────────────────────────────────────────

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert_own"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_delete_own"
  ON public.user_roles FOR DELETE
  USING (auth.uid() = user_id);


-- ── landlord_profiles policies ────────────────────────────────────────────────

CREATE POLICY "landlord_profiles_select_own"
  ON public.landlord_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "landlord_profiles_select_public"
  ON public.landlord_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "landlord_profiles_insert_own"
  ON public.landlord_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "landlord_profiles_update_own"
  ON public.landlord_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── user_preferences policies ─────────────────────────────────────────────────

CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── kyc_submissions policies ──────────────────────────────────────────────────

CREATE POLICY "kyc_select_own"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kyc_insert_own"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 7. STORAGE BUCKETS & POLICIES
-- ============================================================

-- ── Bucket: avatars (PUBLIC) ──────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can VIEW avatars (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Only authenticated owner can UPLOAD their own avatar
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Only owner can UPDATE (replace) their avatar
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Only owner can DELETE their avatar
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );


-- ── Bucket: kyc-documents (PRIVATE) ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Only the owner can READ their own KYC documents
CREATE POLICY "kyc_docs_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Only the owner can UPLOAD their own KYC documents
CREATE POLICY "kyc_docs_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
