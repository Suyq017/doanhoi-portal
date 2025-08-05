// Test login với user hiện có
const API_BASE_URL = 'http://localhost:9200';

async function testSpecificLogin() {
    // User có vẻ có refresh token, tức là đã login trước đó
    const credentials = {
        email: "user@gmail.com",
        password: "123456" // Thử password phổ biến
    };

    console.log(`🧪 Testing login with ${credentials.email}...`);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Login successful!`);
            console.log(`User ID: ${data.user.id}`);
            console.log(`Access Token: ${data.accessToken.substring(0, 30)}...`);

            // Test permissions
            await testUserPermissions(data.user.id, data.accessToken);

        } else {
            const error = await response.text();
            console.log(`❌ Login failed: ${error}`);

            // Thử password khác
            const otherPasswords = ["password", "admin", "123", "12345", "user123"];
            for (const pwd of otherPasswords) {
                console.log(`🔄 Trying password: ${pwd}`);
                const testResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: credentials.email,
                        password: pwd
                    })
                });

                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    console.log(`✅ Login successful with password: ${pwd}`);
                    await testUserPermissions(testData.user.id, testData.accessToken);
                    return;
                }
            }
        }
    } catch (error) {
        console.log(`❌ Login error: ${error.message}`);
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
                console.log(`📂 Role: ${role.name} (${role.permissions.length} permissions)`);
                return [...acc, ...role.permissions.map(p => p.code)];
            }, []);

            const uniquePermissions = [...new Set(allPermissions)];
            console.log(`\n📋 User permissions (${uniquePermissions.length} total):`);

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

// Run test
testSpecificLogin();
