// Debug script for Grant Roles Modal
// Open browser console and run this to test modal functionality

console.log('=== Testing Grant Roles Modal ===');

// Function to test modal opening
function testModalOpen() {
    const grantButton = document.querySelector('[data-testid="grant-roles-btn"]') ||
        document.querySelector('button:contains("Phân quyền")') ||
        Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent.includes('Phân quyền') ||
            btn.textContent.includes('Grant')
        );

    if (grantButton) {
        console.log('Found grant roles button:', grantButton);
        grantButton.click();
        setTimeout(() => {
            testModalContent();
        }, 500);
    } else {
        console.log('Grant roles button not found');
    }
}

// Function to test modal content
function testModalContent() {
    const modal = document.querySelector('[role="dialog"]') ||
        document.querySelector('.modal') ||
        document.querySelector('[data-testid="grant-roles-modal"]');

    if (modal) {
        console.log('Modal found:', modal);

        // Test organization combobox
        const orgCombobox = modal.querySelector('input[placeholder*="tổ chức"]') ||
            modal.querySelector('input[placeholder*="organization"]');

        if (orgCombobox) {
            console.log('Organization combobox found:', orgCombobox);
            orgCombobox.click();

            setTimeout(() => {
                const dropdown = document.querySelector('[data-testid="org-dropdown"]') ||
                    document.querySelector('.absolute.bg-white.border') ||
                    document.querySelector('[style*="position: fixed"]');

                if (dropdown) {
                    console.log('Organization dropdown found:', dropdown);
                    const options = dropdown.querySelectorAll('button, li');
                    console.log('Available organization options:', options.length);

                    if (options.length > 0) {
                        console.log('Clicking first organization option...');
                        options[0].click();
                    }
                } else {
                    console.log('Organization dropdown not found');
                }
            }, 300);
        } else {
            console.log('Organization combobox not found');
        }
    } else {
        console.log('Modal not found');
    }
}

// Start test
testModalOpen();
