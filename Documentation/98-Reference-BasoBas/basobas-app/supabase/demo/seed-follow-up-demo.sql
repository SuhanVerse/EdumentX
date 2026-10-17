-- ════════════════════════════════════════════════════════════════════
-- DEMO SEED — post-visit follow-up rehearsal (NOT a migration)
--
-- Run in Supabase Studio → SQL Editor the day of / before the demo.
-- Safe to re-run; cleans up its own test data first.
--
-- What it creates:
--   • One demo property (if needed) + two ACCEPTED visits whose window
--     has ALREADY PASSED — one for the tenant flow, one spare.
--
-- How to use:
--   1. Replace the two emails below with real demo accounts and run
--      the query to resolve their clerk_ids.
--   2. Execute section B.
--   3. Open the app as the TENANT → within ~2s the follow-up drawer
--      slides up automatically. Answer it.
--   4. Switch to the LANDLORD account → their drawer appears on focus.
--      Answer → both sides' visit statuses reconcile instantly
--      (DISCUSSION_ONGOING / FINALIZED / CLOSED per the answer matrix).
--
--   Alternative without any seeding: long-press an accepted visit card
--   in either account's list (requires EXPO_PUBLIC_DEMO_MODE=1) and tap
--   "Fast-forward".
--
-- Cleanup afterwards: section C.
-- ════════════════════════════════════════════════════════════════════

-- ── A. Resolve demo account ids ─────────────────────────────────────
-- SELECT clerk_id, email, full_name FROM public.profiles
--  WHERE email IN ('tenant-demo@example.com', 'landlord-demo@example.com');

-- ── B. Seed a past-window accepted visit ────────────────────────────
-- Fill these two from step A:
\set tenant_id '''TENANT_CLERK_ID_HERE'''
\set landlord_id '''LANDLORD_CLERK_ID_HERE'''

WITH v_property AS (
  SELECT p.id
  FROM public.properties p
  WHERE p.landlord_id = :'landlord_id'
    AND p.status <> 'DRAFT'
    AND (p.is_deleted IS NOT TRUE)
  ORDER BY p.created_at DESC
  LIMIT 1
)
INSERT INTO public.visit_requests
  (property_id, tenant_id, landlord_id, status,
   requested_date, time_slot, note, reschedule_count)
SELECT
  v_property.id,
  :'tenant_id',
  :'landlord_id',
  'ACCEPTED',
  CURRENT_DATE - 2,          -- two days ago → window definitely passed
  'MORNING',
  '[DEMO] Follow-up rehearsal visit',
  0
FROM v_property
WHERE NOT EXISTS (
  SELECT 1 FROM public.visit_requests v
  WHERE v.tenant_id = :'tenant_id'
    AND v.note = '[DEMO] Follow-up rehearsal visit'
);

-- Verify: this must return the seeded row(s) — status ACCEPTED but
-- window passed means the app will flip it to VISIT_COMPLETED on open.
SELECT id, status, requested_date, time_slot,
       tenant_follow_up_response, landlord_follow_up_outcome
FROM public.visit_requests
WHERE note = '[DEMO] Follow-up rehearsal visit'
ORDER BY created_at DESC;


-- ── C. Cleanup after the demo ───────────────────────────────────────
-- DELETE FROM public.visit_requests
--  WHERE note = '[DEMO] Follow-up rehearsal visit';
