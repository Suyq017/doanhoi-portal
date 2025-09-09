DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Thêm các quyền cho Payment Campaigns (Chiến dịch thanh toán)
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'payment-campaigns.create', 'Tạo chiến dịch thanh toán', 'Quyền tạo chiến dịch thu phí mới', 'payment-campaigns', 'organization', true, 50, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.read', 'Xem chiến dịch thanh toán', 'Quyền xem danh sách chiến dịch thanh toán', 'payment-campaigns', 'organization', true, 51, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.update', 'Cập nhật chiến dịch thanh toán', 'Quyền chỉnh sửa chiến dịch thanh toán', 'payment-campaigns', 'organization', true, 52, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.delete', 'Xóa chiến dịch thanh toán', 'Quyền xóa chiến dịch thanh toán', 'payment-campaigns', 'organization', true, 53, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.approve', 'Phê duyệt chiến dịch thanh toán', 'Quyền phê duyệt chiến dịch thu phí', 'payment-campaigns', 'organization', true, 54, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.close', 'Đóng chiến dịch thanh toán', 'Quyền đóng chiến dịch thu phí', 'payment-campaigns', 'organization', true, 55, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-campaigns.manage', 'Quản lý chiến dịch thanh toán', 'Quyền quản lý toàn bộ chiến dịch thanh toán', 'payment-campaigns', 'organization', true, 56, NOW(), NOW()),
    
    -- Thêm các quyền cho Student Payments (Thanh toán sinh viên)
    (uuid_generate_v4(), 'student-payments.read', 'Xem thanh toán sinh viên', 'Quyền xem thông tin thanh toán của sinh viên', 'student-payments', 'organization', true, 60, NOW(), NOW()),
    (uuid_generate_v4(), 'student-payments.verify', 'Xác nhận thanh toán sinh viên', 'Quyền xác nhận thanh toán của sinh viên', 'student-payments', 'organization', true, 61, NOW(), NOW()),
    (uuid_generate_v4(), 'student-payments.update', 'Cập nhật thanh toán sinh viên', 'Quyền cập nhật trạng thái thanh toán sinh viên', 'student-payments', 'organization', true, 62, NOW(), NOW()),
    
    -- Thêm các quyền cho Reports (Báo cáo)
    (uuid_generate_v4(), 'payment-reports.export', 'Xuất báo cáo thanh toán', 'Quyền xuất báo cáo thanh toán ra file', 'payment-reports', 'organization', true, 70, NOW(), NOW()),
    (uuid_generate_v4(), 'payment-reports.detailed', 'Xem báo cáo chi tiết', 'Quyền xem báo cáo thanh toán chi tiết', 'payment-reports', 'organization', true, 71, NOW(), NOW()),
    
    -- Thêm các quyền Admin cấp cao
    (uuid_generate_v4(), 'payments.admin', 'Quản trị thanh toán', 'Quyền quản trị toàn bộ hệ thống thanh toán', 'payments', 'organization', true, 80, NOW(), NOW()),
    (uuid_generate_v4(), 'fee-collection.admin', 'Quản trị thu phí', 'Quyền quản trị toàn bộ hệ thống thu phí', 'fee-collection', 'organization', true, 81, NOW(), NOW())
    
    ON CONFLICT (code) DO NOTHING;

    -- Gán tất cả permissions mới cho Admin Role
    FOR perm_id IN 
        SELECT id FROM permissions 
        WHERE code LIKE 'payment-campaigns.%' 
           OR code LIKE 'student-payments.%'
           OR code LIKE 'payment-reports.%'
           OR code LIKE 'payments.admin'
           OR code LIKE 'fee-collection.admin'
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created payment campaign permissions and assigned to super_admin role';
END $$;
