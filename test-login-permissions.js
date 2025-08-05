// Test login và kiểm tra permissions
const API_BASE_URL = 'http://localhost:9200';

// Test credentials - thử các user có sẵn trong hệ thống
const TEST_CREDENTIALS = [
    { email: 'admin@admin.com', password: 'admin123' },
    { email: 'test@test.com', password: 'test123' },
    { email: 'super@admin.com', password: 'admin' },
    { email: 'user@example.com', password: 'password' }
];

async function testLogin(credentials) {
    try {
        console.log(`\n🧪 Testing login with ${credentials.email}...`);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Login successful for ${credentials.email}`);
            console.log(`User ID: ${data.user.id}`);
            console.log(`User Type: ${data.user.userType}`);
            console.log(`Access Token: ${data.accessToken.substring(0, 30)}...`);

            // Test permissions for this user
            await testUserPermissions(data.user.id, data.accessToken);

            return data;
        } else {
            const error = await response.text();
            console.log(`❌ Login failed for ${credentials.email}: ${error}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Login error for ${credentials.email}: ${error.message}`);
        return null;
    }
}

async function testUserPermissions(userId, token) {
    try {
        console.log(`\n🔐 Testing permissions for user ${userId}...`);

        const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ User has ${data.roles.length} roles`);

            // Flatten all permissions
            const allPermissions = data.roles.reduce((acc, role) => {
                return [...acc, ...role.permissions.map(p => p.code)];
            }, []);

            const uniquePermissions = [...new Set(allPermissions)];
            console.log(`📋 User permissions (${uniquePermissions.length} total):`);

            // Check specific permissions we care about
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

            return data;
        } else {
            const error = await response.text();
            console.log(`❌ Failed to get permissions: ${error}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Permissions error: ${error.message}`);
        return null;
    }
}

async function testAllCredentials() {
    console.log('🔍 Testing login credentials and permissions...\n');

    for (const credentials of TEST_CREDENTIALS) {
        const loginResult = await testLogin(credentials);
        if (loginResult) {
            // Nếu login thành công, dừng test với user này
            break;
        }
    }
}

// Run tests
testAllCredentials();
