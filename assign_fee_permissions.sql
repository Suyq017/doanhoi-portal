DO $$
DECLARE
    admin_role_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    perm_record RECORD;
BEGIN
    -- Gán từng quyền mới cho admin role
    FOR perm_record IN 
        SELECT id FROM permissions 
        WHERE code LIKE 'fee_%' 
           OR code LIKE 'payment_management%' 
           OR code LIKE 'payment_reports%' 
           OR code LIKE 'payment_export%'
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_record.id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Assigned fee permissions to super_admin role';
END $$;
