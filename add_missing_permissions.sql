DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Thêm permissions chưa có
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") 
    SELECT 
        uuid_generate_v4(), 
        code_name, 
        display_name, 
        description_text, 
        category_name, 
        'organization', 
        true, 
        sort_order, 
        NOW(), 
        NOW()
    FROM (VALUES
        ('users.access', 'Truy cập trang người dùng', 'Quyền truy cập vào trang quản lý người dùng', 'users', 100),
        ('organizations.access', 'Truy cập trang tổ chức', 'Quyền truy cập vào trang quản lý tổ chức', 'organizations', 101),
        ('departments.access', 'Truy cập trang phòng ban', 'Quyền truy cập vào trang quản lý phòng ban', 'departments', 102),
        ('classes.access', 'Truy cập trang lớp học', 'Quyền truy cập vào trang quản lý lớp học', 'classes', 103),
        ('permissions.access', 'Truy cập trang phân quyền', 'Quyền truy cập vào trang quản lý phân quyền', 'permissions', 104),
        ('roles.access', 'Truy cập trang vai trò', 'Quyền truy cập vào trang quản lý vai trò', 'roles', 105),
        ('admin.access', 'Truy cập khu vực quản trị', 'Quyền truy cập vào khu vực quản trị hệ thống', 'admin', 106)
    ) AS new_perms(code_name, display_name, description_text, category_name, sort_order)
    WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE code = code_name
    );

    -- Gán tất cả access permissions cho Admin Role (chỉ những cái chưa có)
    FOR perm_id IN 
        SELECT p.id FROM permissions p 
        WHERE p.code LIKE '%.access' 
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp."roleId" = admin_role_id AND rp."permissionId" = p.id
        )
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") VALUES (admin_role_id, perm_id);
    END LOOP;
    
    RAISE NOTICE 'Added missing access permissions and assigned to super_admin role';
END $$;
