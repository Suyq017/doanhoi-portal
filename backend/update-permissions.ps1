# PowerShell script to update permissions and super_admin role
# This script will:
# 1. Update all permissions in the database
# 2. Update super_admin role with latest permissions

Write-Host "🚀 Starting permissions and role update..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Update permissions
Write-Host "📝 Step 1/2: Updating permissions..." -ForegroundColor Yellow
npm run update:permissions

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to update permissions!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Permissions updated successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Update super_admin role
Write-Host "👤 Step 2/2: Updating super_admin role..." -ForegroundColor Yellow
npm run update:super-admin

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to update super_admin role!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All updates completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   - Permissions database updated"
Write-Host "   - super_admin role updated with latest permissions"
Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
