// Test login và permissions với token mới
const API_BASE_URL = 'http://localhost:9200';

async function testLoginAndPermissions() {
    try {
        // Login để lấy token mới
        console.log('🔐 Logging in...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: "user@gmail.com",
                password: "123456"
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }

        const loginData = await loginResponse.json();
        console.log(`✅ Login successful! User ID: ${loginData.user.id}`);

        // Test permissions với token mới
        console.log('\n🔍 Testing permissions...');
        const permissionsResponse = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${loginData.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!permissionsResponse.ok) {
            const error = await permissionsResponse.text();
            throw new Error(`Permissions API failed: ${error}`);
        }

        const permissionsData = await permissionsResponse.json();
        console.log(`✅ Permissions API response:`, JSON.stringify(permissionsData, null, 2));

        // Test permissions với organizationId
        console.log('\n🏢 Testing permissions with organizationId...');
        const orgPermissionsResponse = await fetch(`${API_BASE_URL}/auth/me/permissions?organizationId=7caebc06-c1b3-4ae8-bd7d-8d7837511341`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${loginData.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (orgPermissionsResponse.ok) {
            const orgPermissionsData = await orgPermissionsResponse.json();
            console.log(`✅ Permissions with org ID:`, JSON.stringify(orgPermissionsData, null, 2));

            if (orgPermissionsData.roles && orgPermissionsData.roles.length > 0) {
                const allPermissions = orgPermissionsData.roles.reduce((acc, role) => {
                    return [...acc, ...role.permissions.map(p => p.code)];
                }, []);

                const uniquePermissions = [...new Set(allPermissions)];
                console.log(`\n📋 Found ${uniquePermissions.length} unique permissions:`);

                const importantPermissions = [
                    'dashboard.access',
                    'users.access',
                    'organizations.access',
                    'classes.access',
                    'departments.access',
                    'permissions.access'
                ];

                importantPermissions.forEach(perm => {
                    const hasPermission = uniquePermissions.includes(perm);
                    console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLoginAndPermissions();
