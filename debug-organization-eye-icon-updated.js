/**
 * Debug Script for Organization Eye Icon Logic - UPDATED VERSION
 * 
 * LOGIC HIỂN THỊ ICON CON MẮT (shouldShowDetailLink) - CẢI TIẾN:
 * 
 * 1. SUPER ADMIN: 
 *    - User có role 'super_admin' HOẶC permission 'system.access_admin'
 *    - Có thể xem TẤT CẢ tổ chức
 * 
 * 2. QUYỀN ACCESS_CHILDREN CHO TỔ CHỨC CỤ THỂ:
 *    - User có permission 'organizations.access_children' cho tổ chức này
 *    - KHÔNG phải quyền tổng quát mà phải cho từng tổ chức
 * 
 * 3. THÀNH VIÊN TỔ CHỨC:
 *    - User có trong user_organization của tổ chức đó
 *    - isActive = true
 * 
 * 4. KHÔNG HIỂN THỊ KHI:
 *    - Organization là parent organization trong trang hiện tại
 *    - User không thuộc 3 điều kiện trên
 */

// Test cases với organization-specific permissions
const testCases = [
    {
        name: "Super Admin - có thể xem tất cả",
        user: {
            email: "admin@example.com",
            userRoles: [{ name: "super_admin", organizationId: null }],
            permissions: ["system.access_admin"],
            organizations: [],
            organizationPermissions: {}
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: true,
        reason: "Super Admin"
    },
    {
        name: "User có quyền access_children cho tổ chức này",
        user: {
            email: "manager@example.com",
            userRoles: [{ name: "organization_manager", organizationId: "org1" }],
            permissions: [],
            organizations: [],
            organizationPermissions: {
                "org2": ["organizations.access_children"] // Có quyền cho org2
            }
        },
        org: { id: "org2", name: "Đoàn Cơ Sở" },
        expected: true,
        reason: "Access Children Permission for this organization"
    },
    {
        name: "User có quyền access_children nhưng không phải cho tổ chức này",
        user: {
            email: "manager2@example.com",
            userRoles: [{ name: "organization_manager", organizationId: "org1" }],
            permissions: [],
            organizations: [],
            organizationPermissions: {
                "org1": ["organizations.access_children"] // Có quyền cho org1
            }
        },
        org: { id: "org2", name: "Đoàn Cơ Sở" }, // Nhưng đang check org2
        expected: false,
        reason: "No permission for this specific organization"
    },
    {
        name: "Thành viên tổ chức",
        user: {
            email: "member@example.com",
            userRoles: [{ name: "member", organizationId: "org1" }],
            permissions: [],
            organizations: [{ organizationId: "org1", isActive: true }],
            organizationPermissions: {}
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: true,
        reason: "Organization Member"
    },
    {
        name: "Không có quyền gì",
        user: {
            email: "user@example.com",
            userRoles: [],
            permissions: [],
            organizations: [],
            organizationPermissions: {}
        },
        org: { id: "org1", name: "Đoàn Trường" },
        expected: false,
        reason: "No permission"
    }
];

// Mock functions để test logic mới
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

    // 2. Check access_children permission FOR THIS SPECIFIC ORGANIZATION
    const hasAccessChildrenForThisOrg = user.organizationPermissions &&
        user.organizationPermissions[org.id] &&
        user.organizationPermissions[org.id].includes('organizations.access_children');
    if (hasAccessChildrenForThisOrg) {
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
console.log("🧪 TESTING ORGANIZATION EYE ICON LOGIC - UPDATED VERSION\n");

testCases.forEach((testCase, index) => {
    const result = mockShouldShowDetailLink(testCase.user, testCase.org);
    const passed = result === testCase.expected;

    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Expected: ${testCase.expected} (${testCase.reason})`);
    console.log(`Actual: ${result}`);
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (!passed) {
        console.log(`❗ Test failed! Expected ${testCase.expected} but got ${result}`);
    }
    console.log('---');
});

// Additional logic explanation
console.log(`
📋 SUMMARY - CẢI TIẾN:

ICON CON MẮT SẼ HIỂN THỊ KHI:
✅ User là Super Admin (role 'super_admin' hoặc permission 'system.access_admin')
✅ User có permission 'organizations.access_children' CHỈ CHO TỔ CHỨC NÀY CỤ THỂ
✅ User là thành viên active của tổ chức đó

ICON CON MẮT SẼ KHÔNG HIỂN THỊ KHI:
❌ Organization là parent organization trong trang hiện tại
❌ User không thuộc các điều kiện trên
❌ User có quyền access_children nhưng không phải cho tổ chức này

THAY ĐỔI CHÍNH:
🔄 Thay vì kiểm tra quyền 'organizations.access_children' tổng quát
🎯 Giờ kiểm tra quyền này cho từng tổ chức cụ thể bằng hasPermission(permission, organizationId)

TOOLTIP SẼ HIỂN THỊ:
🏷️ "Xem chi tiết tổ chức (Quyền Super Admin)" - nếu là super admin
🏷️ "Xem chi tiết tổ chức (Quyền truy cập tổ chức này)" - nếu có quyền access_children cho org này
🏷️ "Xem chi tiết tổ chức (Bạn là thành viên)" - nếu là thành viên
`);
