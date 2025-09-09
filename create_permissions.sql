DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Tạo các permissions cơ bản
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'users.create', 'Tạo người dùng mới', 'Quyền tạo người dùng mới trong hệ thống', 'users', 'organization', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), 'users.read', 'Xem thông tin người dùng', 'Quyền xem danh sách và thông tin người dùng', 'users', 'organization', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), 'users.update', 'Cập nhật thông tin người dùng', 'Quyền sửa đổi thông tin người dùng', 'users', 'organization', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), 'users.delete', 'Xóa người dùng', 'Quyền xóa người dùng khỏi hệ thống', 'users', 'organization', true, 4, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.create', 'Tạo tổ chức mới', 'Quyền tạo tổ chức mới', 'organizations', 'organization', true, 5, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.read', 'Xem thông tin tổ chức', 'Quyền xem thông tin tổ chức', 'organizations', 'organization', true, 6, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.update', 'Cập nhật thông tin tổ chức', 'Quyền sửa đổi thông tin tổ chức', 'organizations', 'organization', true, 7, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.delete', 'Xóa tổ chức', 'Quyền xóa tổ chức', 'organizations', 'organization', true, 8, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.create', 'Tạo phòng ban mới', 'Quyền tạo phòng ban mới', 'departments', 'organization', true, 9, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.read', 'Xem thông tin phòng ban', 'Quyền xem thông tin phòng ban', 'departments', 'organization', true, 10, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.update', 'Cập nhật thông tin phòng ban', 'Quyền sửa đổi thông tin phòng ban', 'departments', 'organization', true, 11, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.delete', 'Xóa phòng ban', 'Quyền xóa phòng ban', 'departments', 'organization', true, 12, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.create', 'Tạo lớp học mới', 'Quyền tạo lớp học mới', 'classes', 'organization', true, 13, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.read', 'Xem thông tin lớp học', 'Quyền xem thông tin lớp học', 'classes', 'organization', true, 14, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.update', 'Cập nhật thông tin lớp học', 'Quyền sửa đổi thông tin lớp học', 'classes', 'organization', true, 15, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.delete', 'Xóa lớp học', 'Quyền xóa lớp học', 'classes', 'organization', true, 16, NOW(), NOW()),
    (uuid_generate_v4(), 'system.admin', 'Quyền quản trị hệ thống', 'Quyền quản trị toàn bộ hệ thống', 'system', 'organization', true, 17, NOW(), NOW()),
    (uuid_generate_v4(), 'dashboard.access', 'Truy cập dashboard', 'Quyền truy cập trang dashboard', 'dashboard', 'organization', true, 18, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.create', 'Tạo thanh toán', 'Quyền tạo thanh toán mới', 'payments', 'organization', true, 19, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.read', 'Xem thanh toán', 'Quyền xem thông tin thanh toán', 'payments', 'organization', true, 20, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.update', 'Cập nhật thanh toán', 'Quyền cập nhật thông tin thanh toán', 'payments', 'organization', true, 21, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.delete', 'Xóa thanh toán', 'Quyền xóa thanh toán', 'payments', 'organization', true, 22, NOW(), NOW());

    -- Gán tất cả permissions cho Admin Role
    FOR perm_id IN 
        SELECT id FROM permissions 
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") VALUES (admin_role_id, perm_id);
    END LOOP;
    
    RAISE NOTICE 'Created % permissions and assigned to super_admin role', (SELECT COUNT(*) FROM permissions);
END $$;
