-- 006_create_embedding_cache.sql
-- Embedding cache: stores generated embeddings by query text hash.
-- This avoids redundant HuggingFace API calls for the same query text.
--
-- Cache key: MD5 hash of the query text (faster than a full-text index)
-- Cache TTL: entries older than 24 hours may be re-generated
--
-- Cleanup: run periodically to remove stale entries
--   DELETE FROM embedding_cache WHERE created_at < NOW() - INTERVAL '24 hours';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.embedding_cache (
  -- MD5 hash of the query text (hex string, 32 chars)
  query_hash    TEXT PRIMARY KEY,

  -- Original query text (for debugging / manual invalidation)
  query_text    TEXT NOT NULL,

  -- 384-dim embedding (same model as tutor_embeddings)
  embedding     VECTOR(384) NOT NULL,

  -- Which model generated this embedding
  model_name    TEXT NOT NULL DEFAULT 'BAAI/bge-small-en-v1.5',

  -- Times
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.embedding_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access the cache
-- (Cache is managed by the Edge Function, not by client apps)
DROP POLICY IF EXISTS "Only service role can access embedding cache" ON public.embedding_cache;
CREATE POLICY "Only service role can access embedding cache"
  ON public.embedding_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for cache cleanup queries
CREATE INDEX IF NOT EXISTS idx_embedding_cache_created_at ON public.embedding_cache (created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_last_used ON public.embedding_cache (last_used_at);

-- Explicitly set search path so vector type is resolvable
SET search_path TO public, extensions;

-- Auto-update last_used_at on cache hit
CREATE OR REPLACE FUNCTION update_last_used_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_embedding_cache_last_used ON public.embedding_cache;
CREATE TRIGGER trg_embedding_cache_last_used
  BEFORE UPDATE ON public.embedding_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_last_used_at();

-- Helper function: compute SHA-256 hash of text
-- Usage: SELECT embedding_cache_hash('I need a patient Maths tutor');
-- Note: Using SHA-256 (not MD5) for Web Crypto API compatibility
CREATE OR REPLACE FUNCTION embedding_cache_hash(query_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(ENCODE(DIGEST(query_text, 'sha256'), 'hex'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: get cached embedding (or NULL if not found)
-- Usage: SELECT * FROM get_cached_embedding('I need a patient Maths tutor');
CREATE OR REPLACE FUNCTION get_cached_embedding(query_text TEXT)
RETURNS TABLE(
  query_hash TEXT,
  embedding vector(384),
  model_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ec.query_hash, ec.embedding, ec.model_name, ec.created_at
  FROM embedding_cache ec
  WHERE ec.query_hash = embedding_cache_hash(query_text);

  -- Update last_used_at if found
  UPDATE embedding_cache
  SET last_used_at = NOW()
  WHERE query_hash = embedding_cache_hash(query_text);
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

-- Helper function: insert or update cached embedding
-- Usage: SELECT cache_embedding('I need a patient Maths tutor', '[0.001, 0.002, ...]');
CREATE OR REPLACE FUNCTION cache_embedding(query_text TEXT, new_embedding vector(384))
RETURNS VOID AS $$
BEGIN
  INSERT INTO embedding_cache (query_hash, query_text, embedding)
  VALUES (embedding_cache_hash(query_text), query_text, new_embedding)
  ON CONFLICT (query_hash)
  DO UPDATE SET
    embedding = new_embedding,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;
