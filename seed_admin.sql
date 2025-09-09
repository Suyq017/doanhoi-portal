-- Tạo Admin Role
INSERT INTO roles (id, name, "displayName", description, "isSystemRole", "isActive", "createdAt", "updatedAt") 
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'super_admin',
    'Super Admin', 
    'Quyền quản trị toàn hệ thống',
    true,
    true,
    NOW(),
    NOW()
);

-- Tạo các permissions cơ bản
INSERT INTO permissions (id, name, action, resource, description, "createdAt", "updatedAt") VALUES
('p1', 'users.create', 'create', 'users', 'Tạo người dùng mới', NOW(), NOW()),
('p2', 'users.read', 'read', 'users', 'Xem thông tin người dùng', NOW(), NOW()),
('p3', 'users.update', 'update', 'users', 'Cập nhật thông tin người dùng', NOW(), NOW()),
('p4', 'users.delete', 'delete', 'users', 'Xóa người dùng', NOW(), NOW()),
('p5', 'organizations.create', 'create', 'organizations', 'Tạo tổ chức mới', NOW(), NOW()),
('p6', 'organizations.read', 'read', 'organizations', 'Xem thông tin tổ chức', NOW(), NOW()),
('p7', 'organizations.update', 'update', 'organizations', 'Cập nhật thông tin tổ chức', NOW(), NOW()),
('p8', 'organizations.delete', 'delete', 'organizations', 'Xóa tổ chức', NOW(), NOW()),
('p9', 'departments.create', 'create', 'departments', 'Tạo phòng ban mới', NOW(), NOW()),
('p10', 'departments.read', 'read', 'departments', 'Xem thông tin phòng ban', NOW(), NOW()),
('p11', 'departments.update', 'update', 'departments', 'Cập nhật thông tin phòng ban', NOW(), NOW()),
('p12', 'departments.delete', 'delete', 'departments', 'Xóa phòng ban', NOW(), NOW()),
('p13', 'classes.create', 'create', 'classes', 'Tạo lớp học mới', NOW(), NOW()),
('p14', 'classes.read', 'read', 'classes', 'Xem thông tin lớp học', NOW(), NOW()),
('p15', 'classes.update', 'update', 'classes', 'Cập nhật thông tin lớp học', NOW(), NOW()),
('p16', 'classes.delete', 'delete', 'classes', 'Xóa lớp học', NOW(), NOW()),
('p17', 'system.admin', 'admin', 'system', 'Quyền quản trị hệ thống', NOW(), NOW()),
('p18', 'dashboard.access', 'read', 'dashboard', 'Truy cập dashboard', NOW(), NOW());

-- Gán tất cả permissions cho Admin Role
INSERT INTO role_permissions ("roleId", "permissionId") VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p1'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p2'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p3'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p4'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p5'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p6'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p7'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p8'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p9'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p10'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p11'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p12'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p13'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p14'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p15'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p16'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p17'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'p18');

-- Tạo Admin User với mật khẩu đã hash (admin123)
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
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'ADMIN001',
    'Admin',
    'System',
    'admin@doanhoi.com',
    '0123456789',
    '$2b$10$5fFpLMiUU8xpzng0s6f/a.02sncAiYYuD7gNXYZuUnuscs933lP8q',
    'local',
    true,
    'admin',
    'active',
    NOW(),
    NOW()
);

-- Gán Admin Role cho Admin User
INSERT INTO user_roles ("userId", "roleId") VALUES 
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
