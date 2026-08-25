-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: notifications
-- In-app notifications fired by visit-lifecycle transitions on
-- `visit_requests`. The inbox is addressable by deep-link via
-- (target_kind, target_id); realtime channels per recipient keep the
-- bell badge live without polling.
--
-- Auth: same Clerk JWT model as the rest of the app. RLS scopes all
-- reads/writes to `recipient_id = requesting_user_id()`; mutations
-- happen exclusively through SECURITY DEFINER triggers (no direct
-- INSERT policy) and SECURITY DEFINER RPCs (`mark_notification_read`,
-- `mark_all_notifications_read`).
--
-- Notification kinds produced by this migration:
--   INSERT on visit_requests                → VISIT_REQUESTED         (→ landlord)
--   PENDING        → ACCEPTED               → VISIT_ACCEPTED          (→ tenant)
--   PENDING        → RESCHEDULED            → VISIT_RESCHEDULED       (→ tenant)
--   PENDING        → REJECTED               → VISIT_REJECTED          (→ tenant)
--   RESCHEDULED    → ACCEPTED               → RESCHEDULE_ACCEPTED     (→ landlord)
--   → CANCELLED_BY_TENANT                   → VISIT_CANCELLED_BY_TENANT (→ landlord)
--   → RENTAL_FINALIZED                      → LISTING_FINALIZED       (→ tenant)
--   → CLOSED   (finalize_rental losers)     → LISTING_CLOSED          (→ tenant)
--
-- The "other party, never actor" rule is enforced by branching on the
-- (OLD.status, NEW.status) tuple: the actor is always the request's
-- `tenant_id` for tenant-initiated transitions and `landlord_id` for
-- landlord-initiated ones, and the recipient is the *other* side.
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. Enum
--    Wrapped in the codebase's standard `DO $$ ... EXCEPTION WHEN
--    duplicate_object` guard — CREATE TYPE has no IF NOT EXISTS.
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.notification_kind_enum AS ENUM (
    'VISIT_REQUESTED',
    'VISIT_ACCEPTED',
    'VISIT_RESCHEDULED',
    'VISIT_REJECTED',
    'VISIT_CANCELLED_BY_TENANT',
    'RESCHEDULE_ACCEPTED',
    'LISTING_FINALIZED',
    'LISTING_CLOSED',
    'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────────
-- 2. notifications table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id         TEXT        NOT NULL
                         REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
  -- Actor is nullable so SYSTEM notifications (future announcements) can
  -- exist without a "who did this" user. SET NULL on actor delete keeps
  -- the inbox entry even if the actor's profile is later removed.
  actor_id             TEXT        REFERENCES public.profiles(clerk_id) ON DELETE SET NULL,
  kind                 public.notification_kind_enum NOT NULL,
  title                TEXT        NOT NULL,
  body                 TEXT        NOT NULL,
  -- Deep-link contract: client resolveRoute() switches on this.
  target_kind          TEXT        NOT NULL
                         CHECK (target_kind IN ('visit','property','request','system')),
  -- UUIDs stored as text so the column can hold either kind. When
  -- target_kind = 'system' this is NULL.
  target_id            TEXT,
  -- Join surface for "show me the underlying visit/property" from the
  -- notification row. Optional — system notifications set both NULL.
  related_visit_id     UUID        REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  related_property_id  UUID        REFERENCES public.properties(id)    ON DELETE CASCADE,
  read_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drives the inbox feed (newest first).
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_id, created_at DESC);

-- Partial index for the unread badge count — tiny, fast.
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (recipient_id)
  WHERE read_at IS NULL;

-- Partial index for "show all notifications for this visit" debugging.
CREATE INDEX IF NOT EXISTS idx_notifications_visit
  ON public.notifications (related_visit_id)
  WHERE related_visit_id IS NOT NULL;

-- updated_at isn't tracked — notifications are immutable from the
-- client; the only mutation is read_at, which we set inside the RPC.


-- ────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_read"   ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

-- Recipient can read their own inbox.
CREATE POLICY "notifications_read"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = requesting_user_id());

-- Recipient can mark their own notifications read. The column-level
-- GRANT below restricts WHICH columns can be updated.
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = requesting_user_id())
  WITH CHECK (recipient_id = requesting_user_id());

-- No INSERT policy: writes only come from SECURITY DEFINER triggers,
-- which bypass RLS by design. An authenticated client attempting to
-- INSERT is rejected by RLS default-deny.
-- No DELETE policy: v1 is append-only for audit trail.

-- Restrict the UPDATE grant to the read_at column so even a successful
-- policy match can't touch recipient_id, kind, body, etc.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT  UPDATE (read_at) ON public.notifications TO authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 4. Trigger — INSERT on visit_requests
--    VISIT_REQUESTED → landlord.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_visit_requested()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_name TEXT;
  v_prop_title  TEXT;
  v_prop_area   TEXT;
BEGIN
  -- The tenant's display name and the property's title + area are
  -- interpolated into the notification body. Missing rows are tolerated
  -- (a tenant might not have a profile row yet during onboarding).
  SELECT full_name INTO v_tenant_name
    FROM public.profiles WHERE clerk_id = NEW.tenant_id;
  SELECT title, location_area INTO v_prop_title, v_prop_area
    FROM public.properties WHERE id = NEW.property_id;

  INSERT INTO public.notifications (
    recipient_id, actor_id, kind, title, body,
    target_kind, target_id, related_visit_id, related_property_id
  ) VALUES (
    NEW.landlord_id,
    NEW.tenant_id,
    'VISIT_REQUESTED',
    COALESCE(v_tenant_name, 'A tenant') || ' requested a visit',
    COALESCE('For ' || v_prop_title, 'For your listing') ||
      CASE WHEN v_prop_area IS NOT NULL THEN ' in ' || v_prop_area ELSE '' END || '.',
    'visit',
    NEW.id::TEXT,
    NEW.id,
    NEW.property_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_insert_notify ON public.visit_requests;
CREATE TRIGGER trg_visit_insert_notify
  AFTER INSERT ON public.visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_visit_requested();


-- ────────────────────────────────────────────────────────────────────
-- 5. Trigger — UPDATE OF status on visit_requests
--    Branches on (OLD.status, NEW.status). The WHEN clause guards
--    against no-op UPDATEs (a body-level guard is redundant but kept
--    for safety if the function is ever called from another context).
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_visit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor_id     TEXT;
  v_recipient_id TEXT;
  v_kind         public.notification_kind_enum;
  v_title        TEXT;
  v_body         TEXT;
  v_prop_title   TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_prop_title
    FROM public.properties WHERE id = NEW.property_id;

  -- Default to "other party" mapping. The tenant is the request's
  -- creator; the landlord is the recipient for tenant-initiated moves
  -- and vice versa. RESCHEDULED → ACCEPTED is tenant-initiated, so
  -- the recipient is the landlord.
  v_actor_id     := NEW.tenant_id;
  v_recipient_id := NEW.landlord_id;

  CASE
    WHEN NEW.status = 'ACCEPTED' AND OLD.status = 'PENDING' THEN
      v_actor_id     := NEW.landlord_id;
      v_recipient_id := NEW.tenant_id;
      v_kind         := 'VISIT_ACCEPTED';
      v_title        := 'Your visit was accepted';
      v_body         := COALESCE('Visit to ' || v_prop_title, 'Your visit') || ' is confirmed.';

    WHEN NEW.status = 'RESCHEDULED' AND OLD.status = 'PENDING' THEN
      v_actor_id     := NEW.landlord_id;
      v_recipient_id := NEW.tenant_id;
      v_kind         := 'VISIT_RESCHEDULED';
      v_title        := 'A new time was proposed';
      v_body         := COALESCE(NEW.landlord_response_note,
                                 'The landlord proposed a new time for ' ||
                                 COALESCE(v_prop_title, 'your visit') || '.');

    WHEN NEW.status = 'REJECTED' THEN
      v_actor_id     := NEW.landlord_id;
      v_recipient_id := NEW.tenant_id;
      v_kind         := 'VISIT_REJECTED';
      v_title        := 'Your visit was declined';
      v_body         := COALESCE(NEW.landlord_response_note,
                                 COALESCE('The landlord declined the visit to ' || v_prop_title || '.',
                                          'The landlord declined your visit.'));

    WHEN NEW.status = 'ACCEPTED' AND OLD.status = 'RESCHEDULED' THEN
      -- Tenant accepted the landlord's reschedule. Actor is the tenant,
      -- recipient is the landlord.
      v_actor_id     := NEW.tenant_id;
      v_recipient_id := NEW.landlord_id;
      v_kind         := 'RESCHEDULE_ACCEPTED';
      v_title        := 'Tenant accepted the new time';
      v_body         := COALESCE('Tenant accepted the new time for ' || v_prop_title || '.',
                                 'Tenant accepted the new time.');

    WHEN NEW.status = 'CANCELLED_BY_TENANT' THEN
      v_actor_id     := NEW.tenant_id;
      v_recipient_id := NEW.landlord_id;
      v_kind         := 'VISIT_CANCELLED_BY_TENANT';
      v_title        := 'Tenant cancelled their visit';
      v_body         := COALESCE('A tenant cancelled their visit to ' || v_prop_title || '.',
                                 'A tenant cancelled their visit.');

    WHEN NEW.status = 'RENTAL_FINALIZED' THEN
      v_actor_id     := NEW.landlord_id;
      v_recipient_id := NEW.tenant_id;
      v_kind         := 'LISTING_FINALIZED';
      v_title        := 'Rental finalized';
      v_body         := COALESCE('Your rental for ' || v_prop_title || ' is confirmed.',
                                 'Your rental is confirmed.');

    WHEN NEW.status = 'CLOSED' THEN
      -- finalize_rental sets every other open visit on the property to
      -- CLOSED — those tenants are the losers and need to know.
      v_actor_id     := NEW.landlord_id;
      v_recipient_id := NEW.tenant_id;
      v_kind         := 'LISTING_CLOSED';
      v_title        := 'Listing rented to someone else';
      v_body         := COALESCE(v_prop_title || ' was rented to another tenant.',
                                 'The listing was rented to another tenant.');

    ELSE
      -- An uninteresting transition (e.g. DISCUSSION_ONGOING, scheduled
      -- housekeeping). Skip silently.
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (
    recipient_id, actor_id, kind, title, body,
    target_kind, target_id, related_visit_id, related_property_id
  ) VALUES (
    v_recipient_id,
    v_actor_id,
    v_kind,
    v_title,
    v_body,
    'visit',
    NEW.id::TEXT,
    NEW.id,
    NEW.property_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_status_notify ON public.visit_requests;
CREATE TRIGGER trg_visit_status_notify
  AFTER UPDATE OF status ON public.visit_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_visit_status_change();


-- ────────────────────────────────────────────────────────────────────
-- 6. RPCs — mark read
--    SECURITY DEFINER so the call site can use the same supabase.rpc
--    idiom as the rest of the app. The recipient guard is enforced
--    inside the function body so even a successful caller can't mark
--    someone else's notification read.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
     SET read_at = NOW()
   WHERE id = p_notification_id
     AND recipient_id = requesting_user_id()
     AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
     SET read_at = NOW()
   WHERE recipient_id = requesting_user_id()
     AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 7. Realtime
--    REPLICA IDENTITY FULL so UPDATE payloads carry the full row (the
--    client merges by id and needs the new read_at on UPDATE).
--    Add to the supabase_realtime publication using the same guarded
--    pattern as 20260731180000_tenant_visit_workflow.sql.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
