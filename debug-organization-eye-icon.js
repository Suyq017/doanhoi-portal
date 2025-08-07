/**
 * Debug Script for Organization Eye Icon Logic
 * 
 * LOGIC HIỂN THỊ ICON CON MẮT (shouldShowDetailLink):
 * 
 * 1. SUPER ADMIN: 
 *    - User có role 'super_admin' HOẶC permission 'system.access_admin'
 *    - Có thể xem TẤT CẢ tổ chức
 * 
 * 2. QUYỀN ACCESS_CHILDREN:
 *    - User có permission 'organizations.access_children'
 *    - Có thể xem các tổ chức con
 * 
 * 3. THÀNH VIÊN TỔ CHỨC:
 *    - User có trong user_organization của tổ chức đó
 *    - isActive = true
 * 
 * 4. KHÔNG HIỂN THỊ KHI:
 *    - Organization là parent organization trong trang hiện tại
 *    - User không thuộc 3 điều kiện trên
 */

// Test cases
const testCases = [
    {
        name: "Super Admin - có thể xem tất cả",
        user: {
            email: "admin@example.com",
            userRoles: [{ name: "super_admin", organizationId: null }],
            permissions: ["system.access_admin"],
            organizations: []
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: true,
        reason: "Super Admin"
    },
    {
        name: "User có quyền access_children",
        user: {
            email: "manager@example.com",
            userRoles: [{ name: "organization_manager", organizationId: "org1" }],
            permissions: ["organizations.access_children"],
            organizations: []
        },
        org: { id: "org2", name: "Đoàn Cơ Sở" },
        expected: true,
        reason: "Access Children Permission"
    },
    {
        name: "Thành viên tổ chức",
        user: {
            email: "member@example.com",
            userRoles: [{ name: "member", organizationId: "org1" }],
            permissions: [],
            organizations: [{ organizationId: "org1", isActive: true }]
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: true,
        reason: "Organization Member"
    },
    {
        name: "Không có quyền",
        user: {
            email: "user@example.com",
            userRoles: [],
            permissions: [],
            organizations: []
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: false,
        reason: "No permission"
    },
    {
        name: "Thành viên không active",
        user: {
            email: "inactive@example.com",
            userRoles: [],
            permissions: [],
            organizations: [{ organizationId: "org1", isActive: false }]
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: false,
        reason: "Inactive membership"
    }
];

// Mock functions để test logic
function mockShouldShowDetailLink(user, org, isCurrentParent = false) {
    // Không hiển thị nếu là parent organization hiện tại
    if (isCurrentParent) {
        return false;
    }

    // 1. Check super admin
    const isSuperAdmin = user.userRoles.some(role => role.name === 'super_admin') ||
        user.permissions.includes('system.access_admin');
    if (isSuperAdmin) {
        return true;
    }

    // 2. Check access_children permission
    if (user.permissions.includes('organizations.access_children')) {
        return true;
    }

    // 3. Check membership
    const isMember = user.organizations.some(userOrg =>
        userOrg.organizationId === org.id && userOrg.isActive
    );
    if (isMember) {
        return true;
    }

    return false;
}

// Run tests
console.log("🧪 TESTING ORGANIZATION EYE ICON LOGIC\n");

testCases.forEach((testCase, index) => {
    const result = mockShouldShowDetailLink(testCase.user, testCase.org);
    const passed = result === testCase.expected;

    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Expected: ${testCase.expected} (${testCase.reason})`);
    console.log(`Actual: ${result}`);
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('---');
});

// Additional logic explanation
console.log(`
📋 SUMMARY:

ICON CON MẮT SẼ HIỂN THỊ KHI:
✅ User là Super Admin (role 'super_admin' hoặc permission 'system.access_admin')
✅ User có permission 'organizations.access_children' 
✅ User là thành viên active của tổ chức đó

ICON CON MẮT SẼ KHÔNG HIỂN THỊ KHI:
❌ Organization là parent organization trong trang hiện tại
❌ User không thuộc các điều kiện trên

TOOLTIP SẼ HIỂN THỊ:
🏷️ "Xem chi tiết tổ chức (Quyền Super Admin)" - nếu là super admin
🏷️ "Xem chi tiết tổ chức (Quyền truy cập tổ chức con)" - nếu có quyền access_children
🏷️ "Xem chi tiết tổ chức (Bạn là thành viên)" - nếu là thành viên
`);
