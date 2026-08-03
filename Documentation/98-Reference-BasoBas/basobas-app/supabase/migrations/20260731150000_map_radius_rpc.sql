-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: map_radius_rpc
-- Radius-based property search for the tenant map.
--
-- The tenant map's "search → radius → list" flow queries properties by
-- distance from a chosen center point instead of a viewport bounding
-- box. Adds:
--
--   • get_properties_near(lat, lng, radius_m) — every visible property
--     within `radius_m` meters of the center, nearest first.
--
-- Implementation: a latitude/longitude bounding box derived from the
-- radius uses the existing idx_properties_geo index; the precise
-- haversine distance is then applied as a final filter so the result
-- is an exact circle, not a square.
--
-- Auth model: same as get_properties_in_bounds — SECURITY INVOKER
-- (default), so `properties_read` RLS applies and `location_address`
-- (private tier) is never returned.
-- ════════════════════════════════════════════════════════════════════

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

COMMENT ON FUNCTION public.get_properties_near IS
  'Returns visible properties within p_radius_m meters of (p_lat, p_lng), nearest first. Bounding box drives the geo index; haversine guarantees a circular radius.';
