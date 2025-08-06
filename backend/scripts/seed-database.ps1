# Database Seeding Script for Windows
# Chạy script này để tạo dữ liệu ban đầu cho hệ thống

Write-Host "🌱 Starting Database Seeding Process..." -ForegroundColor Green
Write-Host ""

# Kiểm tra .env file
$envPath = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found! Please create .env file with database configuration." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green

try {
    # Chạy seeding
    Write-Host "🔄 Running database seeding..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location (Join-Path $PSScriptRoot "..")
    npm run seed

    Write-Host ""
    Write-Host "🎉 Database seeding completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 What was created:" -ForegroundColor Cyan
    Write-Host "   ✅ All permissions (dashboard, users, organizations, departments, classes, permissions, payments)" -ForegroundColor White
    Write-Host "   ✅ All roles (super_admin, admin, manager, editor, viewer)" -ForegroundColor White
    Write-Host "   ✅ Default users with credentials" -ForegroundColor White
    Write-Host "   ✅ Default organization (ROOT)" -ForegroundColor White
    Write-Host "   ✅ User-role assignments" -ForegroundColor White
    
    Write-Host ""
    Write-Host "🔑 Default Login Credentials:" -ForegroundColor Yellow
    Write-Host "┌─────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "│ Super Admin                                     │" -ForegroundColor White
    Write-Host "│   Email: superadmin@doanhoi.com                 │" -ForegroundColor White
    Write-Host "│   Password: SuperAdmin@123                      │" -ForegroundColor White
    Write-Host "│   Role: super_admin (system-wide access)       │" -ForegroundColor White
    Write-Host "├─────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "│ Organization Admin                              │" -ForegroundColor White
    Write-Host "│   Email: admin@doanhoi.com                      │" -ForegroundColor White
    Write-Host "│   Password: Admin@123                           │" -ForegroundColor White
    Write-Host "│   Role: admin (organization access)             │" -ForegroundColor White
    Write-Host "├─────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "│ Manager                                         │" -ForegroundColor White
    Write-Host "│   Email: manager@doanhoi.com                    │" -ForegroundColor White
    Write-Host "│   Password: Manager@123                         │" -ForegroundColor White
    Write-Host "│   Role: manager (limited access)               │" -ForegroundColor White
    Write-Host "└─────────────────────────────────────────────────┘" -ForegroundColor White

    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Start the backend server: npm run start:dev" -ForegroundColor White
    Write-Host "   2. Start the frontend: npm run dev (in frontend folder)" -ForegroundColor White
    Write-Host "   3. Login with any of the credentials above" -ForegroundColor White
    Write-Host "   4. Test the payment management features" -ForegroundColor White

    Write-Host ""
    Write-Host "📝 Notes:" -ForegroundColor Cyan
    Write-Host "   - Super Admin has access to ALL permissions including payment management" -ForegroundColor White
    Write-Host "   - Admin has full access except system-level permissions" -ForegroundColor White
    Write-Host "   - Manager has limited payment permissions (no delete)" -ForegroundColor White
    Write-Host "   - You can create more users through the UI after login" -ForegroundColor White

}
catch {
    Write-Host ""
    Write-Host "❌ Seeding failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🛠️  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Make sure PostgreSQL is running" -ForegroundColor White
    Write-Host "   2. Check database connection in .env file" -ForegroundColor White
    Write-Host "   3. Verify database exists and is accessible" -ForegroundColor White
    Write-Host "   4. Run 'npm install' to ensure dependencies are installed" -ForegroundColor White
    exit 1
}
