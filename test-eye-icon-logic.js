// Test script cho Eye Icon Logic
// Kiểm tra logic mới của shouldShowDetailLink() function

console.log('🧪 Testing Eye Icon Logic - User Organization Membership');

// Mock data để test
const mockUsers = [
    {
        id: 'user1',
        name: 'Nguyễn Văn A',
        organizations: [
            { organizationId: 'org1', isActive: true },
            { organizationId: 'org2', isActive: false }, // inactive
            { organizationId: 'org3', isActive: true }
        ]
    },
    {
        id: 'user2',
        name: 'Trần Thị B',
        organizations: [
            { organizationId: 'org2', isActive: true }
        ]
    },
    {
        id: 'user3',
        name: 'Lê Văn C',
        organizations: [] // không thuộc org nào
    },
    {
        id: 'user4',
        name: 'Phạm Thị D',
        organizations: null // null organizations
    }
];

const mockOrganizations = [
    { id: 'org1', name: 'Đoàn Trường' },
    { id: 'org2', name: 'Đoàn Khoa CNTT' },
    { id: 'org3', name: 'Chi Đoàn Lớp A' },
    { id: 'org4', name: 'Hội Sinh Viên' }
];

// Test function implementation
const isUserInOrganization = (user, organizationId) => {
    if (!user?.organizations) return false;

    return user.organizations.some(userOrg =>
        userOrg.organizationId === organizationId && userOrg.isActive
    );
};

const shouldShowDetailLink = (user, organizationId) => {
    // ĐIỀU KIỆN DUY NHẤT: User có trong user_organization của tổ chức này
    return isUserInOrganization(user, organizationId);
};

// Test cases
console.log('\n📊 Test Results:');
console.log('================');

mockUsers.forEach(user => {
    console.log(`\n👤 User: ${user.name} (${user.id})`);

    mockOrganizations.forEach(org => {
        const shouldShow = shouldShowDetailLink(user, org.id);
        const membership = user.organizations?.find(uo => uo.organizationId === org.id);

        console.log(`  🏢 ${org.name}: ${shouldShow ? '👁️ SHOW' : '❌ HIDE'} ${membership ? `(member, active: ${membership.isActive})` : '(not member)'
            }`);
    });
});

console.log('\n✅ Test Summary:');
console.log('- User1: Should see eye icon for org1, org3 (active memberships)');
console.log('- User2: Should see eye icon for org2 only');
console.log('- User3: Should not see any eye icons (no organizations)');
console.log('- User4: Should not see any eye icons (null organizations)');

console.log('\n🎯 Expected Behavior:');
console.log('Eye icon chỉ hiển thị khi:');
console.log('1. User có record trong user_organization table cho org đó');
console.log('2. isActive = true');
console.log('3. Không cần kiểm tra roles, permissions, level hay page context');
