-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: map_available_only
-- Map RPCs now return available rentals only.
--
-- Existing deployments already ran map_viewport_rpcs / map_radius_rpc
-- without the availability filters, and Supabase never re-runs applied
-- migrations — so the three functions are re-created here with the
-- "available" business rule baked into SQL:
--
--   is_paused = FALSE AND status <> 'OCCUPIED'
--
-- (is_draft = FALSE and is_deleted = FALSE are already enforced by the
--  `properties_read` RLS policy via SECURITY INVOKER execution.)
-- ════════════════════════════════════════════════════════════════════

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


CREATE OR REPLACE FUNCTION public.get_properties_near(
  p_lat      DOUBLE PRECISION,
  p_lng      DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION
)
RETURNS SETOF public.properties
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  -- Degrees per meter: 1° lat ≈ 111,320 m; 1° lng ≈ 111,320 · cos(lat).
  SELECT *
  FROM public.properties
  WHERE location_lat IS NOT NULL
    AND location_lng IS NOT NULL
    AND is_paused = FALSE
    AND status <> 'OCCUPIED'::public.property_status_enum
    AND p_radius_m > 0
    AND location_lat BETWEEN p_lat - (p_radius_m / 111320.0)
                         AND p_lat + (p_radius_m / 111320.0)
    AND location_lng BETWEEN p_lng - (p_radius_m / (111320.0 * COS(RADIANS(p_lat))))
                         AND p_lng + (p_radius_m / (111320.0 * COS(RADIANS(p_lat))))
    AND 2 * 6371000.0 * ASIN(SQRT(
          POWER(SIN(RADIANS(p_lat - location_lat) / 2), 2)
        + COS(RADIANS(p_lat)) * COS(RADIANS(location_lat))
        * POWER(SIN(RADIANS(p_lng - location_lng) / 2), 2)
        )) <= p_radius_m
  ORDER BY 2 * 6371000.0 * ASIN(SQRT(
          POWER(SIN(RADIANS(p_lat - location_lat) / 2), 2)
        + COS(RADIANS(p_lat)) * COS(RADIANS(location_lat))
        * POWER(SIN(RADIANS(p_lng - location_lng) / 2), 2)
        )) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_properties_near(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION
) TO authenticated;


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
