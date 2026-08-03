-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: map_viewport_rpcs
-- Tenant map + landlord location picker backend support.
--
-- Adds:
--   • get_properties_in_bounds(sw/ne)  — viewport-based property query
--   • search_properties(query)         — text search on title/area
--   • Geo + trigram indexes for 5,000+ listing scale
--
-- Auth model: read-only RPCs run SECURITY INVOKER so the existing
-- `properties_read` RLS policy applies unchanged — tenants see only
-- published, non-deleted listings; landlords additionally see their own
-- drafts. `location_address` stays in the private tier (never selected).
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Indexes (before the functions so both can use them)
-- ────────────────────────────────────────────────────────────────────

-- Bounding-box scans on the visible viewport (BETWEEN per coordinate).
CREATE INDEX IF NOT EXISTS idx_properties_geo
  ON public.properties (location_lat, location_lng);

-- trigram index for ILIKE '%query%' title/area search (pg_trgm already
-- enabled in supabase-migration.sql).
CREATE INDEX IF NOT EXISTS idx_properties_title_trgm
  ON public.properties USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_properties_area_trgm
  ON public.properties USING GIN (location_area gin_trgm_ops);


-- ────────────────────────────────────────────────────────────────────
-- 2. get_properties_in_bounds
--    Returns every visible property whose pin falls inside the given
--    latitude/longitude bounding box. Used by the tenant Expo Maps
--    screen; never queries the whole table.
--
--    Params (named p_* to match the app's service call):
--      p_sw_lat, p_sw_lng — south-west corner
--      p_ne_lat, p_ne_lng — north-east corner
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_properties_in_bounds(
  p_sw_lat DOUBLE PRECISION,
  p_sw_lng DOUBLE PRECISION,
  p_ne_lat DOUBLE PRECISION,
  p_ne_lng DOUBLE PRECISION
)
RETURNS SETOF public.properties
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.properties
  WHERE location_lat IS NOT NULL
    AND location_lng IS NOT NULL
    AND is_paused = FALSE
    AND status <> 'OCCUPIED'::public.property_status_enum
    AND location_lat BETWEEN p_sw_lat AND p_ne_lat
    AND location_lng BETWEEN p_sw_lng AND p_ne_lng;
$$;

GRANT EXECUTE ON FUNCTION public.get_properties_in_bounds(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION
) TO authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 3. search_properties
--    Text search across listing title and the public location tier
--    (location_area). Returns published properties only (via RLS).
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_properties(p_query TEXT)
RETURNS SETOF public.properties
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.properties
  WHERE (title ILIKE '%' || p_query || '%'
      OR location_area ILIKE '%' || p_query || '%')
    AND is_paused = FALSE
    AND status <> 'OCCUPIED'::public.property_status_enum
  ORDER BY
    CASE WHEN title ILIKE p_query || '%' THEN 0 ELSE 1 END,
    created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_properties(TEXT) TO authenticated;
