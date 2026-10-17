-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: record_property_view
--
-- The landlord dashboard reads properties.views for its "total views"
-- and "request rate" insights, but nothing ever incremented the column
-- — it stayed at 0 forever.
--
-- Adds record_property_view(p_property_id): an atomic increment any
-- visitor (anon or authenticated) can call when they open a listing.
-- Deleted listings are never counted. Deduplication (per user/session)
-- is deliberately out of scope for v1 — this is a coarse popularity
-- signal, not billing data.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_property_view(p_property_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.properties
     SET views = views + 1
   WHERE id = p_property_id
     AND is_deleted = FALSE;
$$;

COMMENT ON FUNCTION public.record_property_view(UUID) IS
  'Atomically increments properties.views for the listing detail screen. Callable by any visitor; no-ops for deleted listings.';

GRANT EXECUTE ON FUNCTION public.record_property_view(UUID) TO anon, authenticated;
