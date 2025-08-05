const fetch = require('node-fetch');

async function checkUsersEndpoint() {
    console.log('🔍 Checking users endpoint...');

    try {
        // Try to access users endpoint without auth to see if there's any user
        const response = await fetch('http://localhost:9200/users', {
            method: 'GET'
        });

        console.log('Status:', response.status);
        const data = await response.text();
        console.log('Response:', data);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsersEndpoint();
