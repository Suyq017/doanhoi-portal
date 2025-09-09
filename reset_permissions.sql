-- Xóa tất cả dữ liệu permissions hiện tại
DELETE FROM role_permissions;
DELETE FROM user_roles;
DELETE FROM permissions;
DELETE FROM roles;

-- Reset sequences nếu có
SELECT 'Permissions and roles data cleared successfully' as status;
