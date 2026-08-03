-- ════════════════════════════════════════════════════════════════════
-- MIGRATION: esewa_payment_schema
-- Adds products, transactions, and user_passes tables for eSewa v2
-- payment integration. Uses clerk_id (TEXT) to match the Clerk auth
-- pattern used by the rest of the Basobas project.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. PRODUCTS (server-side source of truth for pricing)
--    The client never sends amount — only a plan identifier.
--    The Edge Function looks up the authoritative price here.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id              TEXT            PRIMARY KEY,          -- 'monthly' | '3month'
  name            TEXT            NOT NULL,
  price           NUMERIC(10, 2)  NOT NULL,             -- e.g. 249.00 / 549.00
  duration_months INTEGER         NOT NULL,
  active          BOOLEAN         NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.products IS
  'Server-side source of truth for pass pricing. The client only sends a plan ID.';

-- Seed the two available plans (safe to re-run)
INSERT INTO public.products (id, name, price, duration_months) VALUES
  ('monthly', 'Monthly Pass',             249.00, 1),
  ('3month',  '3-Month Pass (Discounted)', 549.00, 3)
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS (one row per eSewa payment attempt)
--    Uses clerk_id (TEXT) to match the Clerk auth pattern.
--    No FK to profiles to keep the payment system loosely coupled.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id          TEXT            NOT NULL,                     -- Clerk user ID
  product_id        TEXT            NOT NULL REFERENCES public.products(id),
  transaction_uuid  TEXT            NOT NULL UNIQUE,              -- sent to eSewa
  amount            NUMERIC(10, 2)  NOT NULL,
  tax_amount        NUMERIC(10, 2)  NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10, 2)  NOT NULL,
  status            TEXT            NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETE', 'FAILED', 'CANCELED')),
  esewa_ref_id      TEXT,                                         -- transaction_code from eSewa callback
  raw_callback      JSONB,                                        -- full decoded callback payload (audit trail)
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transactions IS
  'One row per eSewa payment attempt. All writes go through Edge Functions (service role).';
COMMENT ON COLUMN public.transactions.raw_callback IS
  'Stores the full decoded eSewa callback payload for audit/troubleshooting.';


-- ────────────────────────────────────────────────────────────────────
-- 3. USER_PASSES (active/expired passes granted to users)
--    Stacking: if a user already has an active pass, the new pass
--    extends from the existing expiry rather than starting from now.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_passes (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id        TEXT            NOT NULL,
  product_id      TEXT            NOT NULL REFERENCES public.products(id),
  transaction_id  UUID            NOT NULL REFERENCES public.transactions(id),
  starts_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ     NOT NULL,
  status          TEXT            NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'EXPIRED')),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_passes IS
  'Passes are stacked: if an existing ACTIVE pass exists, new pass starts_at its expiry.';


-- ────────────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_transactions_clerk_id   ON public.transactions(clerk_id);
CREATE INDEX IF NOT EXISTS idx_transactions_uuid       ON public.transactions(transaction_uuid);
CREATE INDEX IF NOT EXISTS idx_transactions_status     ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_passes_clerk_id    ON public.user_passes(clerk_id);
CREATE INDEX IF NOT EXISTS idx_user_passes_status      ON public.user_passes(status);


-- ────────────────────────────────────────────────────────────────────
-- 5. updated_at TRIGGER for transactions
-- ────────────────────────────────────────────────────────────────────

-- Reuse the existing update_updated_at function (already created in earlier migrations)
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
--    Users can only SELECT their own rows.
--    All INSERT/UPDATE is done via Edge Functions (service role).
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passes   ENABLE ROW LEVEL SECURITY;

-- transactions: users read their own
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (clerk_id = requesting_user_id());

-- user_passes: users read their own
CREATE POLICY "user_passes_select_own"
  ON public.user_passes FOR SELECT
  TO authenticated
  USING (clerk_id = requesting_user_id());

-- No INSERT/UPDATE/DELETE policies — all writes happen via Edge Functions
-- using the service role key, which bypasses RLS.
