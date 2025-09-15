#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script reset toàn bộ database cho dự án Doanhoi Portal
.DESCRIPTION
    Script này sẽ:
    1. Dừng các containers hiện tại
    2. Xóa volumes database cũ
    3. Tạo lại containers với database mới
    4. Chạy migrations và seeding
.EXAMPLE
    .\reset-database.ps1
    .\reset-database.ps1 -KeepContainers
.PARAMETER KeepContainers
    Giữ containers, chỉ reset data trong database
#>

param(
    [switch]$KeepContainers,
    [switch]$Force
)

# Colors for output
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

function Confirm-Action($Message) {
    if ($Force) { return $true }
    
    Write-ColorOutput "Yellow" "⚠️  $Message"
    $response = Read-Host "Bạn có chắc chắn? (y/N)"
    return $response -match "^[Yy]"
}

Write-ColorOutput "Blue" "🔄 SCRIPT RESET DATABASE DOANHOI PORTAL"
Write-ColorOutput "Blue" "=" * 50

# Kiểm tra Docker
try {
    docker --version | Out-Null
    Write-ColorOutput "Green" "✅ Docker đã được cài đặt"
}
catch {
    Write-ColorOutput "Red" "❌ Docker chưa được cài đặt hoặc chưa chạy!"
    exit 1
}

# Kiểm tra docker-compose
try {
    docker-compose --version | Out-Null
    Write-ColorOutput "Green" "✅ Docker Compose đã sẵn sàng"
}
catch {
    Write-ColorOutput "Red" "❌ Docker Compose chưa được cài đặt!"
    exit 1
}

# Xác nhận reset
if (-not (Confirm-Action "Thao tác này sẽ XÓA TOÀN BỘ dữ liệu database hiện tại!")) {
    Write-ColorOutput "Yellow" "🚫 Đã hủy thao tác reset database"
    exit 0
}

Write-ColorOutput "Blue" "🛑 Bước 1: Dừng các containers hiện tại..."
try {
    docker-compose down
    Write-ColorOutput "Green" "✅ Đã dừng containers"
}
catch {
    Write-ColorOutput "Yellow" "⚠️  Một số containers có thể đã dừng trước đó"
}

if (-not $KeepContainers) {
    Write-ColorOutput "Blue" "🗑️  Bước 2: Xóa volumes database cũ..."
    try {
        # Xóa volumes database
        docker volume rm doanhoi-portal_postgres_data -f 2>$null
        docker volume rm doanhoi-portal_pgadmin_data -f 2>$null
        
        # Xóa volumes theo naming convention khác (nếu có)
        docker volume ls -q | Where-Object { $_ -match "postgres|pgadmin|doanhoi" } | ForEach-Object {
            docker volume rm $_ -f 2>$null
        }
        
        Write-ColorOutput "Green" "✅ Đã xóa volumes database cũ"
    }
    catch {
        Write-ColorOutput "Yellow" "⚠️  Một số volumes có thể không tồn tại"
    }

    Write-ColorOutput "Blue" "🚀 Bước 3: Khởi động containers mới..."
    try {
        docker-compose up -d postgres pgadmin
        Write-ColorOutput "Green" "✅ Đã khởi động PostgreSQL và PgAdmin"
    }
    catch {
        Write-ColorOutput "Red" "❌ Lỗi khi khởi động containers!"
        exit 1
    }
}
else {
    Write-ColorOutput "Blue" "🔄 Bước 2: Restart containers hiện tại..."
    docker-compose restart postgres
    Write-ColorOutput "Green" "✅ Đã restart PostgreSQL container"
}

Write-ColorOutput "Blue" "⏳ Bước 4: Đợi PostgreSQL khởi động..."
$attempts = 0
$maxAttempts = 30

