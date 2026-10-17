-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: landlord_read_saved_properties
--
-- Problem:
-- The landlord dashboard counts tenant bookmarks with
--   select count(*) from saved_properties where property_id in (...)
-- but the only policy on saved_properties is "saved_own_all"
-- (USING clerk_id = requesting_user_id()) — a user can see ONLY their
-- own bookmarks. When the LANDLORD runs the count, RLS filters every
-- row away and totalSaves is always 0, no matter how many tenants
-- bookmarked the listings.
--
-- Fix:
-- Landlords may SELECT bookmark rows that point at properties they own.
-- Tenants' visibility is unchanged (their own policy still applies).
-- ════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "saved_landlord_read" ON public.saved_properties;

CREATE POLICY "saved_landlord_read"
  ON public.saved_properties FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = saved_properties.property_id
        AND p.landlord_id = requesting_user_id()
    )
  );

COMMENT ON POLICY "saved_landlord_read" ON public.saved_properties IS
  'Landlords can read (count) bookmarks on their own listings. Tenants keep full control of their own rows via saved_own_all.';
