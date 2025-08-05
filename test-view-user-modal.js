/**
 * Test ViewUserModal với userRoles
 * 
 * CÁCH TEST:
 * 1. Chạy backend: npm run start:dev (port 9200)
 * 2. Chạy frontend: npm run dev (port 3000 hoặc 9100)
 * 3. Mở trang Users
 * 4. Click vào nút "Xem" của một user bất kỳ
 * 5. Modal sẽ mở và load chi tiết user
 * 6. Kiểm tra section "Vai trò & Quyền hạn"
 * 
 * EXPECTED BEHAVIOR:
 * - Modal mở và hiển thị loading spinner
 * - Sau khi load xong, hiển thị thông tin user
 * - Section "Vai trò & Quyền hạn" hiển thị:
 *   + Nếu có userRoles: danh sách các role với badge và permissions
 *   + Nếu không có userRoles: "Chưa được gán vai trò nào"
 * 
 * DEBUG:
 * - Mở DevTools Console để xem debug logs:
 *   + "Loading user detail for ID: xxx"
 *   + "Loaded user detail: {object}"
 * - Kiểm tra userDetail.userRoles có data không
 * 
 * TROUBLESHOOTING:
 * - Nếu vẫn hiển thị "Chưa được gán vai trò nào":
 *   1. Kiểm tra console logs xem API có trả về userRoles không
 *   2. Kiểm tra network tab xem request /users/{id} có success không
 *   3. Kiểm tra database có data trong bảng user_roles không
 */

console.log('📝 ViewUserModal Test Guide');
console.log('👆 Đọc comments để biết cách test ViewUserModal với userRoles');

// Test script to verify API
const API_BASE = 'http://localhost:9200';

async function testViewUserModal() {
    try {
        console.log('🧪 Testing ViewUserModal API calls...');

        // Get first user
        const usersResponse = await fetch(`${API_BASE}/users?limit=1`);
        const usersData = await usersResponse.json();

        if (!usersData.users || usersData.users.length === 0) {
            console.log('❌ No users found');
            return;
        }

        const user = usersData.users[0];
        console.log(`📋 Testing with user: ${user.familyName} ${user.givenName} (${user.code})`);

        // Test getUserById API (this is what ViewUserModal calls)
        console.log(`🔍 Calling getUserById API for ID: ${user.id}`);
        const userDetailResponse = await fetch(`${API_BASE}/users/${user.id}`);
        const userDetail = await userDetailResponse.json();

        console.log('✅ getUserById API response:');
        console.log(`   - Name: ${userDetail.familyName} ${userDetail.givenName}`);
        console.log(`   - userRoles: ${userDetail.userRoles ? userDetail.userRoles.length : 'undefined'}`);

        if (userDetail.userRoles && userDetail.userRoles.length > 0) {
            console.log('🔐 User Roles in detail:');
            userDetail.userRoles.forEach((userRole, index) => {
                console.log(`   ${index + 1}. ${userRole.role.displayName}`);
                console.log(`      - Organization: ${userRole.organization?.name || 'System-wide'}`);
                console.log(`      - Permissions: ${userRole.role.permissions?.length || 0}`);
                console.log(`      - Active: ${userRole.isActive && userRole.role.isActive}`);
            });
            console.log('✅ ViewUserModal should show roles correctly!');
        } else {
            console.log('❌ No userRoles in getUserById response - ViewUserModal will show "no roles"');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run test if this script is executed directly
if (typeof window === 'undefined') {
    testViewUserModal();
}
