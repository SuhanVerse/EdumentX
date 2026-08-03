-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: tenant_visit_workflow
-- Tenant-facing visit lifecycle on top of the shared visit_requests
-- table (created in 20260729120000_landlord_properties_and_visits.sql):
--
--   • New status CANCELLED_BY_TENANT (tenant-initiated cancel/decline)
--   • Reschedule snapshot columns (previous_requested_date /
--     previous_time_slot) so the tenant detail screen can render the
--     landlord's proposed time with the old time struck through
--   • Post-visit follow-up columns (tenant_follow_up_response /
--     tenant_follow_up_note)
--   • responded_at / completed_at timestamps
--   • Landlord RPCs now stamp responded_at; reschedule_visit_request
--     additionally snapshots the pre-reschedule date/slot
--   • Realtime: REPLICA IDENTITY FULL + supabase_realtime publication
--     so tenant screens receive postgres_changes with full row data.
--     Channel auth uses the Clerk-issued JWT via realtime.setAuth() —
--     RLS (requesting_user_id()) applies to realtime the same way.
--
-- Tenant-side mutations (cancel / accept|decline reschedule / follow-up)
-- go through the direct UPDATE policy `visits_update_tenant` — the same
-- mechanism tenantRescheduleVisit already uses. No new RPCs.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. New status: CANCELLED_BY_TENANT
--    (REJECTED = landlord-initiated; CLOSED = property closed by
--    finalize_rental; this one is strictly tenant-initiated.)
-- ────────────────────────────────────────────────────────────────────

ALTER TYPE public.visit_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED_BY_TENANT';


-- ────────────────────────────────────────────────────────────────────
-- 2. Tenant-facing columns
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS previous_requested_date DATE,
  ADD COLUMN IF NOT EXISTS previous_time_slot     public.time_slot_enum,
  ADD COLUMN IF NOT EXISTS tenant_follow_up_response TEXT,
  ADD COLUMN IF NOT EXISTS tenant_follow_up_note  TEXT,
  ADD COLUMN IF NOT EXISTS responded_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at           TIMESTAMPTZ;

COMMENT ON COLUMN public.visit_requests.previous_requested_date IS
  'Date of the visit immediately before the latest landlord reschedule. NULL unless status = RESCHEDULED.';
COMMENT ON COLUMN public.visit_requests.previous_time_slot IS
  'Time slot of the visit immediately before the latest landlord reschedule. NULL unless status = RESCHEDULED.';
COMMENT ON COLUMN public.visit_requests.tenant_follow_up_response IS
  'Post-visit follow-up answer, one of: interested | need_more_time | not_a_fit | missed_visit_reschedule.';
COMMENT ON COLUMN public.visit_requests.tenant_follow_up_note IS
  'Optional free-text note accompanying tenant_follow_up_response.';
COMMENT ON COLUMN public.visit_requests.responded_at IS
  'When the landlord accepted / rejected / rescheduled. NULL until then.';
COMMENT ON COLUMN public.visit_requests.completed_at IS
  'When the visit auto-transitioned to VISIT_COMPLETED. Nullable — the app lazily derives completion on read when no scheduled job exists.';

-- ────────────────────────────────────────────────────────────────────
-- 3. Landlord RPC updates (additive — behavior of existing callers
--    unchanged; accept/reject/reschedule now stamp responded_at and
--    reschedule snapshots the previous date/slot)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_visit_request(p_visit_id UUID)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  UPDATE public.visit_requests
  SET status = 'ACCEPTED', responded_at = NOW()
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

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
  SET status = 'REJECTED', landlord_response_note = p_reason, responded_at = NOW()
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

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

  -- RHS column references read the OLD row values, so this snapshots the
  -- pre-reschedule date/slot into previous_* while updating requested_*.
  UPDATE public.visit_requests
  SET status                 = 'RESCHEDULED',
      requested_date         = p_new_date,
      time_slot              = p_new_slot,
      previous_requested_date = requested_date,
      previous_time_slot     = time_slot,
      reschedule_count       = reschedule_count + 1,
      landlord_response_note = p_message,
      responded_at           = NOW()
  WHERE id = p_visit_id
  RETURNING * INTO v_visit;

  PERFORM public.recalculate_property_status(v_visit.property_id);
  RETURN v_visit;
END;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 4. Realtime
--    REPLICA IDENTITY FULL so UPDATE payloads carry every column (old
--    + new diffing on the client needs full row data, and the tenant
--    channel only receives its own rows via the tenant_id filter).
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.visit_requests REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'visit_requests'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_requests';
  END IF;
END $$;
