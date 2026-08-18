-- 015_create_transactions.sql
-- eSewa payment transactions ledger.
--
-- Every "Upgrade to Pro" order writes a PENDING row here at order
-- creation (in the create-esewa-order Edge Function, service role).
-- The callback-verification path then reconciles the row:
--
--   1. looks it up by transaction_uuid (replay protection — a row
--      can only be marked COMPLETE once),
--   2. checks ownership (tutor_uid must match the caller),
--   3. cross-checks amount + product code against what we stored,
--   4. confirms COMPLETE with eSewa's server-to-server status API,
--   5. marks the row COMPLETE with eSewa's ref id.
--
-- Only the service role touches this table (identity is Firebase
-- Auth; the app never reads transactions client-side — the grant
-- lives in Firestore, written by the client after a verified
-- callback).
--
-- NOTE: This table stores payment-state data only. User identity is
-- Firebase Auth; tutor_uid stores the Firebase Auth UID with no FK
-- (users live in Firebase, not Postgres — same as conversations).

CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- eSewa's unique transaction identifier (alphanumeric + hyphen).
  -- UNIQUE => a transaction_uuid can never be reconciled twice,
  -- which is the replay-protection anchor.
  transaction_uuid  TEXT NOT NULL UNIQUE,

  -- Firebase Auth UID of the tutor who initiated the order.
  tutor_uid         TEXT NOT NULL,

  -- Plan identifier from the server-side price table ("monthly" | "3month").
  plan              TEXT NOT NULL,

  -- eSewa merchant product code (e.g. "EPAYTEST").
  product_code      TEXT NOT NULL,

  -- Authoritative amounts (server-side PRODUCTS table), kept so the
  -- callback can be cross-checked against what we actually signed.
  amount            NUMERIC(10, 2) NOT NULL,
  tax_amount        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10, 2) NOT NULL,

  -- Lifecycle: PENDING (order created) → COMPLETE (verified) or FAILED.
  status            TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'COMPLETE', 'FAILED')),

  -- eSewa's reference id from the status API / callback
  -- (e.g. "000AWEO" / "0DAINTL").
  esewa_ref_id      TEXT,

  -- Raw decoded callback payload for audit (IRD-friendly trail).
  raw_callback      JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security. No anon/user policies: this table is
-- server-side only. The create-esewa-order Edge Function uses the
-- service role (bypasses RLS), and the app never reads it directly.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can access all transactions
DROP POLICY IF EXISTS "Service role can access all transactions" ON public.transactions;
CREATE POLICY "Service role can access all transactions"
  ON public.transactions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_tutor_uid ON public.transactions (tutor_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
