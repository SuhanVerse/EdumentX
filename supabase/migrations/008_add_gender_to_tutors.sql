-- 008_add_gender_to_tutors.sql
-- Adds a gender column to the tutors table for student-facing gender preference filtering.
-- Gender is collected during tutor onboarding (Male / Female / Other) and stored in Firestore.
-- This migration adds the column so the Supabase replica stays in sync.

ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));

-- Index for gender filtering queries
CREATE INDEX IF NOT EXISTS idx_tutors_gender ON public.tutors (gender)
  WHERE gender IS NOT NULL;
