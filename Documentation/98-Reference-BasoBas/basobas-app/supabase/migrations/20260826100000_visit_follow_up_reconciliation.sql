-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: visit_follow_up_reconciliation
--
-- Redesigns the post-visit follow-up into an automatic, both-sides,
-- reconciled flow:
--
--   1. When an ACCEPTED visit's date+slot window passes (MORNING→12:00,
--      AFTERNOON→17:00, EVENING→21:00 Asia/Kathmandu), the visit flips
--      to VISIT_COMPLETED and BOTH parties get a FOLLOW_UP_REQUESTED
--      notification. No cron needed — the app calls
--      mark_past_visits_completed() on every app-open/focus.
--
--   2. Each party answers once via RPC (tenant: 4 fixed responses,
--      landlord: 4 outcomes). Answers persist — fixing the previous
--      local-only landlord follow-up.
--
--   3. Once BOTH have answered, reconcile_visit_follow_up() applies the
--      product decision matrix atomically (single transaction, row lock
--      kills simultaneous-submit races):
--
--        L=finalize                    → RENTAL_FINALIZED (+ closes
--                                        siblings, property OCCUPIED)
--        T=not_a_fit                   → CLOSED
--          OR L=did_not_visit                     (landlord wins conflicts)
--        T=missed_reschedule           → PENDING (new cycle) if
--          + L∈{visited,discussion}        reschedule_count < 3, else CLOSED
--        anything else                 → DISCUSSION_ONGOING
--
--      and writes FOLLOW_UP_RECONCILED notifications to both sides.
--
-- Product decisions locked 2026-08-25:
--   • Conflicting answers        → landlord wins
--   • Finalize alone             → landlord may finalize regardless
--                                  of the tenant's answer
--   • Unanswered follow-ups      → re-prompt forever, state never
--                                  auto-changes
--
-- New notification kinds: FOLLOW_UP_REQUESTED, FOLLOW_UP_RECONCILED.
--
-- Demo/testing: mark_past_visits_completed accepts p_force + p_visit_id
-- so a dev build can fast-forward one visit past its window without
-- waiting (gated client-side behind EXPO_PUBLIC_DEMO_MODE).
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. Notification kinds
-- ────────────────────────────────────────────────────────────────────

ALTER TYPE public.notification_kind_enum
  ADD VALUE IF NOT EXISTS 'FOLLOW_UP_REQUESTED';

ALTER TYPE public.notification_kind_enum
  ADD VALUE IF NOT EXISTS 'FOLLOW_UP_RECONCILED';


-- ────────────────────────────────────────────────────────────────────
-- 2. Follow-up persistence columns
--    (tenant_follow_up_response / _note existed since
--    20260731180000; this adds timestamps + the missing landlord half)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS landlord_follow_up_outcome TEXT
    CHECK (landlord_follow_up_outcome IN (
      'tenant_visited', 'tenant_did_not_visit',
      'discussion_ongoing', 'finalize_rental'
    )),
  ADD COLUMN IF NOT EXISTS landlord_follow_up_note TEXT,
  ADD COLUMN IF NOT EXISTS tenant_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS landlord_follow_up_at TIMESTAMPTZ;

COMMENT ON COLUMN public.visit_requests.landlord_follow_up_outcome IS
  'Landlord post-visit answer: tenant_visited | tenant_did_not_visit | discussion_ongoing | finalize_rental. Written only via submit_landlord_follow_up().';

COMMENT ON COLUMN public.visit_requests.tenant_follow_up_at IS
  'When the tenant submitted their follow-up answer.';
COMMENT ON COLUMN public.visit_requests.landlord_follow_up_at IS
  'When the landlord submitted their follow-up outcome.';


