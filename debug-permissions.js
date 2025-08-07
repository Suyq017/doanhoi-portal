// Debug script để kiểm tra permissions và groups
console.log('=== DEBUGGING PERMISSIONS ===');

// Mock permissions data
const mockPermissions = [
    // Dashboard permissions
    { id: '1', code: 'dashboard.access', name: 'Truy cập bảng điều khiển', category: 'dashboard', context: 'system', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },

    // Users permissions
    { id: '2', code: 'users.access', name: 'Truy cập trang người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '3', code: 'users.create', name: 'Tạo người dùng mới', category: 'users', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '4', code: 'users.read', name: 'Xem thông tin người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '5', code: 'users.update', name: 'Cập nhật thông tin người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '6', code: 'users.delete', name: 'Xóa người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },

    // Organizations permissions
    { id: '7', code: 'organizations.access', name: 'Truy cập trang tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '8', code: 'organizations.create', name: 'Tạo tổ chức mới', category: 'organizations', context: 'system', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '9', code: 'organizations.read', name: 'Xem thông tin tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '10', code: 'organizations.update', name: 'Cập nhật thông tin tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '11', code: 'organizations.delete', name: 'Xóa tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },

    // Departments permissions
    { id: '12', code: 'departments.access', name: 'Truy cập trang đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '13', code: 'departments.create', name: 'Tạo đơn vị mới', category: 'departments', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '14', code: 'departments.read', name: 'Xem thông tin đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '15', code: 'departments.update', name: 'Cập nhật thông tin đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '16', code: 'departments.delete', name: 'Xóa đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },        // Classes permissions
    { id: '17', code: 'classes.access', name: 'Truy cập trang lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '18', code: 'classes.create', name: 'Tạo lớp học mới', category: 'classes', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '19', code: 'classes.read', name: 'Xem thông tin lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '20', code: 'classes.update', name: 'Cập nhật thông tin lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '21', code: 'classes.delete', name: 'Xóa lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },        // Payment campaigns permissions
    { id: '27', code: 'payment-campaigns.access', name: 'Truy cập trang quản lý đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '28', code: 'payment-campaigns.create', name: 'Tạo đợt đóng phí mới', category: 'payments', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '29', code: 'payment-campaigns.read', name: 'Xem thông tin đợt đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '30', code: 'payment-campaigns.update', name: 'Chỉnh sửa đợt đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '31', code: 'payment-campaigns.delete', name: 'Xóa đợt đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
    { id: '32', code: 'payment-campaigns.manage_assignments', name: 'Quản lý phân công thanh toán', category: 'payments', context: 'organization', isActive: true, sortOrder: 6, createdAt: '', updatedAt: '' },
    { id: '33', code: 'payment-campaigns.view_reports', name: 'Xem báo cáo đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 7, createdAt: '', updatedAt: '' },
    { id: '34', code: 'payment-campaigns.export', name: 'Xuất dữ liệu đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 8, createdAt: '', updatedAt: '' },

    // My payments permissions
    { id: '40', code: 'my-payments.access', name: 'Truy cập trang đóng phí của tôi', category: 'my-payments', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    // Permissions permissions
    { id: '35', code: 'permissions.access', name: 'Truy cập trang phân quyền', category: 'permissions', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: '36', code: 'permissions.create', name: 'Tạo vai trò mới', category: 'permissions', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: '37', code: 'permissions.read', name: 'Xem thông tin vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: '38', code: 'permissions.update', name: 'Cập nhật vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: '39', code: 'permissions.delete', name: 'Xóa vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
];

const permissionGroups = [
    {
        id: 'dashboard',
        name: 'Bảng điều khiển',
        icon: 'LayoutDashboard',
        color: 'blue',
        description: 'Bảng điều khiển'
    },
    {
        id: 'users',
        name: 'Người dùng',
        icon: 'Users',
        color: 'green',
        description: 'Người dùng'
    },
    {
        id: 'organizations',
        name: 'Tổ chức',
        icon: 'Building',
        color: 'purple',
        description: 'Tổ chức'
    },
    {
        id: 'departments',
        name: 'Đơn vị',
        icon: 'Building2',
        color: 'orange',
        description: 'Đơn vị'
    },
    {
        id: 'classes',
        name: 'Lớp học',
        icon: 'GraduationCap',
        color: 'red',
        description: 'Lớp học'
    },
    {
        id: 'payments',
        name: 'Quản lý đóng phí',
        icon: 'CreditCard',
        color: 'teal',
        description: 'Quản lý đóng phí'
    },
    {
        id: 'my-payments',
        name: 'Đóng phí của tôi',
        icon: 'CreditCard',
        color: 'emerald',
        description: 'Quản lý các khoản phí được phân công cho tôi'
    },
    {
        id: 'permissions',
        name: 'Phân quyền',
        icon: 'Shield',
        color: 'indigo',
        description: 'Phân quyền'
    }
];

console.log('Total permissions:', mockPermissions.length);
console.log('My-payments permissions:', mockPermissions.filter(p => p.category === 'my-payments'));
console.log('Permission groups:', permissionGroups);
console.log('My-payments group:', permissionGroups.find(g => g.id === 'my-payments'));

// Group permissions
function getGroupPermissions(groupId) {
    return mockPermissions.filter(p => p.category === groupId);
}

console.log('\n=== GROUPS WITH PERMISSIONS ===');
permissionGroups.forEach(group => {
    const groupPerms = getGroupPermissions(group.id);
    console.log(`${group.name} (${group.id}):`, groupPerms.length, 'permissions');
    if (group.id === 'my-payments') {
        console.log('  - Permissions:', groupPerms);
    }
});
