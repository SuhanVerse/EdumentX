-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: property_pause
-- Adds `is_paused` to `public.properties` so landlords can temporarily
-- hide a listing without soft-deleting it (which clears it from public
-- queries and disables relist) or marking it OCCUPIED (which locks the
-- property to one tenant).
--
-- Paused listings stay off the public listing query but are still
-- visible to the landlord on their My Properties list with a "Paused"
-- status. The existing `relist_property` RPC stays OCCUPIED-only; pause
-- is a lighter lifecycle and gets its own column.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- A paused listing is hidden from the public read, the same as a draft
-- or soft-deleted row. Landlord still sees their own rows (existing RLS).
DROP POLICY IF EXISTS "properties_read" ON public.properties;
CREATE POLICY "properties_read"
  ON public.properties FOR SELECT TO authenticated
  USING (
    (is_draft = FALSE AND is_deleted = FALSE AND is_paused = FALSE)
    OR landlord_id = requesting_user_id()
  );

-- Index for the landlord-side "is my row paused" lookups.
CREATE INDEX IF NOT EXISTS idx_properties_paused
  ON public.properties(landlord_id, is_paused);
