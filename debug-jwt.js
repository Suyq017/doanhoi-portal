// Test JWT token payload
const API_BASE_URL = 'http://localhost:9200';

async function debugJWTToken() {
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

        const loginData = await loginResponse.json();
        console.log(`✅ Login successful! User ID: ${loginData.user.id}`);
        console.log(`📧 Email: ${loginData.user.email}`);

        // Decode JWT token để xem payload
        const token = loginData.accessToken;
        const parts = token.split('.');
        if (parts.length === 3) {
            // Decode header và payload
            const headerDecoded = JSON.parse(atob(parts[0]));
            const payloadDecoded = JSON.parse(atob(parts[1]));

            console.log('\n🔍 JWT Header:', JSON.stringify(headerDecoded, null, 2));
            console.log('\n🔍 JWT Payload:', JSON.stringify(payloadDecoded, null, 2));

            // Kiểm tra sub và email
            console.log(`\n📋 Token Analysis:`);
            console.log(`  sub (user ID): ${payloadDecoded.sub}`);
            console.log(`  email: ${payloadDecoded.email}`);
            console.log(`  iat: ${payloadDecoded.iat} (${new Date(payloadDecoded.iat * 1000)})`);
            console.log(`  exp: ${payloadDecoded.exp} (${new Date(payloadDecoded.exp * 1000)})`);

            // So sánh với user từ login response
            const userIdMatch = payloadDecoded.sub === loginData.user.id;
            const emailMatch = payloadDecoded.email === loginData.user.email;

            console.log(`\n🎯 Verification:`);
            console.log(`  ✅ User ID matches: ${userIdMatch ? '✅' : '❌'} (${payloadDecoded.sub} vs ${loginData.user.id})`);
            console.log(`  ✅ Email matches: ${emailMatch ? '✅' : '❌'} (${payloadDecoded.email} vs ${loginData.user.email})`);
        }

        // Test profile endpoint để xem req.user.id 
        console.log('\n👤 Testing /auth/profile endpoint...');
        const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log(`✅ Profile response:`, JSON.stringify({
                id: profileData.id,
                email: profileData.email,
                fullName: profileData.familyName + ' ' + profileData.givenName
            }, null, 2));
        }

        // Test permissions endpoint
        console.log('\n🔐 Testing permissions endpoint...');
        const permissionsResponse = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json();
            console.log(`✅ Permissions response:`, JSON.stringify(permissionsData, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugJWTToken();
