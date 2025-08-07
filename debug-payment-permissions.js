// Debug script để kiểm tra permissions của user hiện tại
// Chạy script này trong browser console khi đã đăng nhập

console.log('=== DEBUG USER PERMISSIONS ===');

// Kiểm tra auth context
const authContext = window.React?.getContext ? 'Available' : 'Not Available';
console.log('React Context:', authContext);

// Kiểm tra localStorage
const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
console.log('Auth Token:', token ? 'Present' : 'Missing');

// Kiểm tra current user info từ auth context (nếu có)
try {
    // Thử access auth context qua window object
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('React DevTools available - có thể check component state');
    }

    // Kiểm tra network requests
    console.log('Checking network tab for API calls to /auth/me or /user/profile');

    // Kiểm tra nếu có Redux store
    if (window.__REDUX_STORE__) {
        console.log('Redux Store:', window.__REDUX_STORE__.getState());
    }

} catch (error) {
    console.error('Error accessing debugging info:', error);
}

// Hướng dẫn debug
console.log(`
📋 DEBUG STEPS:

1. Kiểm tra Network tab:
   - Tìm request đến /auth/me, /user/profile, hoặc /permissions
   - Xem response có chứa payment permissions không

2. Kiểm tra React Components:
   - Mở React DevTools
   - Tìm AuthContext hoặc Layout component
   - Xem state/props có permissions array không

3. Kiểm tra Database:
   - User có role nào? (super_admin, admin, manager?)
   - Role đó có permission 'payment-campaigns.access' không?
   - User có user_role assignment cho organization nào không?

4. Test direct permission check:
   - Vào Console
   - Gõ: useAuth() hoặc tương tự để xem auth state

5. Kiểm tra Layout filtering:
   - permissions.isAuthenticated: true/false?
   - permissions.permissionsLoading: true/false?
   - permissions.hasPermission('payment-campaigns.access'): true/false?

🔍 COMMON ISSUES:
- User chưa được assign role
- Role chưa có payment permissions
- Organization context missing
- Permission loading chưa complete
- Token expired/invalid
`);

// Test function để gọi từ console
window.debugPaymentPermissions = function () {
    console.log('User authenticated:', !!token);

    // Thử gọi API để check permissions
    if (token) {
        fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log('User data:', data);
                console.log('User roles:', data.userRoles);
                if (data.userRoles) {
                    data.userRoles.forEach(userRole => {
                        console.log(`Role: ${userRole.role?.name}`, userRole.role?.permissions);
                    });
                }
            })
            .catch(error => {
                console.error('Failed to fetch user data:', error);
            });
    }
};

console.log('💡 Gọi debugPaymentPermissions() để kiểm tra user data từ API');
