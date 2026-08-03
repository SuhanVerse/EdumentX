-- 009_add_tutoring_mode_and_languages.sql
-- Adds two columns the chatbot previously extracted but never applied:
--   tutoring_mode — where the tutor teaches ('home', 'online', or 'both')
--   languages     — languages the tutor teaches in (text[])
-- Also adds trigram GIN indexes on city/neighborhood so partial matches like
-- "Baneshwor" succeed without full-word ILIKE wildcards.

-- Enable pg_trgm if not already (used by the trigram indexes below).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tutoring mode: 'home', 'online', or 'both'. Default 'both' so existing
-- tutors keep matching when this migration runs before the seeder re-runs.
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS tutoring_mode TEXT NOT NULL DEFAULT 'both'
  CHECK (tutoring_mode IN ('home', 'online', 'both'));

-- Languages: at minimum ['English','Nepali']. Empty array means "unknown"
-- and is excluded from the language filter via && overlap semantics.
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';

-- Index for tutoring_mode equality filters
CREATE INDEX IF NOT EXISTS idx_tutors_tutoring_mode ON public.tutors (tutoring_mode)
  WHERE tutoring_mode IS NOT NULL;

-- GIN index for languages overlap (any-match) queries
CREATE INDEX IF NOT EXISTS idx_tutors_languages ON public.tutors USING GIN (languages);

-- Trigram indexes support ILIKE '%x%' without a full table scan.
-- Migration 007 only filters on `t.city ILIKE '%x%'`; with a trigram index
-- the planner can use a fast bitmap scan, and we can extend the match
-- to `t.neighborhood` as well in migration 010.
CREATE INDEX IF NOT EXISTS idx_tutors_city_trgm
  ON public.tutors USING GIN (city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tutors_neighborhood_trgm
  ON public.tutors USING GIN (neighborhood gin_trgm_ops);