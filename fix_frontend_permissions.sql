DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Thêm quyền payment-campaigns.access để match với frontend
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'payment-campaigns.access', 'Truy cập quản lý chiến dịch thanh toán', 'Quyền truy cập vào trang quản lý chiến dịch thanh toán', 'payment_campaigns', 'organization', true, 43, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Gán quyền mới cho admin role
    SELECT id INTO perm_id FROM permissions WHERE code = 'payment-campaigns.access';
    
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Added payment-campaigns.access permission for frontend compatibility';
END $$;
