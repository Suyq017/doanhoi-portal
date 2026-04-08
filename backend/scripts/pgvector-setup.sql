-- ============================================================
-- pgVector Setup Script for RAG Chatbot (bge-m3, dimension: 1024)
-- ============================================================
-- Idempotent: Safe to run multiple times (local dev, CI, server deploy)
-- Does NOT drop existing data.
-- ============================================================

\c doanhoi

-- 1. Enable pgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create ctxh_embeddings table if it does not exist
CREATE TABLE IF NOT EXISTS ctxh_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ctxh_activity(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    embedding vector(1024),  -- BGE-M3 (Ollama) dimension: 1024
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_activity_id
    ON ctxh_embeddings(activity_id);

CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_vector
    ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_metadata
    ON ctxh_embeddings USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_chunk_index
    ON ctxh_embeddings(activity_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_created_at
    ON ctxh_embeddings(created_at);

-- 4. Create/replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ctxh_embeddings_updated_at'
    ) THEN
        CREATE TRIGGER update_ctxh_embeddings_updated_at
        BEFORE UPDATE ON ctxh_embeddings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 5. Verify setup
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'pgVector setup completed!';
    RAISE NOTICE '  Extension: vector (pgvector)';
    RAISE NOTICE '  Table: ctxh_embeddings (vector dimension: 1024)';
    RAISE NOTICE '  Embedding model: bge-m3 via Ollama';
    RAISE NOTICE '================================================';
END $$;

-- Show final table structure
\d ctxh_embeddings;

SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'ctxh_embeddings'
ORDER BY indexname;
