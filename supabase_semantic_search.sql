-- =====================================================================
-- CreatorAi Semantic Search - Supabase pgvector Migration
-- =====================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create content_chunks table for timestamp-aware semantic indexing
CREATE TABLE IF NOT EXISTS content_chunks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  asset_id TEXT,
  transcript_id TEXT,
  text TEXT NOT NULL,
  start_time DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  end_time DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS content_chunks_embedding_idx 
ON content_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;

-- 5. Creator Data Isolation Policies
DROP POLICY IF EXISTS "Creator can manage own content chunks" ON content_chunks;
CREATE POLICY "Creator can manage own content chunks"
ON content_chunks
FOR ALL
USING (
  user_id = auth.uid()::text 
  OR user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR user_id = 'creator_primary'
);

-- 6. Similarity Search RPC Function (Cosine Distance)
CREATE OR REPLACE FUNCTION match_content_chunks(
  query_embedding VECTOR(768),
  match_threshold DOUBLE PRECISION DEFAULT 0.45,
  match_count INTEGER DEFAULT 5,
  filter_user_id TEXT DEFAULT 'creator_primary'
)
RETURNS TABLE (
  id TEXT,
  project_id TEXT,
  asset_id TEXT,
  transcript_id TEXT,
  text TEXT,
  start_time DOUBLE PRECISION,
  end_time DOUBLE PRECISION,
  chunk_index INTEGER,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.project_id,
    c.asset_id,
    c.transcript_id,
    c.text,
    c.start_time,
    c.end_time,
    c.chunk_index,
    (1 - (c.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM content_chunks c
  WHERE c.user_id = filter_user_id
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
