-- Script to fix vector dimension from 1536 to 768 for Google Gemini
-- Run this script to fix the dimension mismatch error

\c doanhoi

-- Drop existing table (sẽ xóa dữ liệu cũ)
DROP TABLE IF EXISTS ctxh_embeddings CASCADE;

-- Recreate table với dimension đúng
CREATE TABLE ctxh_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ctxh_activity(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    embedding vector(), -- Google Gemini text-embedding-004
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate indexes
CREATE INDEX idx_ctxh_embeddings_activity_id 
ON ctxh_embeddings(activity_id);

CREATE INDEX idx_ctxh_embeddings_vector 
ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_ctxh_embeddings_metadata 
ON ctxh_embeddings USING gin (metadata);

CREATE INDEX idx_ctxh_embeddings_chunk_index 
ON ctxh_embeddings(activity_id, chunk_index);

CREATE INDEX idx_ctxh_embeddings_created_at 
ON ctxh_embeddings(created_at);

-- Recreate trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ctxh_embeddings_updated_at
BEFORE UPDATE ON ctxh_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'ctxh_embeddings';

SELECT 'Table recreated successfully with 768 dimensions' as status;
