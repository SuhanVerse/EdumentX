-- 012_add_rate_limits.sql
-- PostgreSQL-backed rate limiting (fixes C17 — "Rate limiting resets on cold
-- start").
--
-- The Edge Function's old limiter lived in an in-memory Map inside
-- `supabase/functions/chat/middleware.ts`. Edge Functions can cold-start
-- on every request, wiping the Map and letting a client bypass the limit.
-- Moving the counters to PostgreSQL makes them durable and shared across
-- instances.
--
-- Usage:
--   SELECT rate_limit_check('user-123', 20, 60000);
--   → {"allowed": true, "retry_after_ms": null, "count": 1}
--   → {"allowed": false, "retry_after_ms": 42000, "count": 21}
--
--   SELECT cleanup_expired_rate_limits();  -- opportunistic purge, or via cron

SET search_path TO public, extensions;

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  user_id        TEXT PRIMARY KEY,          -- Firebase uid
  window_start   TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count  INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Check + increment (atomic) ──────────────────────────────────────────────

-- Atomically increments the request counter for a user within a sliding
-- window and returns whether the request is allowed. Safe under concurrency
-- (row-level lock on the user's row).
CREATE OR REPLACE FUNCTION rate_limit_check(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 20,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_now          TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count        INTEGER;
  v_allowed      BOOLEAN := true;
  v_retry_after  INTEGER := NULL;
BEGIN
  -- Upsert the row (or reset the window if it has expired).
  INSERT INTO rate_limits (user_id, window_start, request_count, updated_at)
  VALUES (p_user_id, v_now, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE SET
    window_start = CASE
      WHEN rate_limits.window_start < v_now - make_interval(secs => p_window_ms / 1000.0)
        THEN v_now
      ELSE rate_limits.window_start
    END,
    request_count = CASE
      WHEN rate_limits.window_start < v_now - make_interval(secs => p_window_ms / 1000.0)
        THEN 1
      ELSE rate_limits.request_count + 1
    END,
    updated_at = v_now
  RETURNING window_start, request_count
  INTO v_window_start, v_count;

  IF v_count > p_limit THEN
    v_allowed := false;
    v_retry_after := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => p_window_ms / 1000.0)) - v_now) * 1000)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'retry_after_ms', v_retry_after
  );
END;
$$;

-- ─── Cleanup (opportunistic) ────────────────────────────────────────────────

-- Deletes rows whose window ended more than `p_max_age_hours` ago.
-- Call from the Edge Function occasionally, or schedule via pg_cron.
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits(
  p_max_age_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - make_interval(hours => p_max_age_hours);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant to service_role (used by the Edge Function with the service key).
GRANT EXECUTE ON FUNCTION rate_limit_check TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;
GRANT ALL ON TABLE rate_limits TO service_role;
