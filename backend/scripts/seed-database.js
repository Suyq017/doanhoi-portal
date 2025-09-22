#!/usr/bin/env node

/**
 * Database Seeding Script
 * Chạy script này để tạo dữ liệu ban đầu cho hệ thống
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌱 Starting Database Seeding Process...\n');

// Kiểm tra .env file
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found! Please create .env file with database configuration.');
    process.exit(1);
}

console.log('✅ Environment file found');

try {
    // Chạy seeding
    console.log('🔄 Running database seeding...\n');
    execSync('npm run seed', {
        stdio: 'inherit',
        cwd: __dirname
    });

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 What was created:');
    console.log('   ✅ All permissions (dashboard, users, organizations, departments, classes, permissions, payments)');
    console.log('   ✅ All roles (admin)');
    console.log('   ✅ Default users with credentials');
    console.log('   ✅ Default organizations (Đoàn Trường và Hội Sinh viên)');
    console.log('   ✅ User-role assignments');

    console.log('\n🔑 Default Login Credentials:');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ Super Admin                                     │');
    console.log('│   Email: admin@doanhoi.com                 │');
    console.log('│   Password: admin1                      │');
    console.log('│   Role: super_admin (system-wide access)        │');
    console.log('└─────────────────────────────────────────────────┘');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start the backend server: npm run start:dev');
    console.log('   2. Start the frontend: npm run dev (in frontend folder)');
    console.log('   3. Login with any of the credentials above');
    console.log('   4. Test the payment management features');

    console.log('\n📝 Notes:');
    console.log('   - Super Admin has access to ALL permissions including payment management');
    console.log('   - Admin has full access except system-level permissions');
    console.log('   - Manager has limited payment permissions (no delete)');
    console.log('   - You can create more users through the UI after login');

} catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check database connection in .env file');
    console.log('   3. Verify database exists and is accessible');
    console.log('   4. Run "npm install" to ensure dependencies are installed');
    process.exit(1);
}
