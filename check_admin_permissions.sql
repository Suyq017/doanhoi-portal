-- Kiểm tra tất cả permissions của admin user
SELECT 
    'TOTAL PERMISSIONS' as info,
    COUNT(p.id) as count
FROM users u
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE u.email = 'admin@doanhoi.com'

UNION ALL

SELECT 
    'FEE & PAYMENT PERMISSIONS' as info,
    COUNT(p.id) as count
FROM users u
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE u.email = 'admin@doanhoi.com'
AND (p.code LIKE 'fee_%' OR p.code LIKE 'payment%');

-- Chi tiết permissions liên quan đến fee và payment
SELECT 
    p.category,
    p.code,
    p.name
FROM users u
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE u.email = 'admin@doanhoi.com'
AND (p.code LIKE 'fee_%' OR p.code LIKE 'payment%')
ORDER BY p.category, p.code;
