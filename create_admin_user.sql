DO $$
DECLARE
    admin_role_id UUID;
    admin_user_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Kiểm tra xem đã có user admin chưa
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@doanhoi.com') THEN
        -- Tạo Admin User
        INSERT INTO users (
            id, 
            code, 
            "familyName", 
            "givenName", 
            email, 
            phone, 
            password, 
            "authProvider", 
            "isActive", 
            "userType", 
            "membershipStatus", 
            "createdAt", 
            "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            'ADMIN001',
            'Admin',
            'System',
            'admin@doanhoi.com',
            '0123456789',
            '$2b$10$5fFpLMiUU8xpzng0s6f/a.02sncAiYYuD7gNXYZuUnuscs933lP8q',
            'local',
            true,
            'staff',
            'none',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_user_id;

        -- Gán Admin Role cho Admin User
        INSERT INTO user_roles ("userId", "roleId") VALUES (admin_user_id, admin_role_id);
        
        RAISE NOTICE 'Admin user created successfully with email: admin@doanhoi.com';
    ELSE
        RAISE NOTICE 'Admin user already exists!';
    END IF;
END $$;
