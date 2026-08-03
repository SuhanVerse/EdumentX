-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: landlord_properties_and_visits
-- Adds the landlord-side domain: properties, saved_properties,
-- visit_requests — plus enums, RLS, SECURITY DEFINER RPCs for landlord
-- visit-request transitions, and the property-photos storage bucket.
--
-- Auth model: all user IDs are Clerk TEXT ids. RLS reads the Clerk JWT
-- sub claim via requesting_user_id() (NEVER auth.uid()). Landlord-side
-- mutations on visit_requests happen ONLY through the RPCs below so that
-- tenants can't be edited directly and ownership is enforced server-side.
--
-- Reuses existing helpers from 20260704062145_clerk_auth_replace.sql:
--   • public.requesting_user_id()  — Clerk sub claim
--   • public.update_updated_at()   — updated_at trigger fn
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 0. Replace the admin repo's landlord-domain tables.
--    basobas-admin previously created listings / listing_images /
--    listing_room_preferences / saved_listings / visit_requests with a
--    TEXT-status schema whose RLS used auth.uid() (which never matches a
--    Clerk-authenticated request). We deliberately replace that domain
--    with the enum-based, Clerk-native schema below. All of these tables
--    are currently empty, so this drops no data. CASCADE clears their
--    policies, triggers, and FKs.
-- ────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.visit_requests            CASCADE;
DROP TABLE IF EXISTS public.saved_listings            CASCADE;
DROP TABLE IF EXISTS public.listing_room_preferences  CASCADE;
DROP TABLE IF EXISTS public.listing_images            CASCADE;
DROP TABLE IF EXISTS public.listings                  CASCADE;


