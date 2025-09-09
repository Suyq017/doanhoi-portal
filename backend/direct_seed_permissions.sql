-- Tạo UUID extension nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert permissions trực tiếp từ seed data
INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
(uuid_generate_v4(), 'dashboard.access', 'Truy cập Dashboard', 'Cho phép truy cập trang tổng quan', 'dashboard', 'organization', true, 1, NOW(), NOW()),

(uuid_generate_v4(), 'users.access', 'Truy cập quản lý người dùng', 'Cho phép truy cập trang quản lý người dùng', 'users', 'organization', true, 10, NOW(), NOW()),
(uuid_generate_v4(), 'users.create', 'Tạo người dùng', 'Cho phép tạo người dùng mới', 'users', 'organization', true, 11, NOW(), NOW()),
(uuid_generate_v4(), 'users.view_details', 'Xem chi tiết người dùng', 'Cho phép xem thông tin chi tiết người dùng', 'users', 'organization', true, 12, NOW(), NOW()),
(uuid_generate_v4(), 'users.update', 'Cập nhật người dùng', 'Cho phép cập nhật thông tin người dùng', 'users', 'organization', true, 13, NOW(), NOW()),
(uuid_generate_v4(), 'users.delete', 'Xóa người dùng', 'Cho phép xóa người dùng', 'users', 'organization', true, 14, NOW(), NOW()),
(uuid_generate_v4(), 'users.export', 'Xuất danh sách người dùng', 'Cho phép xuất danh sách người dùng', 'users', 'organization', true, 15, NOW(), NOW()),

(uuid_generate_v4(), 'organizations.access', 'Truy cập quản lý tổ chức', 'Cho phép truy cập trang quản lý tổ chức', 'organizations', 'organization', true, 20, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.create', 'Tạo tổ chức', 'Cho phép tạo tổ chức mới', 'organizations', 'system', true, 21, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.view_member_count', 'Xem số lượng thành viên tổ chức', 'Cho phép xem số lượng thành viên trong tổ chức', 'organizations', 'organization', true, 22, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.access_children', 'Truy cập tổ chức con', 'Cho phép truy cập các tổ chức con', 'organizations', 'organization', true, 23, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.update', 'Cập nhật tổ chức', 'Cho phép cập nhật thông tin tổ chức', 'organizations', 'organization', true, 24, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.delete', 'Xóa tổ chức', 'Cho phép xóa tổ chức', 'organizations', 'organization', true, 25, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.add_member', 'Thêm thành viên vào tổ chức', 'Cho phép thêm thành viên vào tổ chức', 'organizations', 'organization', true, 26, NOW(), NOW()),
(uuid_generate_v4(), 'organizations.remove_member', 'Xóa thành viên khỏi tổ chức', 'Cho phép xóa thành viên khỏi tổ chức', 'organizations', 'organization', true, 27, NOW(), NOW()),

(uuid_generate_v4(), 'departments.access', 'Truy cập quản lý phòng ban', 'Cho phép truy cập trang quản lý phòng ban', 'departments', 'organization', true, 30, NOW(), NOW()),
(uuid_generate_v4(), 'departments.create', 'Tạo phòng ban', 'Cho phép tạo phòng ban mới', 'departments', 'organization', true, 31, NOW(), NOW()),
(uuid_generate_v4(), 'departments.view_details', 'Xem chi tiết phòng ban', 'Cho phép xem thông tin chi tiết phòng ban', 'departments', 'organization', true, 32, NOW(), NOW()),
(uuid_generate_v4(), 'departments.update', 'Cập nhật phòng ban', 'Cho phép cập nhật thông tin phòng ban', 'departments', 'organization', true, 33, NOW(), NOW()),
(uuid_generate_v4(), 'departments.delete', 'Xóa phòng ban', 'Cho phép xóa phòng ban', 'departments', 'organization', true, 34, NOW(), NOW()),

(uuid_generate_v4(), 'classes.access', 'Truy cập quản lý lớp học', 'Cho phép truy cập trang quản lý lớp học', 'classes', 'organization', true, 40, NOW(), NOW()),
(uuid_generate_v4(), 'classes.create', 'Tạo lớp học', 'Cho phép tạo lớp học mới', 'classes', 'organization', true, 41, NOW(), NOW()),
(uuid_generate_v4(), 'classes.view_details', 'Xem chi tiết lớp học', 'Cho phép xem thông tin chi tiết lớp học', 'classes', 'organization', true, 42, NOW(), NOW()),
(uuid_generate_v4(), 'classes.update', 'Cập nhật lớp học', 'Cho phép cập nhật thông tin lớp học', 'classes', 'organization', true, 43, NOW(), NOW()),
(uuid_generate_v4(), 'classes.delete', 'Xóa lớp học', 'Cho phép xóa lớp học', 'classes', 'organization', true, 44, NOW(), NOW()),

(uuid_generate_v4(), 'permissions.access', 'Truy cập quản lý quyền', 'Cho phép truy cập trang quản lý quyền', 'permissions', 'system', true, 50, NOW(), NOW()),
(uuid_generate_v4(), 'permissions.create', 'Tạo role/quyền', 'Cho phép tạo role và quyền mới', 'permissions', 'system', true, 51, NOW(), NOW()),
(uuid_generate_v4(), 'permissions.update', 'Cập nhật role/quyền', 'Cho phép cập nhật role và quyền', 'permissions', 'system', true, 52, NOW(), NOW()),
(uuid_generate_v4(), 'permissions.delete', 'Xóa role/quyền', 'Cho phép xóa role và quyền', 'permissions', 'system', true, 53, NOW(), NOW()),
(uuid_generate_v4(), 'permissions.view_details', 'Xem chi tiết role/quyền', 'Cho phép xem thông tin chi tiết role và quyền', 'permissions', 'system', true, 54, NOW(), NOW()),

-- Payment Campaign permissions
(uuid_generate_v4(), 'payment-campaigns.access', 'Truy cập quản lý đóng phí', 'Cho phép truy cập trang quản lý chiến dịch đóng phí', 'payments', 'organization', true, 60, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.create', 'Tạo chiến dịch đóng phí', 'Cho phép tạo chiến dịch đóng phí mới', 'payments', 'organization', true, 61, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.read', 'Xem thông tin chiến dịch đóng phí', 'Cho phép xem thông tin chi tiết chiến dịch đóng phí', 'payments', 'organization', true, 62, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.update', 'Cập nhật chiến dịch đóng phí', 'Cho phép cập nhật thông tin chiến dịch đóng phí', 'payments', 'organization', true, 63, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.delete', 'Xóa chiến dịch đóng phí', 'Cho phép xóa chiến dịch đóng phí', 'payments', 'organization', true, 64, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.manage_assignments', 'Quản lý phân công đóng phí', 'Cho phép phân công và quản lý đối tượng đóng phí', 'payments', 'organization', true, 65, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.view_reports', 'Xem báo cáo đóng phí', 'Cho phép xem báo cáo và thống kê đóng phí', 'payments', 'organization', true, 66, NOW(), NOW()),
(uuid_generate_v4(), 'payment-campaigns.export', 'Xuất báo cáo đóng phí', 'Cho phép xuất báo cáo đóng phí', 'payments', 'organization', true, 67, NOW(), NOW()),

(uuid_generate_v4(), 'my-payments.access', 'Truy cập trang đóng phí của tôi', 'Cho phép truy cập trang xem các khoản phí được phân công cho mình', 'my-payments', 'organization', true, 70, NOW(), NOW())

ON CONFLICT (code) DO NOTHING;

SELECT 'Permissions seeded successfully' as status;
