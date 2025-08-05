// Test script để debug Combobox trong CreateUserModal
// Mở console trong browser và chạy script này

console.log('=== DEBUGGING COMBOBOX IN CREATE MODAL ===');

// Test 1: Kiểm tra Combobox có được render không
function testComboboxRender() {
    console.log('\n1. Testing Combobox render...');
    const roleCombobox = document.querySelector('[data-testid="role-combobox"]') ||
        document.querySelector('input[placeholder*="vai trò"]') ||
        document.querySelector('input[placeholder*="role"]');

    const orgCombobox = document.querySelector('[data-testid="org-combobox"]') ||
        document.querySelector('input[placeholder*="tổ chức"]') ||
        document.querySelector('input[placeholder*="organization"]');

    console.log('Role Combobox found:', !!roleCombobox);
    console.log('Org Combobox found:', !!orgCombobox);

    if (roleCombobox) {
        console.log('Role input value:', roleCombobox.value);
        console.log('Role input placeholder:', roleCombobox.placeholder);
    }

    if (orgCombobox) {
        console.log('Org input value:', orgCombobox.value);
        console.log('Org input placeholder:', orgCombobox.placeholder);
    }

    return { roleCombobox, orgCombobox };
}

// Test 2: Simulate click và check dropdown
function testDropdownOpen(combobox, type) {
    console.log(`\n2. Testing ${type} dropdown open...`);
    if (!combobox) {
        console.log(`${type} combobox not found!`);
        return;
    }

    // Click vào input để mở dropdown
    combobox.click();
    combobox.focus();

    setTimeout(() => {
        const dropdown = document.querySelector('[data-testid="combobox-dropdown"]') ||
            document.querySelector('.absolute.z-50') ||
            document.querySelector('.fixed.z-\\[10000\\]');

        console.log(`${type} dropdown opened:`, !!dropdown);

        if (dropdown) {
            const options = dropdown.querySelectorAll('button[type="button"]');
            console.log(`${type} options count:`, options.length);

            if (options.length > 0) {
                console.log(`First ${type} option text:`, options[0].textContent.trim());

                // Simulate click on first option
                console.log(`Simulating click on first ${type} option...`);
                options[0].click();

                setTimeout(() => {
                    console.log(`${type} input value after selection:`, combobox.value);
                }, 100);
            }
        }
    }, 100);
}

// Test 3: Check React component state
function testReactState() {
    console.log('\n3. Testing React component state...');

    // Try to find React fiber node
    const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
    if (modal) {
        const reactFiber = Object.keys(modal).find(key =>
            key.startsWith('__reactFiber') || key.startsWith('__reactInternalFiber')
        );

        if (reactFiber) {
            console.log('React fiber found, trying to access state...');
            try {
                let current = modal[reactFiber];
                while (current && !current.memoizedState) {
                    current = current.return;
                }
                if (current && current.memoizedState) {
                    console.log('Component state found:', current.memoizedState);
                }
            } catch (e) {
                console.log('Could not access React state:', e.message);
            }
        }
    }
}

// Main test function
function runComboboxTest() {
    console.log('Starting Combobox test...');

    const { roleCombobox, orgCombobox } = testComboboxRender();

    if (roleCombobox) {
        testDropdownOpen(roleCombobox, 'Role');
    }

    setTimeout(() => {
        if (orgCombobox) {
            testDropdownOpen(orgCombobox, 'Organization');
        }
    }, 1000);

    testReactState();
}

// Auto-run test if CreateUserModal is open
if (document.querySelector('h2')?.textContent?.includes('Tạo') ||
    document.querySelector('h2')?.textContent?.includes('Create')) {
    console.log('CreateUserModal detected, running test...');
    runComboboxTest();
} else {
    console.log('CreateUserModal not found. Please open CreateUserModal first, then run: runComboboxTest()');
}

// Export for manual use
window.runComboboxTest = runComboboxTest;
window.testComboboxRender = testComboboxRender;
