// Test script để kiểm tra EditUserModal cập nhật vai trò
// Chạy từ browser console khi đang ở trang Users

console.log('=== Test EditUserModal Role Assignment ===');

// Helper function để test API grantRoles
async function testGrantRoles(userId, roleAssignments) {
    try {
        console.log('Testing grantRoles API...');
        console.log('userId:', userId);
        console.log('roleAssignments:', roleAssignments);

        const response = await fetch('/api/roles/grant-roles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any auth headers if needed
            },
            body: JSON.stringify({
                userId,
                roleAssignments
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('API Success:', result);
        return result;

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Helper function để lấy danh sách users
async function getUsers() {
    try {
        const response = await fetch('/api/users?limit=5');
        if (!response.ok) throw new Error('Failed to get users');
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

// Helper function để lấy danh sách roles
async function getRoles() {
    try {
        const response = await fetch('/api/roles/available');
        if (!response.ok) throw new Error('Failed to get roles');
        return await response.json();
    } catch (error) {
        console.error('Error getting roles:', error);
        return [];
    }
}

// Helper function để lấy danh sách organizations
async function getOrganizations() {
    try {
        const response = await fetch('/api/organizations');
        if (!response.ok) throw new Error('Failed to get organizations');
        return await response.json();
    } catch (error) {
        console.error('Error getting organizations:', error);
        return [];
    }
}

// Main test function
async function runTest() {
    try {
        console.log('1. Getting test data...');

        const [users, roles, organizations] = await Promise.all([
            getUsers(),
            getRoles(),
            getOrganizations()
        ]);

        console.log('Users:', users.length);
        console.log('Roles:', roles.length);
        console.log('Organizations:', organizations.length);

        if (users.length === 0 || roles.length === 0) {
            throw new Error('No test data available');
        }

        const testUser = users[0];
        const testRole = roles.find(r => r.isActive) || roles[0];

        console.log('Test user:', testUser.code, testUser.familyName, testUser.givenName);
        console.log('Test role:', testRole.name);

        // Test case 1: Global role assignment
        console.log('\n2. Testing global role assignment...');
        const globalRoleAssignment = [{
            roleIds: [testRole.id],
            organizationIds: [],
            isGlobal: true
        }];

        await testGrantRoles(testUser.id, globalRoleAssignment);

        // Test case 2: Organization-specific role assignment
        if (organizations.length > 0) {
            console.log('\n3. Testing organization-specific role assignment...');
            const orgRoleAssignment = [{
                roleIds: [testRole.id],
                organizationIds: [organizations[0].id],
                isGlobal: false
            }];

            await testGrantRoles(testUser.id, orgRoleAssignment);
        }

        // Test case 3: Multiple role assignments
        if (roles.length > 1) {
            console.log('\n4. Testing multiple role assignments...');
            const multipleRoleAssignments = [
                {
                    roleIds: [testRole.id],
                    organizationIds: [],
                    isGlobal: true
                },
                {
                    roleIds: [roles[1].id],
                    organizationIds: organizations.length > 0 ? [organizations[0].id] : [],
                    isGlobal: organizations.length === 0
                }
            ];

            await testGrantRoles(testUser.id, multipleRoleAssignments);
        }

        console.log('\n✅ All tests passed!');

        // Verify the assignments
        console.log('\n5. Verifying user roles...');
        const verifyResponse = await fetch(`/api/users/${testUser.id}`);
        if (verifyResponse.ok) {
            const userData = await verifyResponse.json();
            console.log('User roles after test:', userData.userRoles?.length || 0);
            userData.userRoles?.forEach((ur, index) => {
                console.log(`  Role ${index + 1}:`, ur.role?.name, ur.organizationId ? `(Org: ${ur.organizationId})` : '(Global)');
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Export test function to window for manual execution
window.testEditUserModal = runTest;

console.log('Test script loaded. Run window.testEditUserModal() to start testing.');
