// Test script để kiểm tra API phân quyền
const API_BASE_URL = 'http://localhost:9200';

async function testAuthAPI() {
    console.log('🧪 Testing Auth API...');

    try {
        // Test 1: Kiểm tra endpoint login
        console.log('\n1. Testing login endpoint availability...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'test'
            })
        });

        console.log(`Login endpoint status: ${loginResponse.status}`);
        if (loginResponse.status !== 200) {
            const error = await loginResponse.text();
            console.log(`Login error: ${error}`);
        }

        // Test 2: Kiểm tra endpoint permissions 
        console.log('\n2. Testing permissions endpoint...');
        const permissionsResponse = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token' // Sẽ fail, nhưng kiểm tra endpoint có tồn tại
            }
        });

        console.log(`Permissions endpoint status: ${permissionsResponse.status}`);

        // Test 3: Kiểm tra roles endpoint
        console.log('\n3. Testing roles endpoint...');
        const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`Roles endpoint status: ${rolesResponse.status}`);
        if (rolesResponse.status === 200) {
            const roles = await rolesResponse.json();
            console.log(`Found ${roles.data?.length || 0} roles`);
        }

        console.log('\n✅ API endpoints are accessible');

    } catch (error) {
        console.error('❌ API Test failed:', error.message);
        console.log('\n🔍 Make sure backend is running on http://localhost:9200');
    }
}

async function testFrontendPermissionComponents() {
    console.log('\n🎯 Testing Frontend Permission Components...');

    // Kiểm tra localStorage
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    console.log(`Token in localStorage: ${token ? 'YES' : 'NO'}`);
    console.log(`User in localStorage: ${user ? 'YES' : 'NO'}`);

    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log(`User ID: ${userData.id}`);
            console.log(`User email: ${userData.email}`);
        } catch (e) {
            console.log('Invalid user data in localStorage');
        }
    }
}

// Chạy tests
testAuthAPI();
testFrontendPermissionComponents();
