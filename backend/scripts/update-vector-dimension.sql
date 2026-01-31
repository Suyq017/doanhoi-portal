-- Update vector dimension to 1024 for embeddings model
-- This script updates the dimension without losing data in other columns

\c doanhoi

-- Step 1: Add new column with vector(1024)
ALTER TABLE ctxh_embeddings 
ADD COLUMN new_embedding vector(1024);

-- Step 2: Drop old embedding column and its index
DROP INDEX IF EXISTS idx_ctxh_embeddings_vector;
ALTER TABLE ctxh_embeddings 
DROP COLUMN IF EXISTS embedding;

-- Step 3: Rename new_embedding to embedding
ALTER TABLE ctxh_embeddings 
RENAME COLUMN new_embedding TO embedding;

-- Step 4: Make embedding column NOT NULL (after data migration if needed)
-- ALTER TABLE ctxh_embeddings 
-- ALTER COLUMN embedding SET NOT NULL;

-- Step 5: Recreate HNSW index for vector similarity search
CREATE INDEX idx_ctxh_embeddings_vector 
ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

-- Verify table structure
\d ctxh_embeddings;

-- Check if indexes are created
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ctxh_embeddings';