do {
    Start-Sleep -Seconds 2
    $attempts++
    
    try {
        $result = docker-compose exec -T postgres pg_isready -U postgres -d doanhoi 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Green" "✅ PostgreSQL đã sẵn sàng"
            break
        }
    }
    catch {}
    
    Write-Host "." -NoNewline
    
    if ($attempts -ge $maxAttempts) {
        Write-ColorOutput "Red" "`n❌ Timeout: PostgreSQL không thể khởi động sau 60 giây"
        exit 1
    }
} while ($true)

if (-not $KeepContainers) {
    Write-ColorOutput "Blue" "🏗️  Bước 5: Tạo database và cấu trúc..."
    try {
        # Database sẽ được tạo tự động bởi TypeORM migrations
        Write-ColorOutput "Green" "✅ Database đã được chuẩn bị"
    }
    catch {
        Write-ColorOutput "Red" "❌ Lỗi khi tạo database structure!"
        exit 1
    }
}

Write-ColorOutput "Blue" "📦 Bước 6: Cài đặt dependencies cho backend..."
try {
    Set-Location ".\backend"
    
    if (-not (Test-Path "node_modules")) {
        npm install
        Write-ColorOutput "Green" "✅ Đã cài đặt backend dependencies"
    }
    else {
        Write-ColorOutput "Green" "✅ Backend dependencies đã có sẵn"
    }
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi cài đặt backend dependencies!"
    exit 1
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Blue" "🌱 Bước 7: Tạo database schema..."
try {
    Set-Location ".\backend"
    
    # Tạo schema từ entities
    npm run db:create-schema
    Write-ColorOutput "Green" "✅ Database schema đã được tạo"
    
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi tạo database schema!"
    exit 1
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Blue" "🌱 Bước 8: Chạy database seeding..."
try {
    Set-Location ".\backend"
    
    # Chạy seeding script
    npm run seed
    Write-ColorOutput "Green" "✅ Đã hoàn thành database seeding"
    
}
catch {
    Write-ColorOutput "Red" "❌ Lỗi khi seeding database!"
    Write-ColorOutput "Yellow" "💡 Thử chạy thủ công: cd backend && npm run seed"
    exit 1
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Blue" "🔍 Bước 9: Kiểm tra kết quả..."
try {
    Set-Location ".\backend"
    
    # Kiểm tra bảng users
    $userCount = docker-compose exec -T postgres psql -U postgres -d doanhoi -t -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($userCount -and $userCount.Trim() -gt 0) {
        Write-ColorOutput "Green" "✅ Database đã có dữ liệu: $($userCount.Trim()) users"
    }
    
}
catch {
    Write-ColorOutput "Yellow" "⚠️  Không thể kiểm tra database, nhưng reset có thể đã thành công"
}
finally {
    Set-Location ".."
}

Write-ColorOutput "Green" "🎉 HOÀN THÀNH RESET DATABASE!"
Write-ColorOutput "Green" "=" * 50

Write-ColorOutput "Blue" "📋 Thông tin kết nối:"
Write-ColorOutput "Yellow" "Database:"
Write-Host "  - Host: localhost"
Write-Host "  - Port: 9000"
Write-Host "  - Database: doanhoi"
Write-Host "  - Username: postgres"
Write-Host "  - Password: password"

Write-ColorOutput "Yellow" "`nPgAdmin:"
Write-Host "  - URL: http://localhost:9001"
Write-Host "  - Email: admin@doanhoi.com"
Write-Host "  - Password: admin123"

Write-ColorOutput "Yellow" "`n🔑 Tài khoản đăng nhập mặc định:"
Write-Host "  - Email: admin@doanhoi.com"
Write-Host "  - Password: admin1"
Write-Host "  - Role: super_admin"

Write-ColorOutput "Yellow" "`n🚀 Các bước tiếp theo:"
Write-Host "  1. Khởi động backend: cd backend && npm run start:dev"
Write-Host "  2. Khởi động frontend: cd frontend && npm run dev"
Write-Host "  3. Truy cập: http://localhost:9100"

Write-ColorOutput "Green" "`n✨ Database đã được reset thành công và sẵn sàng sử dụng!"
