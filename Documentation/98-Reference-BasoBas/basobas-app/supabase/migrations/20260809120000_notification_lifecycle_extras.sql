-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: notification_lifecycle_extras
-- Fills the two gaps in the visit-lifecycle notification matrix:
--
--   1. Tenant-initiated reschedule   → VISIT_RESCHEDULED_BY_TENANT (→ landlord)
--      `tenantRescheduleVisit` only flips requested_date / time_slot —
--      the status never changes, so the UPDATE-OF-status trigger in
--      20260805120000_notifications.sql never fires. The tenant-facing
--      reschedule screen promises the landlord "will be notified to
--      confirm" — this trigger makes that true.
--
--   2. Post-visit follow-up answer   → TENANT_FOLLOW_UP_SUBMITTED (→ landlord)
--      `submitFollowUp` writes tenant_follow_up_response; the follow-up
--      screen tells the tenant "the landlord has been notified". This
--      trigger makes that true.
--
-- Both are tenant-initiated writes through the `visits_update_tenant`
-- RLS policy (no RPC), so the actor is always NEW.tenant_id and the
-- recipient always NEW.landlord_id. SECURITY DEFINER mirrors the
-- existing notification triggers (writes bypass RLS by design; the
-- table has no direct INSERT policy).
--
-- New kinds (added to notification_kind_enum):
--   VISIT_RESCHEDULED_BY_TENANT   landlord-received
--   TENANT_FOLLOW_UP_SUBMITTED    landlord-received
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. Extend the enum (PG 12+ allows ADD VALUE inside a transaction;
--    IF NOT EXISTS keeps re-runs idempotent. Function bodies that
--    reference the new values are parsed lazily, so defining the
--    triggers below in the same migration is safe.)
-- ────────────────────────────────────────────────────────────────────

ALTER TYPE public.notification_kind_enum
  ADD VALUE IF NOT EXISTS 'VISIT_RESCHEDULED_BY_TENANT';

ALTER TYPE public.notification_kind_enum
  ADD VALUE IF NOT EXISTS 'TENANT_FOLLOW_UP_SUBMITTED';


-- The tenant reschedule screen collects an optional note for the landlord;
-- before this migration the input was silently dropped. Stored here so the
-- landlord can read it on the request detail (and it rides along in the
-- VISIT_RESCHEDULED_BY_TENANT notification body).
ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS tenant_reschedule_note TEXT;


-- ────────────────────────────────────────────────────────────────────
-- 1b. Harden the tenant RLS policies.
--     The notification triggers derive the recipient from the row's
--     landlord_id, but `visits_update_tenant` / `visits_insert_tenant`
--     only pinned tenant_id — a tenant could UPDATE their own request's
--     landlord_id (or INSERT with a bogus one) and redirect/spam
--     notifications at an arbitrary user. Pin landlord_id to the
--     property's owner so the recipient is always the real landlord.
-- ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "visits_insert_tenant" ON public.visit_requests;
CREATE POLICY "visits_insert_tenant"
  ON public.visit_requests FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = requesting_user_id()
    -- Strict on INSERT: booking a visit against an invisible (draft/deleted)
    -- property must fail, and the landlord must resolve to the property owner.
    AND landlord_id = (SELECT landlord_id FROM public.properties WHERE id = property_id)
  );

