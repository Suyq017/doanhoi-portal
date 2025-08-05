// Test script for Grant Roles API
// Run this in browser console or create a separate test file

const testGrantRolesAPI = async () => {
    const API_BASE = 'http://localhost:3000'; // Adjust if needed

    // Test data
    const testData = {
        userId: 'test-user-id',
        roleAssignments: [
            {
                roleIds: ['role-1', 'role-2'],
                organizationIds: ['org-1', 'org-2'],
                isGlobal: false
            },
            {
                roleIds: ['global-role-1'],
                organizationIds: [],
                isGlobal: true
            }
        ]
    };

    try {
        const response = await fetch(`${API_BASE}/roles/grant-roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add authentication headers if needed
                // 'Authorization': 'Bearer YOUR_TOKEN'
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Grant Roles API Success:', result);
        return result;
    } catch (error) {
        console.error('❌ Grant Roles API Error:', error);
        throw error;
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testGrantRolesAPI };
} else if (typeof window !== 'undefined') {
    window.testGrantRolesAPI = testGrantRolesAPI;
}

console.log('Grant Roles API test function loaded. Call testGrantRolesAPI() to test.');
