-- Setup pgVector extension for RAG chatbot
-- Run this script in your PostgreSQL database

-- Connect to the doanhoi database
\c doanhoi

-- Enable pgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Create ctxh_embeddings table for storing vector embeddings
CREATE TABLE IF NOT EXISTS ctxh_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ctxh_activity(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    embedding vector(768), -- Google Gemini text-embedding-004 dimension
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_activity_id 
ON ctxh_embeddings(activity_id);

-- Create HNSW index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_vector 
ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

-- Create GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_metadata 
ON ctxh_embeddings USING gin (metadata);

-- Create index for chunk ordering
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_chunk_index 
ON ctxh_embeddings(activity_id, chunk_index);

-- Create index for timestamps (for cleanup tasks)
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_created_at 
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
BEGIN
    -- Insert test data
    INSERT INTO ctxh_embeddings (content_text, embedding, metadata) 
    VALUES ('Test content for vector search', '[0.1,0.2,0.3]'::vector, '{"test": true}');
    
    -- Test vector similarity search
    PERFORM content_text FROM ctxh_embeddings 
    ORDER BY embedding <-> '[0.1,0.2,0.3]'::vector 
    LIMIT 5;
    
    -- Clean up test data
    DELETE FROM ctxh_embeddings WHERE metadata->>'test' = 'true';
    
    RAISE NOTICE 'pgVector setup completed successfully!';
END $$;

-- Display table info
\d ctxh_embeddings;

-- Show indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ctxh_embeddings';