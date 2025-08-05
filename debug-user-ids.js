const axios = require('axios');

async function testUsers() {
    try {
        // Login first
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:9200/auth/login', {
            email: 'user@gmail.com',
            password: 'password123'
        });

        const token = loginResponse.data.accessToken;
        console.log('✅ Login successful!');

        const headers = { Authorization: `Bearer ${token}` };

        // Check both user IDs
        const correctUserId = '780dba8c-f81f-465f-9900-1faa3506a4ee';
        const wrongUserId = 'b1982741-6d51-4c5d-9723-4192eb6d2512';

        console.log('\n🔍 Checking correct user ID from token:');
        try {
            const correctUserResponse = await axios.get(`http://localhost:9200/users/${correctUserId}`, { headers });
            console.log('✅ Correct user exists:', {
                id: correctUserResponse.data.id,
                email: correctUserResponse.data.email,
                isActive: correctUserResponse.data.isActive
            });
        } catch (error) {
            console.log('❌ Correct user not found:', error.response?.status, error.response?.data?.message);
        }

        console.log('\n🔍 Checking wrong user ID being returned:');
        try {
            const wrongUserResponse = await axios.get(`http://localhost:9200/users/${wrongUserId}`, { headers });
            console.log('✅ Wrong user exists:', {
                id: wrongUserResponse.data.id,
                email: wrongUserResponse.data.email,
                isActive: wrongUserResponse.data.isActive
            });
        } catch (error) {
            console.log('❌ Wrong user not found:', error.response?.status, error.response?.data?.message);
        }

        // Check users by email
        console.log('\n🔍 Checking all users with same email:');
        try {
            const allUsersResponse = await axios.get('http://localhost:9200/users?email=user@gmail.com', { headers });
            console.log('📋 Users with same email:', allUsersResponse.data);
        } catch (error) {
            console.log('❌ Failed to get users:', error.response?.status, error.response?.data?.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

testUsers();
