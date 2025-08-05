/**
 * Test file for testing the new multi-role assignment functionality
 * Run with: node test-multi-role-assignment.js
 */

// Test data for multiple role assignments
const testCreateUserWithMultipleRoles = {
    // Basic user info
    code: "TEST001",
    familyName: "Nguyễn",
    givenName: "Test User",
    email: "test@example.com",
    phone: "0123456789",
    password: "test123",
    userType: "student",
    membershipStatus: "none",

    // NEW: Multiple role assignments
    roleAssignments: [
        {
            roleId: "role-1-uuid", // Replace with actual role ID
            organizationId: "org-1-uuid", // Replace with actual org ID
            isActive: true
        },
        {
            roleId: "role-2-uuid", // Replace with actual role ID  
            organizationId: "org-2-uuid", // Replace with actual org ID
            isActive: true
        },
        {
            roleId: "role-3-uuid", // Replace with actual role ID
            // organizationId omitted = global role
            isActive: true
        }
    ]
};

// Test data for backward compatibility
const testCreateUserLegacySingle = {
    code: "TEST002",
    familyName: "Trần",
    givenName: "Legacy User",
    email: "legacy@example.com",
    phone: "0987654321",
    userType: "staff",
    membershipStatus: "doan_vien",

    // OLD: Single role assignment (should still work)
    roleId: "role-1-uuid",
    organizationId: "org-1-uuid"
};

// Test data for legacy multiple roles with single org
const testCreateUserLegacyMultiple = {
    code: "TEST003",
    familyName: "Lê",
    givenName: "Legacy Multi User",
    email: "legacy-multi@example.com",
    phone: "0111222333",
    userType: "staff",

    // OLD: Multiple roles with single organization
    roles: ["role-1-uuid", "role-2-uuid"],
    organizationId: "org-1-uuid"
};

// Test validation - should fail
const testInvalidDuplicateRoles = {
    code: "TEST004",
    familyName: "Invalid",
    givenName: "Duplicate Test",
    email: "invalid@example.com",
    phone: "0444555666",

    // Should fail: duplicate role-org combinations
    roleAssignments: [
        {
            roleId: "role-1-uuid",
            organizationId: "org-1-uuid"
        },
        {
            roleId: "role-1-uuid",
            organizationId: "org-1-uuid" // DUPLICATE!
        }
    ]
};

console.log("=== Test Data for Multi-Role Assignment ===");
console.log("1. New Multi-Role Format:", JSON.stringify(testCreateUserWithMultipleRoles, null, 2));
console.log("2. Legacy Single Role:", JSON.stringify(testCreateUserLegacySingle, null, 2));
console.log("3. Legacy Multiple Roles:", JSON.stringify(testCreateUserLegacyMultiple, null, 2));
console.log("4. Invalid Duplicate Test:", JSON.stringify(testInvalidDuplicateRoles, null, 2));

// Instructions for testing
console.log(`
=== Manual Testing Instructions ===

1. Test New Multi-Role Assignment:
   POST /api/users
   Body: testCreateUserWithMultipleRoles
   Expected: Success, user created with 3 role assignments

2. Test Backward Compatibility - Single Role:
   POST /api/users  
   Body: testCreateUserLegacySingle
   Expected: Success, user created with 1 role assignment

3. Test Backward Compatibility - Multiple Roles:
   POST /api/users
   Body: testCreateUserLegacyMultiple  
   Expected: Success, user created with 2 role assignments (same org)

4. Test Validation - Duplicates:
   POST /api/users
   Body: testInvalidDuplicateRoles
   Expected: Error 400 - Duplicate role-organization assignments

5. Database Verification:
   SELECT * FROM user_roles WHERE userId = '<created-user-id>';
   Expected: Correct number of records with proper roleId and organizationId

=== Frontend Testing ===

1. Open CreateUserModal
2. Try adding multiple role-organization pairs
3. Test duplicate detection
4. Test removing assignments
5. Test form validation
6. Submit and verify API call payload
`);

module.exports = {
    testCreateUserWithMultipleRoles,
    testCreateUserLegacySingle,
    testCreateUserLegacyMultiple,
    testInvalidDuplicateRoles
};
