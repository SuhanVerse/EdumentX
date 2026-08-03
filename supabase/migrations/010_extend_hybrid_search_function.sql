-- 010_extend_hybrid_search_function.sql
-- Replaces hybrid_search_tutors with a version that:
--   • Matches subject with case-insensitive PARTIAL match (ILIKE %x%)
--     so "Maths" finds tutors who list "Mathematics".
--   • Matches location against city OR neighborhood (was city-only).
--   • Applies tutoring_mode ('home' / 'online' / 'both' semantics).
--   • Applies languages with array overlap.
--   • Extracts every JSON key the chatbot emits, including ones the old
--     function silently dropped (verified_only, radius_km).
--
-- Mirrors supabase/ai/retrieval/sqlFilterBuilder.ts so the JS builder
-- and the RPC agree. If you change one, change the other.

SET search_path TO public, extensions;

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
  tutoring_mode TEXT,
  languages TEXT[],
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
  v_tutoring_mode TEXT;
  v_language TEXT;
  v_verified_only BOOLEAN;
BEGIN
  -- Extract constraints from JSON (one per known key).
  v_subject       := constraints_json->>'subject';
  v_budget_max    := (constraints_json->>'budget_max')::INTEGER;
  v_budget_min    := (constraints_json->>'budget_min')::INTEGER;
  v_location      := constraints_json->>'location_text';
  v_grade         := constraints_json->>'grade_level';
  v_min_rating    := (constraints_json->>'min_rating')::REAL;
  v_min_experience := (constraints_json->>'min_experience')::INTEGER;
  v_gender        := constraints_json->>'gender_preference';
  v_language      := constraints_json->>'language';
  v_verified_only := (constraints_json->>'verified_only')::BOOLEAN;

  -- Normalize tutoring_mode: callers send 'home_tuition' (chatbot-side) or
  -- 'home' / 'online' / 'both'. Map them to the column values.
  CASE (constraints_json->>'tutoring_mode')
    WHEN 'home_tuition' THEN v_tutoring_mode := 'home';
    WHEN 'home'         THEN v_tutoring_mode := 'home';
    WHEN 'online'       THEN v_tutoring_mode := 'online';
    ELSE v_tutoring_mode := NULL;
  END CASE;

  -- Build the WHERE-clause fragments once so the two branches (with/without
  -- embedding) stay in lockstep. Each fragment uses parameterized values
  -- passed via USING, except the simple equality ones (rating, experience,
  -- budget) which are safe to inline as integers.
  -- Note: `t_subjects` unnest pattern uses (SELECT 1 FROM unnest(...))
  -- to safely match any array element case-insensitively with ILIKE.
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
      t.tutoring_mode,
      t.languages,
      ' || CASE WHEN query_embedding IS NOT NULL
                  THEN '(1 - (te.embedding <=> $1))::REAL'
                  ELSE '0::REAL'
             END || ' AS similarity
    FROM tutors t'
    || CASE WHEN query_embedding IS NOT NULL
            THEN ' INNER JOIN tutor_embeddings te ON te.tutor_id = t.id'
            ELSE '' END
    || ' WHERE t.verification_status = ''approved''
        AND t.has_pending_update = false'
    -- subject: case-insensitive partial match against any array element
    || CASE WHEN v_subject IS NOT NULL AND v_subject <> '' THEN
         ' AND EXISTS (SELECT 1 FROM unnest(t.subjects) s WHERE s ILIKE $2)'
         ELSE '' END
    -- budget_max
    || CASE WHEN v_budget_max IS NOT NULL AND v_budget_max > 0 THEN
         ' AND t.monthly_rate_npr <= ' || v_budget_max
         ELSE '' END
    -- budget_min
    || CASE WHEN v_budget_min IS NOT NULL AND v_budget_min > 0 THEN
         ' AND t.monthly_rate_npr >= ' || v_budget_min
         ELSE '' END
    -- location: city OR neighborhood (trigram-indexed)
    || CASE WHEN v_location IS NOT NULL AND v_location <> '' THEN
         ' AND (t.city ILIKE $3 OR t.neighborhood ILIKE $3)'
         ELSE '' END
    -- grade level (still array containment — grades are canonical tokens)
    || CASE WHEN v_grade IS NOT NULL AND v_grade <> '' THEN
         ' AND t.grades_teaching @> ARRAY[$4]'
         ELSE '' END
    -- min_rating
    || CASE WHEN v_min_rating IS NOT NULL AND v_min_rating > 0 THEN
         ' AND t.rating >= ' || v_min_rating
         ELSE '' END
    -- min_experience
    || CASE WHEN v_min_experience IS NOT NULL AND v_min_experience > 0 THEN
         ' AND t.years_experience >= ' || v_min_experience
         ELSE '' END
    -- gender preference
    || CASE WHEN v_gender IS NOT NULL AND v_gender IN ('male', 'female', 'other') THEN
         ' AND t.gender = $5'
         ELSE '' END
    -- tutoring_mode: 'home' or 'online'. 'both' tutors satisfy either.
    || CASE WHEN v_tutoring_mode IS NOT NULL THEN
         ' AND (t.tutoring_mode = $6 OR t.tutoring_mode = ''both'')'
         ELSE '' END
    -- language overlap: any tutor language matches the requested one.
    || CASE WHEN v_language IS NOT NULL AND v_language <> '' THEN
         ' AND t.languages && ARRAY[$7]'
         ELSE '' END
    -- verified_only (currently everyone approved is verified — kept as a hook
    -- for when verification levels are introduced)
    || CASE WHEN v_verified_only IS NOT NULL AND v_verified_only THEN
         ' AND t.is_verified_professional = true'
         ELSE '' END
    -- ORDER BY: vector similarity when embedding given, else rating/review count
    || CASE WHEN query_embedding IS NOT NULL
            THEN ' ORDER BY te.embedding <=> $1'
            ELSE ' ORDER BY t.rating DESC, t.review_count DESC'
       END
    || ' LIMIT ' || result_limit
  USING
    query_embedding,
    '%' || v_subject || '%',
    '%' || v_location || '%',
    v_grade,
    v_gender,
    v_tutoring_mode,
    v_language;
END;
$$ SET search_path = public, extensions;

-- Grant execute permission to the service_role
ALTER FUNCTION hybrid_search_tutors SECURITY DEFINER;