-- ────────────────────────────────────────────────────────────────────
-- 1. Enums (guarded — CREATE TYPE has no IF NOT EXISTS)
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.property_type_enum AS ENUM
    ('ROOM','APARTMENT','HOUSE','OFFICE','FLAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.property_status_enum AS ENUM
    ('AVAILABLE','HIGH_DEMAND','UNDER_DISCUSSION','OCCUPIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.visit_status_enum AS ENUM
    ('PENDING','ACCEPTED','RESCHEDULED','REJECTED','VISIT_COMPLETED',
     'DISCUSSION_ONGOING','RENTAL_FINALIZED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.time_slot_enum AS ENUM
    ('MORNING','AFTERNOON','EVENING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────────
-- 2. properties
--    Two-tier location:
--      • public tier  : location_area (shown on every listing)
--      • private tier : location_address / lat / lng
--        (revealed ONLY after a visit is accepted — never selected by
--         the public listing query; see properties.service.ts)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.properties (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id         TEXT        NOT NULL
                        REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT,
  property_type       public.property_type_enum NOT NULL,
  price               INTEGER     NOT NULL,
  deposit             INTEGER,
  status              public.property_status_enum NOT NULL DEFAULT 'AVAILABLE',
  furnishing          TEXT,
  bedrooms            INTEGER,
  bathrooms           INTEGER,
  area_sqft           INTEGER,
  floor               INTEGER,
  total_floors        INTEGER,
  amenities           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  photo_urls          TEXT[]      NOT NULL DEFAULT '{}',
  available_from      DATE        NOT NULL,

  -- Public location tier
  location_area       TEXT        NOT NULL,
  -- Private location tier (nullable until a map picker is added)
  location_address    TEXT,
  location_lat        DOUBLE PRECISION,
  location_lng        DOUBLE PRECISION,

  -- Type-specific extras that don't warrant a column (kitchenAccess,
  -- tenantPref, hasGarden, kitchenette, …) live here as JSON.
  extra_details       JSONB       NOT NULL DEFAULT '{}'::jsonb,

  is_draft            BOOLEAN     NOT NULL DEFAULT TRUE,
  is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
  linked_occupant_id  TEXT        REFERENCES public.profiles(clerk_id) ON DELETE SET NULL,
  views               INTEGER     NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status   ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_visible
  ON public.properties(is_draft, is_deleted);


-- ────────────────────────────────────────────────────────────────────
-- 3. saved_properties (tenant bookmarks)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_properties (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT        NOT NULL
                 REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  property_id  UUID        NOT NULL
                 REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_clerk ON public.saved_properties(clerk_id);


-- ────────────────────────────────────────────────────────────────────
-- 4. visit_requests
--    landlord_id is denormalized from the property so RLS + landlord
--    dashboards can filter without a join.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visit_requests (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id            UUID        NOT NULL
                           REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id              TEXT        NOT NULL
                           REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  landlord_id            TEXT        NOT NULL
                           REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  status                 public.visit_status_enum NOT NULL DEFAULT 'PENDING',
  requested_date         DATE        NOT NULL,
  time_slot              public.time_slot_enum NOT NULL,
  note                   TEXT,
  reschedule_count       INTEGER     NOT NULL DEFAULT 0,
  landlord_response_note TEXT,       -- reject reason / reschedule message
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_landlord ON public.visit_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_visits_tenant   ON public.visit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visits_property ON public.visit_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_visits_status   ON public.visit_requests(status);


-- ────────────────────────────────────────────────────────────────────
-- 5. updated_at triggers (reuse public.update_updated_at())
-- ────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_visits_updated_at ON public.visit_requests;
CREATE TRIGGER trg_visits_updated_at
  BEFORE UPDATE ON public.visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ════════════════════════════════════════════════════════════════════
-- 6. RLS
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.properties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests   ENABLE ROW LEVEL SECURITY;

-- properties ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "properties_read"        ON public.properties;
DROP POLICY IF EXISTS "properties_insert_own"  ON public.properties;
DROP POLICY IF EXISTS "properties_update_own"  ON public.properties;

-- Public sees published, non-deleted listings; owner sees all their own.
CREATE POLICY "properties_read"
  ON public.properties FOR SELECT TO authenticated
  USING (
    (is_draft = FALSE AND is_deleted = FALSE)
    OR landlord_id = requesting_user_id()
  );

CREATE POLICY "properties_insert_own"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (landlord_id = requesting_user_id());

CREATE POLICY "properties_update_own"
  ON public.properties FOR UPDATE TO authenticated
  USING (landlord_id = requesting_user_id())
  WITH CHECK (landlord_id = requesting_user_id());

-- saved_properties ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "saved_own_all" ON public.saved_properties;

CREATE POLICY "saved_own_all"
  ON public.saved_properties FOR ALL TO authenticated
  USING (clerk_id = requesting_user_id())
  WITH CHECK (clerk_id = requesting_user_id());

-- visit_requests ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "visits_read"          ON public.visit_requests;
DROP POLICY IF EXISTS "visits_insert_tenant" ON public.visit_requests;
DROP POLICY IF EXISTS "visits_update_tenant" ON public.visit_requests;

-- Both parties can read a request.
CREATE POLICY "visits_read"
  ON public.visit_requests FOR SELECT TO authenticated
  USING (
    tenant_id = requesting_user_id()
    OR landlord_id = requesting_user_id()
  );

-- Only the tenant creates/edits their own request directly. Landlord
-- transitions go exclusively through the SECURITY DEFINER RPCs below
-- (definer bypasses RLS), so there is deliberately NO landlord UPDATE
-- policy here.
CREATE POLICY "visits_insert_tenant"
  ON public.visit_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id = requesting_user_id());

CREATE POLICY "visits_update_tenant"
  ON public.visit_requests FOR UPDATE TO authenticated
  USING (tenant_id = requesting_user_id())
  WITH CHECK (tenant_id = requesting_user_id());


-- ════════════════════════════════════════════════════════════════════
-- 7. RPCs (SECURITY DEFINER — ownership enforced via requesting_user_id())
-- ════════════════════════════════════════════════════════════════════

-- recalculate_property_status ────────────────────────────────────────
-- Derives AVAILABLE / HIGH_DEMAND / UNDER_DISCUSSION from open visits.
-- Never overrides a manually OCCUPIED property.
CREATE OR REPLACE FUNCTION public.recalculate_property_status(p_property_id UUID)
RETURNS public.property_status_enum
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current    public.property_status_enum;
  v_pending    INTEGER;
  v_discussion INTEGER;
  v_next       public.property_status_enum;
BEGIN
  SELECT status INTO v_current FROM public.properties WHERE id = p_property_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Property % not found', p_property_id;
  END IF;

  -- Occupied is a terminal state until relist_property() clears it.
  IF v_current = 'OCCUPIED' THEN
    RETURN 'OCCUPIED';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'PENDING'),
    COUNT(*) FILTER (WHERE status IN ('ACCEPTED','RESCHEDULED','DISCUSSION_ONGOING'))
  INTO v_pending, v_discussion
  FROM public.visit_requests
  WHERE property_id = p_property_id;

  IF v_discussion > 0 THEN
    v_next := 'UNDER_DISCUSSION';
  ELSIF v_pending >= 3 THEN
    v_next := 'HIGH_DEMAND';
  ELSE
    v_next := 'AVAILABLE';
  END IF;

  UPDATE public.properties SET status = v_next WHERE id = p_property_id;
  RETURN v_next;
END;
$$;

-- Internal guard: assert the caller owns the property behind a visit.
CREATE OR REPLACE FUNCTION public.assert_visit_landlord(p_visit_id UUID)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  SELECT * INTO v_visit FROM public.visit_requests WHERE id = p_visit_id;
  IF v_visit.id IS NULL THEN
    RAISE EXCEPTION 'Visit request % not found', p_visit_id;
  END IF;
  IF v_visit.landlord_id <> requesting_user_id() THEN
    RAISE EXCEPTION 'Not authorized to manage this visit request';
  END IF;
  RETURN v_visit;
END;
$$;

-- accept_visit_request ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_visit_request(p_visit_id UUID)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  UPDATE public.visit_requests
  SET status = 'ACCEPTED'
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

-- reject_visit_request ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_visit_request(
  p_visit_id UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  UPDATE public.visit_requests
  SET status = 'REJECTED', landlord_response_note = p_reason
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

-- reschedule_visit_request ───────────────────────────────────────────
-- Max 3 reschedules per request.
CREATE OR REPLACE FUNCTION public.reschedule_visit_request(
  p_visit_id UUID,
  p_new_date DATE,
  p_new_slot public.time_slot_enum,
  p_message  TEXT DEFAULT NULL
)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  IF v_visit.reschedule_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 reschedules reached for this request';
  END IF;

  UPDATE public.visit_requests
  SET status                 = 'RESCHEDULED',
      requested_date         = p_new_date,
      time_slot              = p_new_slot,
      reschedule_count       = reschedule_count + 1,
      landlord_response_note = p_message
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

-- finalize_rental ────────────────────────────────────────────────────
-- Marks this visit RENTAL_FINALIZED, closes every other open visit on
-- the property, and marks the property OCCUPIED with the linked tenant.
CREATE OR REPLACE FUNCTION public.finalize_rental(p_visit_id UUID)
RETURNS public.properties
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit    public.visit_requests;
  v_property public.properties;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  UPDATE public.visit_requests
  SET status = 'RENTAL_FINALIZED'
  WHERE id = p_visit_id;

  -- Close all other still-open visits on the same property.
  UPDATE public.visit_requests
  SET status = 'CLOSED'
  WHERE property_id = v_visit.property_id
    AND id <> p_visit_id
    AND status IN ('PENDING','ACCEPTED','RESCHEDULED','DISCUSSION_ONGOING','VISIT_COMPLETED');

  UPDATE public.properties
  SET status = 'OCCUPIED', linked_occupant_id = v_visit.tenant_id
  WHERE id = v_visit.property_id
  RETURNING * INTO v_property;

  RETURN v_property;
END;
$$;

-- relist_property ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.relist_property(p_property_id UUID)
RETURNS public.properties
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_property public.properties;
BEGIN
  SELECT * INTO v_property FROM public.properties WHERE id = p_property_id;
  IF v_property.id IS NULL THEN
    RAISE EXCEPTION 'Property % not found', p_property_id;
  END IF;
  IF v_property.landlord_id <> requesting_user_id() THEN
    RAISE EXCEPTION 'Not authorized to relist this property';
  END IF;

  UPDATE public.properties
  SET status = 'AVAILABLE', linked_occupant_id = NULL
  WHERE id = p_property_id;

  PERFORM public.recalculate_property_status(p_property_id);

  SELECT * INTO v_property FROM public.properties WHERE id = p_property_id;
  RETURN v_property;
END;
$$;


-- ════════════════════════════════════════════════════════════════════
-- 8. Storage bucket: property-photos (public, 8 MB, jpeg/png/webp)
--    Path: {clerk_id}/{property_id}/{index}.jpg
-- ════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('property-photos', 'property-photos', TRUE, 8388608,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "property_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "property_photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_photos_owner_delete" ON storage.objects;

CREATE POLICY "property_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

CREATE POLICY "property_photos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

CREATE POLICY "property_photos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );
