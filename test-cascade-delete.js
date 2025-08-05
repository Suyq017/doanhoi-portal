// Test script for cascade delete functionality
// Run this in the backend directory: node test-cascade-delete.js

const axios = require('axios');

const baseURL = 'http://localhost:3000/api';

async function testCascadeDelete() {
    try {
        console.log('🧪 Testing cascade delete functionality...\n');

        // 1. Get all roles first
        console.log('1. Getting all roles...');
        const rolesResponse = await axios.get(`${baseURL}/roles`);
        const roles = rolesResponse.data.data;
        console.log(`Found ${roles.length} roles`);

        // Find a non-system role for testing
        const testRole = roles.find(role => !role.isSystemRole);
        if (!testRole) {
            console.log('❌ No non-system roles found for testing');
            return;
        }

        console.log(`\n2. Selected test role: ${testRole.displayName} (${testRole.name})`);

        // 2. Check if role has any user assignments
        try {
            const userRolesResponse = await axios.get(`${baseURL}/roles/${testRole.id}/user-assignments`);
            console.log(`Role has ${userRolesResponse.data.length} user assignments`);
        } catch (error) {
            console.log('Could not check user assignments (endpoint may not exist)');
        }

        // 3. Test single role deletion with cascade
        console.log(`\n3. Testing single role deletion with cascade...`);
        const deleteResponse = await axios.delete(`${baseURL}/roles/${testRole.id}`);
        console.log('✅ Single delete response:', deleteResponse.data);

        // 4. Test bulk deletion (create some test roles first)
        console.log(`\n4. Creating test roles for bulk delete...`);
        const testRoles = [];

        for (let i = 1; i <= 3; i++) {
            const createResponse = await axios.post(`${baseURL}/roles`, {
                name: `test-role-${i}-${Date.now()}`,
                displayName: `Test Role ${i}`,
                description: `Test role ${i} for cascade delete testing`,
                permissionIds: []
            });
            testRoles.push(createResponse.data);
            console.log(`Created test role: ${createResponse.data.displayName}`);
        }

        // 5. Test bulk deletion
        console.log(`\n5. Testing bulk deletion...`);
        const bulkDeleteResponse = await axios.delete(`${baseURL}/roles`, {
            data: { ids: testRoles.map(role => role.id) }
        });

        console.log('✅ Bulk delete response:', bulkDeleteResponse.data);
        console.log('\n🎉 All cascade delete tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.response?.status === 404) {
            console.log('💡 Make sure the backend server is running on port 3000');
        }
    }
}

// Check if running in Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
    testCascadeDelete();
}

module.exports = { testCascadeDelete };
