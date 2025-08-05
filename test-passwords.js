const fetch = require('node-fetch');

const passwords = [
    'password123',
    'password',
    '123456',
    'admin',
    'user',
    'test',
    'doanhoi',
    '111111',
    'doan-hoi',
    'Doanhoi@123'
];

async function testPasswords() {
    console.log('🔍 Testing different passwords for user@gmail.com...\n');

    for (const password of passwords) {
        try {
            console.log(`Testing password: "${password}"`);

            const response = await fetch('http://localhost:9200/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'user@gmail.com',
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCCESS! Password "${password}" works!`);
                console.log('User ID:', data.user?.id);
                console.log('Email:', data.user?.email);
                console.log('Token received:', !!data.accessToken);
                return password;
            } else {
                console.log(`❌ Failed with password: "${password}"`);
            }

        } catch (error) {
            console.error(`❌ Error testing password "${password}":`, error.message);
        }
    }

    console.log('\n❌ None of the tested passwords worked');
    return null;
}

testPasswords();
