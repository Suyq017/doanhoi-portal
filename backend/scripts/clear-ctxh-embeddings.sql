-- Clear all data from ctxh_embeddings table
-- WARNING: This will delete ALL vector data!

-- Show current record count
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM ctxh_embeddings;
    RAISE NOTICE 'Current records in ctxh_embeddings: %', record_count;
    
    -- Delete all records
    DELETE FROM ctxh_embeddings;
    
    -- Reset sequence
    ALTER SEQUENCE ctxh_embeddings_id_seq RESTART WITH 1;
    
    RAISE NOTICE 'Successfully deleted % records from ctxh_embeddings', record_count;
    RAISE NOTICE 'Table cleared and sequence reset';
END $$;