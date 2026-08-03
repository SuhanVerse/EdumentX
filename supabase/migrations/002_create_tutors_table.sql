-- 002_create_tutors_table.sql
-- Tutors table: synced READ-ONLY copy of Firestore tutors/{uid} data.
-- This is the search-optimized replica for the AI chatbot.
-- Source of truth remains Firebase Firestore.
--
-- The `id` column matches the Firestore document ID (the user's uid).
-- All tutor writes happen in Firestore; this table is populated by
-- scripts/seedSupabaseTutors.ts and kept in sync via periodic sync.

CREATE TABLE IF NOT EXISTS public.tutors (
  -- Identity (synced from Firestore)
  id            TEXT PRIMARY KEY,   -- Matches Firestore doc id = user uid
  full_name     TEXT NOT NULL DEFAULT '',
  username      TEXT NOT NULL DEFAULT '',
  headline      TEXT NOT NULL DEFAULT '',
  bio           TEXT NOT NULL DEFAULT '',

  -- Teaching
  subjects          TEXT[] NOT NULL DEFAULT '{}',
  grades_teaching   TEXT[] NOT NULL DEFAULT '{}',
  years_experience  INTEGER NOT NULL DEFAULT 0,

  -- Pricing
  monthly_rate_npr  INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'NPR',

  -- Location
  neighborhood  TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  latitude      DOUBLE PRECISION,        -- NULL until map integration
  longitude     DOUBLE PRECISION,        -- NULL until map integration
  location_text TEXT GENERATED ALWAYS AS (
    CASE
      WHEN neighborhood <> '' AND city <> '' THEN neighborhood || ', ' || city
      WHEN city <> '' THEN city
      ELSE NULL
    END
  ) STORED,

  -- Verification
  verification_status   TEXT NOT NULL DEFAULT 'pending'
                          CHECK (verification_status IN ('pending', 'approved', 'rejected', 'more_info')),
  is_verified_professional BOOLEAN NOT NULL DEFAULT false,
  has_pending_update     BOOLEAN NOT NULL DEFAULT false,

  -- Stats
  rating        REAL NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count  INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  response_rate REAL NOT NULL DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 100),

  -- Contact (limited — full contact is in Firestore)
  phone         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',

  -- Credentials
  degree        TEXT NOT NULL DEFAULT '',
  institution   TEXT NOT NULL DEFAULT '',

  -- Media
  photo_url     TEXT,    -- NULL if no photo uploaded
  demo_video_url TEXT,   -- NULL if no demo video

  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Last Firestore sync timestamp
);

-- Indexes for common search queries
CREATE INDEX IF NOT EXISTS idx_tutors_verification_status ON public.tutors (verification_status)
  WHERE verification_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_tutors_subjects ON public.tutors USING GIN (subjects);

CREATE INDEX IF NOT EXISTS idx_tutors_monthly_rate ON public.tutors (monthly_rate_npr);

CREATE INDEX IF NOT EXISTS idx_tutors_city ON public.tutors (city);

CREATE INDEX IF NOT EXISTS idx_tutors_rating ON public.tutors (rating DESC);

-- Full-text search index for bio + headline (for keyword search fallback)
CREATE INDEX IF NOT EXISTS idx_tutors_fulltext
  ON public.tutors
  USING GIN (to_tsvector('english', bio || ' ' || headline || ' ' || full_name));

-- Enable Row-Level Security (required to prevent anon key access)
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (including anon) can read approved tutors
-- This is safe because tutor profiles are public discovery data
DROP POLICY IF EXISTS "Tutors are publicly readable" ON public.tutors;
CREATE POLICY "Tutors are publicly readable"
  ON public.tutors
  FOR SELECT
  USING (true);

-- Policy: Only service_role (server-side) can insert/update/delete
-- This prevents direct anon/authenticated writes
DROP POLICY IF EXISTS "Only service role can modify tutors" ON public.tutors;
CREATE POLICY "Only service role can modify tutors"
  ON public.tutors
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tutors_updated_at ON public.tutors;
CREATE TRIGGER trg_tutors_updated_at
  BEFORE UPDATE ON public.tutors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
