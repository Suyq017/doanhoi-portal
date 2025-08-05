-- SQL script to drop payment-related tables
-- Run these commands in order due to foreign key constraints

-- Disable foreign key checks (PostgreSQL)
SET session_replication_role = replica;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payment_assignments CASCADE;
DROP TABLE IF EXISTS payment_fee_levels CASCADE;
DROP TABLE IF EXISTS payment_campaigns CASCADE;
DROP TABLE IF EXISTS organization_payos_configs CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Verification queries (uncomment to check if tables are dropped)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'payment_%';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_payos_configs';
