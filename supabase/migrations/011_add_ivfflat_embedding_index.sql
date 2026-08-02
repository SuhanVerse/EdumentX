-- 011_add_ivfflat_embedding_index.sql
-- Uncomment-and-tune of the IVFFlat index left commented out in migration 003.
--
-- Migration 003 deliberately deferred index creation until after seeding
-- (IVFFlat centroids are computed at build time, so building on an empty
-- table produces a poor index). We create it as a SEPARATE additive migration
-- instead of editing 003 — applied migrations are immutable.
--
-- Tuning note (pgvector docs): lists ≈ rows / 1000, minimum 10.
-- For the current Kathmandu Valley dataset (tens of tutors) 10 is correct.
-- Bump toward 100 if the dataset grows past ~100k rows. If you later re-seed
-- a large batch, DROP + re-CREATE this index so the centroids recompute over
-- the current data.

CREATE INDEX IF NOT EXISTS idx_tutor_embeddings_ivfflat
  ON public.tutor_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
