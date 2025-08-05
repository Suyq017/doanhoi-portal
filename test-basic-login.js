const fetch = require('node-fetch');

async function testLogin() {
    console.log('🔍 Testing basic login endpoint...');

    try {
        const response = await fetch('http://localhost:9200/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'user@gmail.com',
                password: 'password123'
            })
        });

        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.text();
        console.log('Response body:', data);

        if (response.ok) {
            const jsonData = JSON.parse(data);
            console.log('✅ Login successful');
            console.log('Token received:', !!jsonData.access_token);
        } else {
            console.log('❌ Login failed');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLogin();
