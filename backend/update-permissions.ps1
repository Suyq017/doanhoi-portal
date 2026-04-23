# PowerShell script to update permissions and sync super_admin role
# This script will run the consolidated permissions update flow

Write-Host "🚀 Starting permissions and role update..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Update permissions
Write-Host "📝 Running permissions update..." -ForegroundColor Yellow
npm run update:permissions

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to update permissions!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Permissions updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ All updates completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   - Permissions database updated"
Write-Host "   - super_admin role synced with latest permissions"
Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
