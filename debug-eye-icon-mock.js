// Debug script để test Eye Icon Logic với mock data

console.log('🧪 Debug Eye Icon Logic with Mock Auth Data');

// Mock auth state để test
const mockAuthState = {
    user: {
        id: 'user123',
        name: 'Test User',
        // Test case 1: User có organizations data
        organizations: [
            {
                organizationId: 'org1',
                isActive: true,
                organization: { id: 'org1', name: 'Đoàn Trường' }
            },
            {
                organizationId: 'org2',
                isActive: false, // inactive
                organization: { id: 'org2', name: 'Đoàn Khoa CNTT' }
            },
            {
                organizationId: 'org3',
                isActive: true,
                organization: { id: 'org3', name: 'Chi Đoàn Lớp A' }
            }
        ]
    }
};

// Test organizations
const testOrgs = [
    { id: 'org1', name: 'Đoàn Trường' },
    { id: 'org2', name: 'Đoàn Khoa CNTT' },
    { id: 'org3', name: 'Chi Đoàn Lớp A' },
    { id: 'org4', name: 'Hội Sinh Viên' }
];

// Replicate the logic from OrganizationTreeItem
const isUserInOrganization = (auth, organizationId) => {
    console.log('🔍 Debugging Eye Icon Logic:', {
        orgId: organizationId,
        userId: auth.user?.id,
        userOrganizations: auth.user?.organizations,
        hasOrganizations: !!auth.user?.organizations,
        organizationsLength: auth.user?.organizations?.length || 0
    });

    if (!auth.user?.organizations) {
        console.log('❌ No user organizations found');
        return false;
    }

    const isMember = auth.user.organizations.some(userOrg => {
        console.log('🔍 Checking membership:', {
            userOrgId: userOrg.organizationId,
            targetOrgId: organizationId,
            isActive: userOrg.isActive,
            matches: userOrg.organizationId === organizationId,
            bothActiveAndMatches: userOrg.organizationId === organizationId && userOrg.isActive
        });
        return userOrg.organizationId === organizationId && userOrg.isActive;
    });

    console.log(`👁️ Eye icon should ${isMember ? 'SHOW' : 'HIDE'}`);
    return isMember;
};

const shouldShowDetailLink = (auth, org) => {
    return isUserInOrganization(auth, org.id);
};

// Test all organizations
console.log('\n📊 Test Results:');
console.log('================');

testOrgs.forEach(org => {
    console.log(`\n🏢 Testing: ${org.name} (${org.id})`);
    const shouldShow = shouldShowDetailLink(mockAuthState, org);
    console.log(`Result: ${shouldShow ? '👁️ SHOW EYE ICON' : '❌ HIDE EYE ICON'}`);
});

console.log('\n✅ Expected Results:');
console.log('- org1 (Đoàn Trường): SHOW (active member)');
console.log('- org2 (Đoàn Khoa CNTT): HIDE (inactive member)');
console.log('- org3 (Chi Đoàn Lớp A): SHOW (active member)');
console.log('- org4 (Hội Sinh Viên): HIDE (not member)');

console.log('\n🚀 If this logic works correctly, the same should work in the browser!');
console.log('Check browser console after login to see real user organizations data.');

// Test case: Empty organizations
console.log('\n🧪 Testing with empty organizations:');
const emptyAuthState = { user: { id: 'user456', organizations: [] } };
testOrgs.forEach(org => {
    const shouldShow = shouldShowDetailLink(emptyAuthState, org);
    console.log(`${org.name}: ${shouldShow ? 'SHOW' : 'HIDE'} (should be HIDE)`);
});

// Test case: Null organizations
console.log('\n🧪 Testing with null organizations:');
const nullAuthState = { user: { id: 'user789', organizations: null } };
testOrgs.forEach(org => {
    const shouldShow = shouldShowDetailLink(nullAuthState, org);
    console.log(`${org.name}: ${shouldShow ? 'SHOW' : 'HIDE'} (should be HIDE)`);
});
