-- Add CTXH permissions to super_admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin' 
  AND p.code IN (
    'ctxh.access', 
    'ctxh.categories.view', 
    'ctxh.categories.create', 
    'ctxh.categories.update', 
    'ctxh.categories.delete',
    'ctxh.activities.view', 
    'ctxh.activities.create', 
    'ctxh.activities.update', 
    'ctxh.activities.delete', 
    'ctxh.activities.manage_participants',
    'ctxh.reports.view', 
    'ctxh.reports.export', 
    'ctxh.config.manage'
  );

-- Verify the permissions were added
SELECT 
  r.name as role_name, 
  p.code as permission_code, 
  p.name as permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'super_admin' 
  AND p.code LIKE 'ctxh.%'
ORDER BY p.code;