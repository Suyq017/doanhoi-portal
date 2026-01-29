-- Setup pgVector extension for RAG chatbot
-- Run this script in your PostgreSQL database

-- Connect to the doanhoi database
\c doanhoi

-- Enable pgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Drop existing table if exists (sẽ xóa dữ liệu cũ)
DROP TABLE IF EXISTS ctxh_embeddings CASCADE;

-- Create ctxh_embeddings table for storing vector embeddings
CREATE TABLE ctxh_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ctxh_activity(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    embedding vector(1024), -- BGE-M3 (Ollama) dimension: 1024, Gemini: 768
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal performance
CREATE INDEX idx_ctxh_embeddings_activity_id 
ON ctxh_embeddings(activity_id);

-- Create HNSW index for vector similarity search (cosine distance)
CREATE INDEX idx_ctxh_embeddings_vector 
ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

-- Create GIN index for metadata queries
CREATE INDEX idx_ctxh_embeddings_metadata 
ON ctxh_embeddings USING gin (metadata);

-- Create index for chunk ordering
CREATE INDEX idx_ctxh_embeddings_chunk_index 
ON ctxh_embeddings(activity_id, chunk_index);

-- Create index for timestamps (for cleanup tasks)
CREATE INDEX idx_ctxh_embeddings_created_at 
ON ctxh_embeddings(created_at);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ctxh_embeddings_updated_at 
BEFORE UPDATE ON ctxh_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Test vector operations
DO $$
DECLARE
    test_vector vector(1024);
BEGIN
    -- Create a test vector with 1024 dimensions (all zeros except first 3)
    test_vector := array_fill(0::float, ARRAY[1024])::vector;
    
    RAISE NOTICE 'pgVector setup completed successfully! Dimension: 1024';
END $$;

-- Display table info
\d ctxh_embeddings;

-- Show indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ctxh_embeddings';