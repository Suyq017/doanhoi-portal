const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9200';

async function testAuthentication() {
    console.log('🔍 Testing authentication flow after fixing JWT Guard...\n');

    try {
        // Step 1: Login
        console.log('📝 Step 1: Login...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'user@gmail.com',
                password: 'password123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log('🔑 Token received:', loginData.access_token ? 'Yes' : 'No');
        console.log('👤 User ID in response:', loginData.user?.id);
        console.log('📧 Email in response:', loginData.user?.email);

        const token = loginData.access_token;

        // Step 2: Test profile endpoint
        console.log('\n📝 Step 2: Testing /auth/profile...');
        const profileResponse = await fetch(`${BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error(`Profile request failed: ${profileResponse.status} ${profileResponse.statusText}`);
        }

        const profileData = await profileResponse.json();
        console.log('✅ Profile request successful');
        console.log('👤 User ID from profile:', profileData.id);
        console.log('📧 Email from profile:', profileData.email);
        console.log('👥 Roles from profile:', profileData.roles);

        // Step 3: Test permissions endpoint
        console.log('\n📝 Step 3: Testing /auth/me/permissions...');
        const permissionsResponse = await fetch(`${BASE_URL}/auth/me/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!permissionsResponse.ok) {
            throw new Error(`Permissions request failed: ${permissionsResponse.status} ${permissionsResponse.statusText}`);
        }

        const permissionsData = await permissionsResponse.json();
        console.log('✅ Permissions request successful');
        console.log('🔐 Permissions count:', permissionsData.length);
        console.log('🔐 Sample permissions:', permissionsData.slice(0, 3));

        // Step 4: Verify user consistency
        console.log('\n📝 Step 4: Verifying user consistency...');
        const loginUserId = loginData.user?.id;
        const profileUserId = profileData.id;

        if (loginUserId === profileUserId) {
            console.log('✅ User ID is consistent across endpoints');
            console.log('👤 User ID:', loginUserId);
        } else {
            console.log('❌ User ID inconsistency detected!');
            console.log('👤 Login user ID:', loginUserId);
            console.log('👤 Profile user ID:', profileUserId);
        }

        // Check if it's the expected user
        const expectedUserId = '780dba8c-f81f-465f-9900-1faa3506a4ee';
        if (profileUserId === expectedUserId) {
            console.log('✅ User ID matches expected user in database');
        } else {
            console.log('❌ User ID does not match expected user in database');
            console.log('🎯 Expected:', expectedUserId);
            console.log('📥 Actual:', profileUserId);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Wait for server to start
setTimeout(testAuthentication, 3000);
