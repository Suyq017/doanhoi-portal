-- Tạo role super_admin
INSERT INTO roles (id, name, "displayName", description, "isSystemRole", "isActive", "createdAt", "updatedAt") 
VALUES (
    uuid_generate_v4(),
    'super_admin',
    'Super Admin', 
    'Quyền quản trị toàn hệ thống',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Lấy ID của role super_admin
DO $$
DECLARE
    admin_role_id UUID;
    admin_user_id UUID;
    perm_record RECORD;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Gán TẤT CẢ permissions cho super_admin role
    FOR perm_record IN 
        SELECT id FROM permissions
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_record.id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END LOOP;
    
    -- Lấy admin user ID
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@doanhoi.com';
    
    -- Gán super_admin role cho admin user
    DELETE FROM user_roles WHERE "userId" = admin_user_id;
    INSERT INTO user_roles ("userId", "roleId") 
    VALUES (admin_user_id, admin_role_id);
    
    RAISE NOTICE 'Admin role created and all permissions assigned to admin user';
END $$;