-- ────────────────────────────────────────────────────────────────────
-- 3. Window helper — has the visit's predefined time passed?
--    Slot end hours in Asia/Kathmandu local time.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.visit_window_passed(
  p_requested_date DATE,
  p_time_slot      public.time_slot_enum
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_end_hour INTEGER;
  v_now_ktm  TIMESTAMP;
BEGIN
  v_end_hour := CASE p_time_slot
    WHEN 'MORNING'   THEN 12
    WHEN 'AFTERNOON' THEN 17
    WHEN 'EVENING'   THEN 21
    ELSE 23
  END;

  v_now_ktm := NOW() AT TIME ZONE 'Asia/Kathmandu';

  RETURN v_now_ktm >= (p_requested_date + make_interval(hours => v_end_hour));
END;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 4. Follow-up request notification writer (internal helper)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_follow_up_requested(v_visit public.visit_requests)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT COALESCE(title, 'the property') INTO v_title
    FROM public.properties WHERE id = v_visit.property_id;

  INSERT INTO public.notifications
    (recipient_id, actor_id, kind, title, body, target_kind, target_id, related_visit_id, related_property_id)
  VALUES
    -- Tenant nudge
    (v_visit.tenant_id, NULL, 'FOLLOW_UP_REQUESTED',
     'How was your visit?',
     format('Your visit to %s on %s is complete — let us and the landlord know how it went.',
            v_title, to_char(v_visit.requested_date, 'DD Mon YYYY')),
     'visit', v_visit.id::TEXT, v_visit.id, v_visit.property_id),
    -- Landlord nudge
    (v_visit.landlord_id, NULL, 'FOLLOW_UP_REQUESTED',
     'Visit feedback pending',
     format('The visit to %s on %s has ended. Mark whether the tenant showed up to keep your listing accurate.',
            v_title, to_char(v_visit.requested_date, 'DD Mon YYYY')),
     'visit', v_visit.id::TEXT, v_visit.id, v_visit.property_id);
END;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 5. mark_past_visits_completed
--    Called by the app on open/focus. Flips every ACCEPTED visit owned
--    by the caller whose window passed to VISIT_COMPLETED, stamps
--    completed_at, nudges both parties.
--
--    Demo override: pass p_visit_id + p_force=true to fast-forward one
--    visit regardless of its window (dev builds only).
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_past_visits_completed(
  p_visit_id UUID DEFAULT NULL,
  p_force    BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller  TEXT := requesting_user_id();
  v_flipped INTEGER := 0;
  v_row     public.visit_requests;
  v_scope   UUID := p_visit_id;
BEGIN
  -- When targeting ONE visit explicitly, verify the caller is a party
  -- to it (prevents forcing arbitrary other users' visits).
  IF v_scope IS NOT NULL THEN
    SELECT id INTO v_scope
      FROM public.visit_requests
      WHERE id = v_scope
        AND (tenant_id = v_caller OR landlord_id = v_caller);
    IF v_scope IS NULL THEN
      RAISE EXCEPTION 'Not authorized for this visit';
    END IF;
  END IF;

  FOR v_row IN
    UPDATE public.visit_requests
      SET status = 'VISIT_COMPLETED',
          completed_at = NOW()
      WHERE status = 'ACCEPTED'
        AND (v_scope IS NULL OR id = v_scope)
        AND (tenant_id = v_caller OR landlord_id = v_caller)
        AND (p_force OR public.visit_window_passed(requested_date, time_slot))
      RETURNING *
  LOOP
    PERFORM public.notify_follow_up_requested(v_row);
    v_flipped := v_flipped + 1;
  END LOOP;

  RETURN v_flipped;
END;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 6. reconcile_visit_follow_up (INTERNAL)
--    Applies the decision matrix once both sides answered. Runs inside
--    the submitting RPC's transaction. Never called directly by clients
--    (EXECUTE revoked below).
--
--    Precedence (locked product rules):
--      1. L=finalize_rental            → RENTAL_FINALIZED (+ siblings
--                                       closed, property OCCUPIED)
--      2. T=not_a_fit OR L=did_not_visit → CLOSED (landlord wins ties)
--      3. T=missed_reschedule          → PENDING if reschedule_count<3
--                                        else CLOSED
--      4. otherwise                    → DISCUSSION_ONGOING
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reconcile_visit_follow_up(p_visit_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit     public.visit_requests;
  v_t         TEXT;
  v_l         TEXT;
  v_new_status public.visit_status_enum;
  v_property  public.properties;
  v_t_body    TEXT;
  v_l_body    TEXT;
BEGIN
  SELECT * INTO v_visit FROM public.visit_requests WHERE id = p_visit_id;
  IF v_visit.id IS NULL THEN RETURN; END IF;

  -- Only reconcile completed visits awaiting both answers.
  IF v_visit.status <> 'VISIT_COMPLETED' THEN RETURN; END IF;

  v_t := v_visit.tenant_follow_up_response;
  v_l := v_visit.landlord_follow_up_outcome;

  -- Wait for both sides.
  IF v_t IS NULL OR v_l IS NULL THEN RETURN; END IF;

  IF v_l = 'finalize_rental' THEN
    -- Landlord decides alone — mirror finalize_rental() core here so the
    -- tenant's final submit can also drive the finalize path safely.
    v_new_status := 'RENTAL_FINALIZED';

  ELSIF v_t = 'not_a_fit' OR v_l = 'tenant_did_not_visit' THEN
    v_new_status := 'CLOSED';

  ELSIF v_t = 'missed_visit_reschedule' THEN
    IF v_visit.reschedule_count < 3 THEN
      v_new_status := 'PENDING';
    ELSE
      v_new_status := 'CLOSED';
    END IF;

  ELSE
    v_new_status := 'DISCUSSION_ONGOING';
  END IF;

  UPDATE public.visit_requests
    SET status = v_new_status
    WHERE id = p_visit_id;

  IF v_new_status = 'RENTAL_FINALIZED' THEN
    UPDATE public.visit_requests
      SET status = 'CLOSED'
      WHERE property_id = v_visit.property_id
        AND id <> p_visit_id
        AND status IN ('PENDING','ACCEPTED','RESCHEDULED',
                       'DISCUSSION_ONGOING','VISIT_COMPLETED');

    UPDATE public.properties
      SET status = 'OCCUPIED',
          linked_occupant_id = v_visit.tenant_id
      WHERE id = v_visit.property_id
      RETURNING * INTO v_property;

    PERFORM public.recalculate_property_status(v_visit.property_id);
  END IF;

  -- ── Notify both parties of the outcome ─────────────────────────────
  v_t_body := CASE v_new_status
    WHEN 'RENTAL_FINALIZED' THEN
      'Congratulations — the rental was finalized. The landlord confirmed the deal.'
    WHEN 'CLOSED' THEN
      CASE
        WHEN v_l = 'tenant_did_not_visit' THEN
          'This visit was closed because the landlord marked you as not showing up.'
        ELSE 'You marked this property as not the right fit — the visit request is closed.'
      END
    WHEN 'PENDING' THEN
      CASE
        WHEN v_visit.reschedule_count < 3 THEN
          'Reschedule reopened — pick a new time with the landlord whenever you''re ready.'
        ELSE 'Too many reschedules — this visit request is closed.'
      END
    ELSE
      'Both sides responded — your discussion is ongoing. Coordinate the next steps directly.'
  END;

  v_l_body := CASE v_new_status
    WHEN 'RENTAL_FINALIZED' THEN
      'Rental finalized. Other open requests on this listing were closed automatically.'
    WHEN 'CLOSED' THEN
      CASE
        WHEN v_t = 'not_a_fit' THEN
          'The tenant declined after the visit — this request is closed.'
        ELSE 'This visit was closed.'
      END
    WHEN 'PENDING' THEN
      'The tenant asked to reschedule — a new time proposal is awaited.'
    ELSE
      'Both sides responded — discussion is ongoing with this tenant.'
  END;

  INSERT INTO public.notifications
    (recipient_id, actor_id, kind, title, body, target_kind, target_id, related_visit_id, related_property_id)
  VALUES
    (v_visit.tenant_id,   NULL, 'FOLLOW_UP_RECONCILED',
     'Visit update', v_t_body, 'visit', p_visit_id::TEXT, p_visit_id, v_visit.property_id),
    (v_visit.landlord_id, NULL, 'FOLLOW_UP_RECONCILED',
     'Visit update', v_l_body, 'visit', p_visit_id::TEXT, p_visit_id, v_visit.property_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_visit_follow_up(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_visit_follow_up(UUID) FROM authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 7. submit_tenant_follow_up
--    Replaces the old direct-table update. Validates the answer,
--    requires the visit to be past its window, blocks double submits,
--    then reconciles atomically.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_tenant_follow_up(
  p_visit_id UUID,
  p_response TEXT,
  p_note     TEXT DEFAULT NULL
)
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
  IF v_visit.tenant_id <> requesting_user_id() THEN
    RAISE EXCEPTION 'Not authorized for this visit request';
  END IF;

  IF p_response NOT IN ('interested','need_more_time','not_a_fit','missed_visit_reschedule') THEN
    RAISE EXCEPTION 'Invalid follow-up response';
  END IF;

  IF v_visit.tenant_follow_up_response IS NOT NULL THEN
    RAISE EXCEPTION 'Follow-up already submitted';
  END IF;

  -- Accept answers for completed visits, or accepted visits whose
  -- window has passed (client may not have run the mark step yet).
  IF v_visit.status <> 'VISIT_COMPLETED'
     AND NOT (v_visit.status = 'ACCEPTED'
              AND public.visit_window_passed(v_visit.requested_date, v_visit.time_slot)) THEN
    RAISE EXCEPTION 'This visit is not open for follow-up yet';
  END IF;

  UPDATE public.visit_requests
    SET tenant_follow_up_response = p_response,
        tenant_follow_up_note     = p_note,
        tenant_follow_up_at       = NOW(),
        -- Persist the lazy completion so the row reflects reality.
        status = CASE WHEN status = 'ACCEPTED' THEN 'VISIT_COMPLETED' ELSE status END
    WHERE id = p_visit_id
    RETURNING * INTO v_visit;

  PERFORM public.reconcile_visit_follow_up(p_visit_id);

  RETURN v_visit;
END;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 8. submit_landlord_follow_up
--    The missing landlord half — previously a local-only store
--    transition that never reached the database.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_landlord_follow_up(
  p_visit_id UUID,
  p_outcome  TEXT,
  p_note     TEXT DEFAULT NULL
)
RETURNS public.visit_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_visit public.visit_requests;
BEGIN
  v_visit := public.assert_visit_landlord(p_visit_id);

  IF p_outcome NOT IN ('tenant_visited','tenant_did_not_visit',
                       'discussion_ongoing','finalize_rental') THEN
    RAISE EXCEPTION 'Invalid follow-up outcome';
  END IF;

  IF v_visit.landlord_follow_up_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Follow-up already submitted';
  END IF;

  IF v_visit.status <> 'VISIT_COMPLETED'
     AND NOT (v_visit.status = 'ACCEPTED'
              AND public.visit_window_passed(v_visit.requested_date, v_visit.time_slot)) THEN
    RAISE EXCEPTION 'This visit is not open for follow-up yet';
  END IF;

  UPDATE public.visit_requests
    SET landlord_follow_up_outcome = p_outcome,
        landlord_follow_up_note    = p_note,
        landlord_follow_up_at      = NOW(),
        status = CASE WHEN status = 'ACCEPTED' THEN 'VISIT_COMPLETED' ELSE status END
    WHERE id = p_visit_id
    RETURNING * INTO v_visit;

  PERFORM public.reconcile_visit_follow_up(p_visit_id);

  RETURN v_visit;
END;
$$;


GRANT EXECUTE ON FUNCTION public.mark_past_visits_completed(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tenant_follow_up(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_landlord_follow_up(UUID, TEXT, TEXT) TO authenticated;