DROP POLICY IF EXISTS "visits_update_tenant" ON public.visit_requests;
CREATE POLICY "visits_update_tenant"
  ON public.visit_requests FOR UPDATE TO authenticated
  USING (tenant_id = requesting_user_id())
  WITH CHECK (
    tenant_id = requesting_user_id()
    -- COALESCE: when the property is not resolvable (soft-deleted / draft
    -- and therefore invisible to the tenant's SELECT policy), the subquery
    -- is NULL and `landlord_id = NULL` would be UNKNOWN — silently breaking
    -- every legitimate tenant UPDATE (cancel / accept|decline / follow-up)
    -- on that visit. Fall back to the row's existing landlord_id in that
    -- edge case; the pin still applies whenever the property resolves.
    AND landlord_id = COALESCE(
      (SELECT landlord_id FROM public.properties WHERE id = property_id),
      landlord_id
    )
  );


-- ────────────────────────────────────────────────────────────────────
-- 2. Trigger — tenant changes the date/time of their own request
--    Fires only when requested_date or time_slot actually changed AND
--    the status did NOT (a landlord reschedule flips status to
--    RESCHEDULED, which the existing status trigger already handles —
--    the OLD.status IS NOT DISTINCT FROM NEW.status guard keeps this
--    trigger strictly tenant-initiated and avoids double-firing).
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_visit_tenant_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prop_title TEXT;
  v_new_date   TEXT;
  v_slot       TEXT;
  v_body       TEXT;
BEGIN
  SELECT title INTO v_prop_title
    FROM public.properties WHERE id = NEW.property_id;

  v_new_date := TO_CHAR(NEW.requested_date, 'Mon DD, YYYY');
  v_slot := CASE NEW.time_slot
    WHEN 'MORNING'   THEN '9:00 AM – 12:00 PM'
    WHEN 'AFTERNOON' THEN '12:00 PM – 4:00 PM'
    WHEN 'EVENING'   THEN '4:00 PM – 7:00 PM'
    ELSE NEW.time_slot::TEXT
  END;

  v_body := 'The tenant proposed ' || v_new_date || ' (' || v_slot || ')';
  IF v_prop_title IS NOT NULL THEN
    v_body := v_body || ' for ' || v_prop_title;
  END IF;
  v_body := v_body || '.';
  IF NEW.tenant_reschedule_note IS NOT NULL AND NEW.tenant_reschedule_note <> '' THEN
    v_body := v_body || ' Note: ' || NEW.tenant_reschedule_note;
  END IF;

  INSERT INTO public.notifications (
    recipient_id, actor_id, kind, title, body,
    target_kind, target_id, related_visit_id, related_property_id
  ) VALUES (
    NEW.landlord_id,
    NEW.tenant_id,
    'VISIT_RESCHEDULED_BY_TENANT',
    'Tenant proposed a new time',
    v_body,
    'visit',
    NEW.id::TEXT,
    NEW.id,
    NEW.property_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_tenant_reschedule_notify ON public.visit_requests;
CREATE TRIGGER trg_visit_tenant_reschedule_notify
  AFTER UPDATE OF requested_date, time_slot, tenant_reschedule_note ON public.visit_requests
  FOR EACH ROW
  WHEN (
    OLD.status IS NOT DISTINCT FROM NEW.status
    -- Fire only when the proposal actually changed — a note-only edit on a
    -- settled date/slot shouldn't re-notify the landlord.
    AND (OLD.requested_date IS DISTINCT FROM NEW.requested_date
      OR OLD.time_slot IS DISTINCT FROM NEW.time_slot)
  )
  EXECUTE FUNCTION public.notify_visit_tenant_reschedule();


-- ────────────────────────────────────────────────────────────────────
-- 3. Trigger — tenant submits a post-visit follow-up answer
--    Fires only when the response column changes to a non-null value.
--    The follow-up note is included in the body when present.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_visit_follow_up()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prop_title TEXT;
  v_feedback   TEXT;
BEGIN
  SELECT title INTO v_prop_title
    FROM public.properties WHERE id = NEW.property_id;

  v_feedback := CASE NEW.tenant_follow_up_response
    WHEN 'interested'            THEN 'said they would like to move forward'
    WHEN 'need_more_time'        THEN 'needs more time to decide'
    WHEN 'not_a_fit'             THEN 'said the property is not the right fit'
    WHEN 'missed_visit_reschedule' THEN 'missed the visit and would like to reschedule'
    ELSE 'shared post-visit feedback'
  END;

  INSERT INTO public.notifications (
    recipient_id, actor_id, kind, title, body,
    target_kind, target_id, related_visit_id, related_property_id
  ) VALUES (
    NEW.landlord_id,
    NEW.tenant_id,
    'TENANT_FOLLOW_UP_SUBMITTED',
    'Tenant shared feedback',
    COALESCE('After visiting ' || v_prop_title || ', the tenant ' || v_feedback || '.',
             'After their visit, the tenant ' || v_feedback || '.'),
    'visit',
    NEW.id::TEXT,
    NEW.id,
    NEW.property_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_follow_up_notify ON public.visit_requests;
CREATE TRIGGER trg_visit_follow_up_notify
  AFTER UPDATE OF tenant_follow_up_response ON public.visit_requests
  FOR EACH ROW
  WHEN (
    OLD.tenant_follow_up_response IS DISTINCT FROM NEW.tenant_follow_up_response
    AND NEW.tenant_follow_up_response IS NOT NULL
  )
  EXECUTE FUNCTION public.notify_visit_follow_up();
