DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Tạo các access permissions cho navigation
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'users.access', 'Truy cập trang người dùng', 'Quyền truy cập vào trang quản lý người dùng', 'users', 'organization', true, 100, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.access', 'Truy cập trang tổ chức', 'Quyền truy cập vào trang quản lý tổ chức', 'organizations', 'organization', true, 101, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.access', 'Truy cập trang phòng ban', 'Quyền truy cập vào trang quản lý phòng ban', 'departments', 'organization', true, 102, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.access', 'Truy cập trang lớp học', 'Quyền truy cập vào trang quản lý lớp học', 'classes', 'organization', true, 103, NOW(), NOW()),
    (uuid_generate_v4(), 'permissions.access', 'Truy cập trang phân quyền', 'Quyền truy cập vào trang quản lý phân quyền', 'permissions', 'organization', true, 104, NOW(), NOW()),
    (uuid_generate_v4(), 'roles.access', 'Truy cập trang vai trò', 'Quyền truy cập vào trang quản lý vai trò', 'roles', 'organization', true, 105, NOW(), NOW()),
    (uuid_generate_v4(), 'admin.access', 'Truy cập khu vực quản trị', 'Quyền truy cập vào khu vực quản trị hệ thống', 'admin', 'organization', true, 106, NOW(), NOW());

    -- Gán tất cả access permissions cho Admin Role
    FOR perm_id IN 
        SELECT id FROM permissions WHERE code LIKE '%.access'
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") VALUES (admin_role_id, perm_id);
    END LOOP;
    
    RAISE NOTICE 'Added navigation permissions and assigned to super_admin role';
END $$;
