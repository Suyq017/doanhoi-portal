#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script reset nhanh database (chỉ data, giữ containers)
.DESCRIPTION  
    Script này sẽ:
    1. Drop và recreate database
    2. Chạy seeding lại
    
    Nhanh hơn script reset-database.ps1 vì không cần tạo lại containers
.EXAMPLE
    .\quick-reset-db.ps1
#>

param([switch]$Force)

# Colors
$Red = "`e[31m"
$Green = "`e[32m" 
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput($ForegroundColor, $Message) {
    $color = switch ($ForegroundColor) {
        "Red" { $Red }
        "Green" { $Green }
        "Yellow" { $Yellow }
        "Blue" { $Blue }
        default { $Reset }
    }
    Write-Host "$color$Message$Reset"
}

Write-ColorOutput "Blue" "⚡ QUICK RESET DATABASE"
Write-ColorOutput "Blue" "=" * 30

if (-not $Force) {
    Write-ColorOutput "Yellow" "⚠️  Thao tác này sẽ XÓA TOÀN BỘ dữ liệu database!"
    $confirm = Read-Host "Tiếp tục? (y/N)"
    if ($confirm -notmatch "^[Yy]") {
        Write-ColorOutput "Yellow" "🚫 Đã hủy"
        exit 0
    }
}

Write-ColorOutput "Blue" "🗑️  Bước 1: Drop database..."
try {
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS doanhoi;"
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"
    Write-ColorOutput "Green" "✅ Database đã được tạo lại"
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi reset database!"
    exit 1
}

Write-ColorOutput "Blue" "�️  Bước 2: Tạo schema..."
try {
    Set-Location ".\backend"
    npm run db:create-schema
    Write-ColorOutput "Green" "✅ Schema đã được tạo"
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi tạo schema!"
    exit 1
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Blue" "�� Bước 3: Seed lại database..."
try {
    Set-Location ".\backend"
    npm run seed
    Write-ColorOutput "Green" "✅ Đã seed xong"
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi seed!"
    exit 1
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Green" "🎉 Hoàn thành! Database đã được reset."
Write-ColorOutput "Yellow" "🔑 Login: admin@doanhoi.com / admin1"
