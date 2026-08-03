-- 007_create_hybrid_search_function.sql
-- Hybrid search function: combines metadata filters (subject, budget, etc.)
-- with vector similarity search (pgvector cosine distance).
--
-- This function is called via supabase.rpc("hybrid_search_tutors", {...})
-- from the Edge Function. It accepts search constraints as JSON and an
-- optional query embedding for semantic search.
--
-- Usage:
--   SELECT * FROM hybrid_search_tutors(
--     '{"subject": "Mathematics", "budget_max": 5000}'::jsonb,
--     '[0.001, 0.002, ...]'::vector(384),
--     20
--   );

-- Explicitly set search path so vector type is resolvable
SET search_path TO public, extensions;

-- Drop existing function if it exists (for idempotent re-runs)
DROP FUNCTION IF EXISTS hybrid_search_tutors;

CREATE OR REPLACE FUNCTION hybrid_search_tutors(
  constraints_json JSONB DEFAULT '{}'::jsonb,
  query_embedding vector(384) DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id TEXT,
  full_name TEXT,
  username TEXT,
  headline TEXT,
  bio TEXT,
  subjects TEXT[],
  grades_teaching TEXT[],
  years_experience INTEGER,
  monthly_rate_npr INTEGER,
  neighborhood TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  rating REAL,
  review_count INTEGER,
  response_rate REAL,
  degree TEXT,
  institution TEXT,
  photo_url TEXT,
  similarity REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_subject TEXT;
  v_budget_max INTEGER;
  v_budget_min INTEGER;
  v_location TEXT;
  v_grade TEXT;
  v_min_rating REAL;
  v_min_experience INTEGER;
  v_gender TEXT;
BEGIN
  -- Extract constraints from JSON
  v_subject := constraints_json->>'subject';
  v_budget_max := (constraints_json->>'budget_max')::INTEGER;
  v_budget_min := (constraints_json->>'budget_min')::INTEGER;
  v_location := constraints_json->>'location_text';
  v_grade := constraints_json->>'grade_level';
  v_min_rating := (constraints_json->>'min_rating')::REAL;
  v_min_experience := (constraints_json->>'min_experience')::INTEGER;
  v_gender := constraints_json->>'gender_preference';

  -- If we have a query embedding, do hybrid search
  IF query_embedding IS NOT NULL THEN
    RETURN QUERY EXECUTE '
      SELECT
        t.id,
        t.full_name,
        t.username,
        t.headline,
        t.bio,
        t.subjects,
        t.grades_teaching,
        t.years_experience,
        t.monthly_rate_npr,
        t.neighborhood,
        t.city,
        t.latitude,
        t.longitude,
        t.rating,
        t.review_count,
        t.response_rate,
        t.degree,
        t.institution,
        t.photo_url,
        (1 - (te.embedding <=> $1))::REAL AS similarity
      FROM tutors t
      INNER JOIN tutor_embeddings te ON te.tutor_id = t.id
      WHERE t.verification_status = ''approved''
        AND t.has_pending_update = false'
      || CASE WHEN v_subject IS NOT NULL THEN
           ' AND t.subjects @> ARRAY[''' || quote_literal(v_subject) || ''']'
         ELSE '' END
      || CASE WHEN v_budget_max IS NOT NULL AND v_budget_max > 0 THEN
           ' AND t.monthly_rate_npr <= ' || v_budget_max
         ELSE '' END
      || CASE WHEN v_budget_min IS NOT NULL AND v_budget_min > 0 THEN
           ' AND t.monthly_rate_npr >= ' || v_budget_min
         ELSE '' END
      || CASE WHEN v_location IS NOT NULL THEN
           ' AND t.city ILIKE ''%' || replace(v_location, '''', '''''') || '%'''
         ELSE '' END
      || CASE WHEN v_grade IS NOT NULL THEN
           ' AND t.grades_teaching @> ARRAY[''' || quote_literal(v_grade) || ''']'
         ELSE '' END
      || CASE WHEN v_min_rating IS NOT NULL AND v_min_rating > 0 THEN
           ' AND t.rating >= ' || v_min_rating
         ELSE '' END
      || CASE WHEN v_min_experience IS NOT NULL AND v_min_experience > 0 THEN
           ' AND t.years_experience >= ' || v_min_experience
         ELSE '' END
      || CASE WHEN v_gender IS NOT NULL AND v_gender IN ('male', 'female', 'other') THEN
           ' AND t.gender = ''' || v_gender || ''''
         ELSE '' END
      || ' ORDER BY te.embedding <=> $1'
      || ' LIMIT ' || result_limit
    USING query_embedding;

  ELSE
    -- Metadata-only search (no vector similarity)
    RETURN QUERY EXECUTE '
      SELECT
        t.id,
        t.full_name,
        t.username,
        t.headline,
        t.bio,
        t.subjects,
        t.grades_teaching,
        t.years_experience,
        t.monthly_rate_npr,
        t.neighborhood,
        t.city,
        t.latitude,
        t.longitude,
        t.rating,
        t.review_count,
        t.response_rate,
        t.degree,
        t.institution,
        t.photo_url,
        0::REAL AS similarity
      FROM tutors t
      WHERE t.verification_status = ''approved''
        AND t.has_pending_update = false'
      || CASE WHEN v_subject IS NOT NULL THEN
           ' AND t.subjects @> ARRAY[''' || quote_literal(v_subject) || ''']'
         ELSE '' END
      || CASE WHEN v_budget_max IS NOT NULL AND v_budget_max > 0 THEN
           ' AND t.monthly_rate_npr <= ' || v_budget_max
         ELSE '' END
      || CASE WHEN v_budget_min IS NOT NULL AND v_budget_min > 0 THEN
           ' AND t.monthly_rate_npr >= ' || v_budget_min
         ELSE '' END
      || CASE WHEN v_location IS NOT NULL THEN
           ' AND t.city ILIKE ''%' || replace(v_location, '''', '''''') || '%'''
         ELSE '' END
      || CASE WHEN v_grade IS NOT NULL THEN
           ' AND t.grades_teaching @> ARRAY[''' || quote_literal(v_grade) || ''']'
         ELSE '' END
      || CASE WHEN v_min_rating IS NOT NULL AND v_min_rating > 0 THEN
           ' AND t.rating >= ' || v_min_rating
         ELSE '' END
      || CASE WHEN v_min_experience IS NOT NULL AND v_min_experience > 0 THEN
           ' AND t.years_experience >= ' || v_min_experience
         ELSE '' END
      || CASE WHEN v_gender IS NOT NULL AND v_gender IN ('male', 'female', 'other') THEN
           ' AND t.gender = ''' || v_gender || ''''
         ELSE '' END
      || ' ORDER BY t.rating DESC, t.review_count DESC'
      || ' LIMIT ' || result_limit;

  END IF;
END;
$$ SET search_path = public, extensions;

-- Grant execute permission to the service_role
-- (Edge Function uses service_role which bypasses RLS)
ALTER FUNCTION hybrid_search_tutors SECURITY DEFINER;
