-- 014_fix_grade_matching.sql
-- Replaces hybrid_search_tutors (from migration 013) to fix grade filtering
-- against REAL tutor data.
--
-- THE BUG: the old grade filter was `t.grades_teaching @> ARRAY['12']` —
-- an EXACT string containment. But real tutors pick their grades from the
-- app's own list (EditTeachingDetails.tsx):
--
--     "Grade 1-5", "Grade 6-8", "Grade 9-10",
--     "Grade XI (Science)", "Grade XI (Management)",
--     "Grade XII (Science)", "Grade XII (Management)"
--
-- None of those equal the literal string '12', so a "Maths grade 12 under
-- Rs 15k" search returned 0 rows even though 2 matching tutors existed.
-- Mock mode masked the bug because mock tutors use canonical "11"/"12"
-- tokens.
--
-- THE FIX: a `grade_to_terms()` normalizer maps EVERY grade representation
-- to a set of canonical grade numbers:
--   - "Grade XII (Science)"   → {12}
--   - "Grade XI (Management)" → {11}
--   - "Grade 9-10"            → {9, 10}
--   - "Grade 1-5"             → {1, 2, 3, 4, 5}
--   - "12" / "Grade 12"       → {12}
--   - "+2" / "plus 2"         → {11, 12}   (Nepali higher-secondary marker)
--   - unknown                  → {raw token} (degenerates to old behaviour)
--
-- The RPC then matches with OVERLAP: a tutor's grade set must intersect the
-- query's grade set. `grade_level: "12"` now matches a tutor who teaches
-- "Grade XII (Science)" — and does NOT match "Grade 1-5" (no overlap).
--
-- Mirrors supabase/ai/retrieval/sqlFilterBuilder.ts — keep in sync.

SET search_path TO public, extensions;

-- ─── Grade normalizer ────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS grade_to_terms(TEXT);

