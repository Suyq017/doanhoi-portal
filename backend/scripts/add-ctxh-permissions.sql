-- Add CTXH permissions
INSERT INTO permissions (id, name, description, created_at, updated_at) VALUES 
(UUID(), 'ctxh.access', 'Truy cập module quản lý CTXH', NOW(), NOW()),
(UUID(), 'ctxh.categories.view', 'Xem danh mục CTXH', NOW(), NOW()),
(UUID(), 'ctxh.categories.create', 'Tạo danh mục CTXH', NOW(), NOW()),
(UUID(), 'ctxh.categories.update', 'Cập nhật danh mục CTXH', NOW(), NOW()),
(UUID(), 'ctxh.categories.delete', 'Xóa danh mục CTXH', NOW(), NOW()),
(UUID(), 'ctxh.activities.view', 'Xem hoạt động CTXH', NOW(), NOW()),
(UUID(), 'ctxh.activities.create', 'Tạo hoạt động CTXH', NOW(), NOW()),
(UUID(), 'ctxh.activities.update', 'Cập nhật hoạt động CTXH', NOW(), NOW()),
(UUID(), 'ctxh.activities.delete', 'Xóa hoạt động CTXH', NOW(), NOW()),
(UUID(), 'ctxh.activities.manage_participants', 'Quản lý người tham gia hoạt động CTXH', NOW(), NOW()),
(UUID(), 'ctxh.reports.view', 'Xem báo cáo CTXH', NOW(), NOW()),
(UUID(), 'ctxh.reports.export', 'Xuất báo cáo CTXH', NOW(), NOW()),
(UUID(), 'ctxh.config.manage', 'Quản lý cấu hình CTXH', NOW(), NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), updated_at = NOW();

-- Assign CTXH permissions to admin role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'Admin', 'ADMIN') 
  AND p.name LIKE 'ctxh.%'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Verify the permissions were added
SELECT r.name as role_name, p.name as permission_name, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('admin', 'Admin', 'ADMIN') 
  AND p.name LIKE 'ctxh.%'
ORDER BY p.name;