-- ════════════════════════════════════════════════════════════
-- File: docker/init-mcp-role.sql
-- Chạy tự động khi khởi tạo PostgreSQL container lần đầu
-- ════════════════════════════════════════════════════════════

-- 1. Tạo user / role riêng cho MCP agent
CREATE USER mcp_agent WITH
  PASSWORD 'mcp_secret_pw'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN;

-- 2. Kết nối vào database doanhoi
GRANT CONNECT ON DATABASE doanhoi TO mcp_agent;

-- 3. Quyền schema usage
GRANT USAGE ON SCHEMA public TO mcp_agent;

-- 4. Quyền SELECT, INSERT, UPDATE, DELETE trên toàn bộ bảng hiện tại
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO mcp_agent;

-- 5. Áp dụng cho các bảng tạo mới trong tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mcp_agent;

-- 6. Quyền dùng sequence (cần cho auto-increment / UUID default gen)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mcp_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mcp_agent;

-- 7. Quyền gọi các hàm/toán tử của pgvector
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mcp_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO mcp_agent;

-- 8. Kiểm tra
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'mcp_agent'
LIMIT 20;