CREATE OR REPLACE FUNCTION grade_to_terms(g TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT := lower(trim(g));
  m TEXT[];
  a INT; b INT; i INT;
  terms TEXT[] := '{}';
BEGIN
  -- +2 / plus 2 / plus two / higher secondary → grades 11 and 12
  IF t IN ('+2', 'plus 2', 'plus two', 'higher secondary') THEN
    RETURN ARRAY['11', '12'];
  END IF;

  -- Roman numerals → digits. Longest-first so 'xii' is consumed before
  -- 'xi' and 'x' (word-boundary \m...\M so 'exam'/'science' never match).
  t := regexp_replace(t, '\mxii\M', '12', 'g');
  t := regexp_replace(t, '\mxi\M', '11', 'g');
  t := regexp_replace(t, '\mix\M', '9', 'g');
  t := regexp_replace(t, '\mviii\M', '8', 'g');
  t := regexp_replace(t, '\mvii\M', '7', 'g');
  t := regexp_replace(t, '\mvi\M', '6', 'g');
  t := regexp_replace(t, '\miv\M', '4', 'g');
  t := regexp_replace(t, '\miii\M', '3', 'g');
  t := regexp_replace(t, '\mx\M', '10', 'g');
  t := regexp_replace(t, '\mv\M', '5', 'g');
  t := regexp_replace(t, '\mii\M', '2', 'g');
  t := regexp_replace(t, '\mi\M', '1', 'g');

  -- Range: "9-10", "1-5", "6-8" (also en/em dash) → every grade in between
  m := regexp_match(t, '(\d{1,2})\s*[-–—]\s*(\d{1,2})');
  IF m IS NOT NULL THEN
    a := m[1]::INT;
    b := m[2]::INT;
    IF a >= 1 AND a <= 12 AND b >= 1 AND b <= 12 AND a <= b THEN
      FOR i IN a..b LOOP
        terms := terms || ARRAY[i::TEXT];
      END LOOP;
      RETURN terms;
    END IF;
  END IF;

  -- Single grade: any standalone 1-2 digit number
  m := regexp_match(t, '(^|[^0-9])(\d{1,2})([^0-9]|$)');
  IF m IS NOT NULL THEN
    a := m[2]::INT;
    IF a >= 1 AND a <= 12 THEN
      RETURN ARRAY[a::TEXT];
    END IF;
  END IF;

  -- Unknown representation: fall back to the raw token (old behaviour)
  RETURN ARRAY[g];
END;
$$;

-- ─── Search function (replaces 013) ──────────────────────────────────────────

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
  v_subject_terms TEXT[];
  v_budget_max INTEGER;
  v_budget_min INTEGER;
  v_location TEXT;
  v_grade TEXT;
  v_grade_terms TEXT[];
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

  -- Subject synonym terms: the JS side sends `subject_terms` (label +
  -- every keyword for that label). Wrap each in %...% for ILIKE ANY.
  -- Fall back to just the label when absent (backwards compatible).
  IF v_subject IS NOT NULL AND v_subject <> '' THEN
    v_subject_terms := ARRAY(
      SELECT '%' || x || '%'
      FROM jsonb_array_elements_text(
        COALESCE(constraints_json->'subject_terms', jsonb_build_array(v_subject))
      ) AS x
    );
    -- Defensive: an empty `subject_terms` array would make ILIKE ANY('{}')
    -- match nothing and spuriously return 0 rows. Fall back to the label.
    IF v_subject_terms IS NULL OR array_length(v_subject_terms, 1) = 0 THEN
      v_subject_terms := ARRAY['%' || v_subject || '%'];
    END IF;
  END IF;

  -- Grade terms: normalize the query grade to a canonical set. "12" → {12},
  -- "+2" → {11,12}. Matched by OVERLAP against the tutor's normalized set.
  IF v_grade IS NOT NULL AND v_grade <> '' THEN
    v_grade_terms := grade_to_terms(v_grade);
  END IF;

  -- Normalize tutoring_mode: callers send 'home_tuition' (chatbot-side) or
  -- 'home' / 'online' / 'both'. Map them to the column values.
  CASE (constraints_json->>'tutoring_mode')
    WHEN 'home_tuition' THEN v_tutoring_mode := 'home';
    WHEN 'home'         THEN v_tutoring_mode := 'home';
    WHEN 'online'       THEN v_tutoring_mode := 'online';
    ELSE v_tutoring_mode := NULL;
  END CASE;

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
                  THEN 'COALESCE((1 - (te.embedding <=> $1))::REAL, 0)::REAL'
                  ELSE '0::REAL'
             END || ' AS similarity
    FROM tutors t'
    || CASE WHEN query_embedding IS NOT NULL
            THEN ' LEFT JOIN tutor_embeddings te ON te.tutor_id = t.id'
            ELSE '' END
    || ' WHERE t.verification_status = ''approved''
        AND t.has_pending_update = false'
    -- subject: matches ANY keyword synonym for the label (ILIKE ANY).
    || CASE WHEN v_subject IS NOT NULL AND v_subject <> '' THEN
         ' AND EXISTS (SELECT 1 FROM unnest(t.subjects) s WHERE s ILIKE ANY($2))'
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
    -- grade level: OVERLAP of normalized grade sets. Fixes the exact
    -- `@>` containment that never matched "Grade XII (Science)" etc.
    || CASE WHEN v_grade IS NOT NULL AND v_grade <> '' THEN
         ' AND EXISTS (
              SELECT 1 FROM unnest(t.grades_teaching) g
              WHERE grade_to_terms(g) && $4
            )'
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
    -- verified_only (everyone approved is verified — kept as a hook)
    || CASE WHEN v_verified_only IS NOT NULL AND v_verified_only THEN
         ' AND t.is_verified_professional = true'
         ELSE '' END
    -- ORDER BY: vector similarity when embedding given (NULLS LAST so
    -- embedding-less tutors rank last, not first), else rating/review count
    || CASE WHEN query_embedding IS NOT NULL
            THEN ' ORDER BY (te.embedding <=> $1) NULLS LAST'
            ELSE ' ORDER BY t.rating DESC, t.review_count DESC'
       END
    || ' LIMIT ' || result_limit
  USING
    query_embedding,
    v_subject_terms,
    '%' || v_location || '%',
    v_grade_terms,
    v_gender,
    v_tutoring_mode,
    v_language;
END;
$$ SET search_path = public, extensions;

-- Grant execute permission to the service_role
ALTER FUNCTION hybrid_search_tutors SECURITY DEFINER;
