-- Auto-enable pgVector extension on database initialization
-- This script runs automatically via docker-entrypoint-initdb.d
CREATE EXTENSION IF NOT EXISTS vector;
