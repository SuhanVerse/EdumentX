-- 003_create_tutor_embeddings.sql
-- Tutor embeddings table: stores 384-dim pgvector embeddings for
-- semantic search over tutor bios, headlines, and teaching style.
--
-- The embedding dimension (384) matches bge-small-en-v1.5 from
-- HuggingFace Serverless Inference API.
--
-- We store embeddings in a separate table to:
--   1. Allow different embedding models in the future (e.g., 768-dim)
--   2. Keep the tutors table lightweight
--   3. Enable independent re-embedding without touching tutor data

CREATE TABLE IF NOT EXISTS public.tutor_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    TEXT NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,

  -- 384-dim embedding for semantic search (bge-small-en-v1.5)
  embedding   VECTOR(384) NOT NULL,

  -- The text that was embedded (for debugging / cache invalidation)
  source_text TEXT NOT NULL DEFAULT '',

  -- Which model generated this embedding
  model_name  TEXT NOT NULL DEFAULT 'BAAI/bge-small-en-v1.5',
  model_version TEXT NOT NULL DEFAULT '1.5',

  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one embedding per tutor
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_embeddings_tutor_id
  ON public.tutor_embeddings (tutor_id);

-- IVFFlat index for approximate nearest neighbor search
-- (Builds after data is inserted; run after seeding)
--
-- CREATE INDEX IF NOT EXISTS idx_tutor_embeddings_ivfflat
--   ON public.tutor_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
--
-- Note: IVFFlat index should be created AFTER data is inserted.
-- The index build command is commented out here and will be run
-- manually in Step D after seeding.

-- Enable Row-Level Security
ALTER TABLE public.tutor_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access embeddings
-- (Embeddings are consumed by the Edge Function, not by client apps)
DROP POLICY IF EXISTS "Only service role can access embeddings" ON public.tutor_embeddings;
CREATE POLICY "Only service role can access embeddings"
  ON public.tutor_embeddings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_tutor_embeddings_updated_at ON public.tutor_embeddings;
CREATE TRIGGER trg_tutor_embeddings_updated_at
  BEFORE UPDATE ON public.tutor_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for cosine similarity search (HNSW for better accuracy)
-- Uncomment after seeding data:
-- CREATE INDEX ON public.tutor_embeddings USING hnsw (embedding vector_cosine_ops);
