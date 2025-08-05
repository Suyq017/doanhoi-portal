/**
 * Test script để kiểm tra API user có trả về userRoles không
 */

const API_BASE = 'http://localhost:9200';

async function testUserWithRoles() {
    try {
        // Lấy danh sách users
        console.log('📋 Getting users list...');
        const usersResponse = await fetch(`${API_BASE}/users?limit=1`);
        const usersData = await usersResponse.json();

        if (!usersData.users || usersData.users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }

        const firstUser = usersData.users[0];
        console.log(`✅ Found user: ${firstUser.familyName} ${firstUser.givenName} (${firstUser.code})`);

        // Lấy chi tiết user
        console.log(`📋 Getting user details for ID: ${firstUser.id}...`);
        const userResponse = await fetch(`${API_BASE}/users/${firstUser.id}`);
        const userData = await userResponse.json();

        console.log('👤 User details:');
        console.log(`   - Name: ${userData.familyName} ${userData.givenName}`);
        console.log(`   - Email: ${userData.email}`);
        console.log(`   - Code: ${userData.code}`);
        console.log(`   - UserRoles: ${userData.userRoles ? userData.userRoles.length : 'undefined'} roles`);

        if (userData.userRoles && userData.userRoles.length > 0) {
            console.log('🔐 User Roles:');
            userData.userRoles.forEach((userRole, index) => {
                console.log(`   ${index + 1}. Role: ${userRole.role?.displayName || userRole.role?.name || 'Unknown'}`);
                console.log(`      - ID: ${userRole.id}`);
                console.log(`      - Active: ${userRole.isActive}`);
                console.log(`      - Organization: ${userRole.organization?.name || 'System-wide'}`);
                console.log(`      - Permissions: ${userRole.role?.permissions?.length || 0}`);
                console.log(`      - Assigned At: ${new Date(userRole.assignedAt).toLocaleString('vi-VN')}`);
            });
        } else {
            console.log('❌ No userRoles found in user data');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Chạy test
console.log('🧪 Testing User Roles API...');
testUserWithRoles();
