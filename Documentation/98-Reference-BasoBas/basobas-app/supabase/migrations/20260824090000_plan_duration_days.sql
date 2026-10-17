-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: plan_duration_days
-- Pro plans are now 15-day and 30-day passes. The 1-month and
-- 3-month plans are removed, and the products table switches from
-- duration_months to duration_days so a 15-day pass is representable.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Rename the duration column to days
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.products
  RENAME COLUMN duration_months TO duration_days;

COMMENT ON COLUMN public.products.duration_days IS
  'Pass validity in days (15 or 30).';


-- ────────────────────────────────────────────────────────────────────
-- 2. Replace old plans with the new 15/30 day plans (safe to re-run)
--    Safe because transactions/user_passes were wiped before this.
-- ────────────────────────────────────────────────────────────────────

DELETE FROM public.products WHERE id IN ('monthly', '3month');

INSERT INTO public.products (id, name, price, duration_days) VALUES
  ('15day', '15-Day Pass', 149.00, 15),
  ('30day', '30-Day Pass', 249.00, 30)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days;
