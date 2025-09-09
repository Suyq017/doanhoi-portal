DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Tạo permissions cho Fee Batches (Đợt đóng phí)
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'fee_batches.create', 'Tạo đợt đóng phí', 'Quyền tạo đợt đóng phí mới', 'fee_batches', 'organization', true, 30, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.read', 'Xem đợt đóng phí', 'Quyền xem danh sách và thông tin đợt đóng phí', 'fee_batches', 'organization', true, 31, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.update', 'Cập nhật đợt đóng phí', 'Quyền sửa đổi thông tin đợt đóng phí', 'fee_batches', 'organization', true, 32, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.delete', 'Xóa đợt đóng phí', 'Quyền xóa đợt đóng phí', 'fee_batches', 'organization', true, 33, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.access', 'Truy cập trang đợt đóng phí', 'Quyền truy cập vào trang quản lý đợt đóng phí', 'fee_batches', 'organization', true, 107, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.approve', 'Phê duyệt đợt đóng phí', 'Quyền phê duyệt đợt đóng phí', 'fee_batches', 'organization', true, 34, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_batches.close', 'Đóng đợt đóng phí', 'Quyền đóng đợt đóng phí', 'fee_batches', 'organization', true, 35, NOW(), NOW()),
    
    -- Tạo permissions cho Fee Records (Bản ghi đóng phí)
    (uuid_generate_v4(), 'fee_records.create', 'Tạo bản ghi đóng phí', 'Quyền tạo bản ghi đóng phí cho sinh viên', 'fee_records', 'organization', true, 36, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_records.read', 'Xem bản ghi đóng phí', 'Quyền xem thông tin bản ghi đóng phí', 'fee_records', 'organization', true, 37, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_records.update', 'Cập nhật bản ghi đóng phí', 'Quyền cập nhật trạng thái đóng phí', 'fee_records', 'organization', true, 38, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_records.delete', 'Xóa bản ghi đóng phí', 'Quyền xóa bản ghi đóng phí', 'fee_records', 'organization', true, 39, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_records.access', 'Truy cập trang bản ghi đóng phí', 'Quyền truy cập vào trang quản lý bản ghi đóng phí', 'fee_records', 'organization', true, 108, NOW(), NOW()),
    (uuid_generate_v4(), 'fee_records.verify', 'Xác nhận đóng phí', 'Quyền xác nhận sinh viên đã đóng phí', 'fee_records', 'organization', true, 40, NOW(), NOW()),
    
    -- Tạo permissions cho Payment Management (Quản lý thanh toán)
    (uuid_generate_v4(), 'payment_management.access', 'Truy cập quản lý thanh toán', 'Quyền truy cập vào trang quản lý thanh toán tổng thể', 'payment_management', 'organization', true, 109, NOW(), NOW()),
    (uuid_generate_v4(), 'payment_reports.read', 'Xem báo cáo thanh toán', 'Quyền xem các báo cáo về thanh toán và đóng phí', 'payment_reports', 'organization', true, 41, NOW(), NOW()),
    (uuid_generate_v4(), 'payment_export.access', 'Xuất dữ liệu thanh toán', 'Quyền xuất dữ liệu thanh toán ra file Excel/PDF', 'payment_export', 'organization', true, 42, NOW(), NOW())
    
    ON CONFLICT (code) DO NOTHING;

    -- Gán tất cả permissions mới cho Admin Role
    FOR perm_id IN 
        SELECT id FROM permissions WHERE code LIKE 'fee_%' OR code LIKE 'payment_management%' OR code LIKE 'payment_reports%' OR code LIKE 'payment_export%'
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created fee batch permissions and assigned to super_admin role';
END $$;
