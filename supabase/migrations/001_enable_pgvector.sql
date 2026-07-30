-- 001_enable_pgvector.sql
-- Enable the pgvector extension for vector similarity search.
-- Run this first, then verify with: SELECT * FROM pg_extension WHERE extname = 'vector';

CREATE EXTENSION IF NOT EXISTS vector
  WITH SCHEMA extensions;

-- Verify the extension is available
SELECT
  extname,
  extversion,
  extrelocatable
FROM pg_extension
WHERE extname = 'vector';
