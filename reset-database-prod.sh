#!/bin/bash

# Production Database Reset Script for Doanhoi Portal
# CẢNH BÁO: Script này sẽ XÓA TOÀN BỘ dữ liệu production!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_title() {
    echo -e "${BLUE}$1${NC}"
}

# Parse arguments
FORCE=false
KEEP_CONTAINERS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --keep-containers)
            KEEP_CONTAINERS=true
            shift
            ;;
        *)
            echo "Usage: $0 [--force] [--keep-containers]"
            echo "  --force: Không cần xác nhận"
            echo "  --keep-containers: Giữ containers, chỉ reset data"
            exit 1
            ;;
    esac
done

print_title "🔄 PRODUCTION DATABASE RESET - DOANHOI PORTAL"
print_title "=" * 50

# Xác nhận nguy hiểm
if [ "$FORCE" != "true" ]; then
    print_error "⚠️  CẢNH BÁO NGHIÊM TRỌNG!"
    print_error "Script này sẽ XÓA TOÀN BỘ dữ liệu PRODUCTION!"
    print_error "Điều này bao gồm:"
    print_error "  - Tất cả users"
    print_error "  - Tất cả organizations" 
    print_error "  - Tất cả permissions và roles"
    print_error "  - Tất cả dữ liệu ứng dụng"
    echo
    read -p "Bạn có CHẮC CHẮN muốn tiếp tục? Gõ 'DELETE ALL DATA' để xác nhận: " confirm
    
    if [ "$confirm" != "DELETE ALL DATA" ]; then
        print_warning "🚫 Đã hủy thao tác reset database"
        exit 0
    fi
fi

# Kiểm tra Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker không chạy!"
    exit 1
fi

print_status "✅ Docker đã sẵn sàng"

print_status "🛑 Bước 1: Dừng services..."
if [ "$KEEP_CONTAINERS" != "true" ]; then
    docker compose -f docker-compose.prod.yml down
    print_status "✅ Đã dừng tất cả production services"
else
    docker compose -f docker-compose.prod.yml stop backend frontend
    print_status "✅ Đã dừng backend và frontend, giữ database"
fi

if [ "$KEEP_CONTAINERS" != "true" ]; then
    print_status "🗑️  Bước 2: Xóa volumes database cũ..."
    
    # Xóa volumes production
    docker volume rm doanhoi-portal_postgres_data_prod 2>/dev/null || true
    docker volume rm doanhoi-portal_pgadmin_data_prod 2>/dev/null || true
    
    # Xóa tất cả volumes liên quan
    docker volume ls -q | grep -E "(doanhoi|postgres|pgadmin).*prod" | xargs -r docker volume rm
    
    print_status "✅ Đã xóa volumes database cũ"
    
    print_status "🚀 Bước 3: Khởi động PostgreSQL mới..."
    docker compose -f docker-compose.prod.yml up -d postgres pgadmin
    print_status "✅ Đã khởi động PostgreSQL production"
else
    print_status "🔄 Bước 2: Reset database trong container hiện tại..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS doanhoi;"
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"
    print_status "✅ Database đã được reset"
fi

print_status "⏳ Bước 4: Đợi PostgreSQL khởi động..."
attempts=0
max_attempts=30

while [ $attempts -lt $max_attempts ]; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres -d doanhoi >/dev/null 2>&1; then
        print_status "✅ PostgreSQL production đã sẵn sàng"
        break
    fi
    
    echo -n "."
    sleep 2
    attempts=$((attempts + 1))
done

if [ $attempts -eq $max_attempts ]; then
    print_error "❌ Timeout: PostgreSQL không thể khởi động sau 60 giây"
    exit 1
fi

print_status "📦 Bước 5: Chuẩn bị Node.js dependencies..."
if [ ! -d "backend/node_modules" ]; then
    print_status "Cài đặt backend dependencies..."
    cd backend && npm ci --production && cd ..
    print_status "✅ Backend dependencies đã sẵn sàng"
else
    print_status "✅ Backend dependencies đã có sẵn"
fi

print_status "🏗️  Bước 6: Tạo database schema..."
cd backend

# Tạo schema với production config
DB_HOST=localhost \
DB_PORT=2679 \
DB_USERNAME=postgres \
DB_PASSWORD=your_secure_password \
DB_NAME=doanhoi \
npm run db:create-schema

print_status "✅ Database schema đã được tạo"
cd ..

print_status "🌱 Bước 7: Seed database với dữ liệu production..."
cd backend

# Seed với production config  
DB_HOST=localhost \
DB_PORT=2679 \
DB_USERNAME=postgres \
DB_PASSWORD=your_secure_password \
DB_NAME=doanhoi \
npm run seed

print_status "✅ Database seeding hoàn tất"
cd ..

print_status "🔍 Bước 8: Kiểm tra kết quả..."
user_count=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d doanhoi -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
org_count=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d doanhoi -t -c "SELECT COUNT(*) FROM organizations;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$user_count" -gt 0 ] && [ "$org_count" -gt 0 ]; then
    print_status "✅ Database kiểm tra OK: $user_count users, $org_count organizations"
else
    print_warning "⚠️  Database có thể chưa được seed đúng"
fi

if [ "$KEEP_CONTAINERS" != "true" ]; then
    print_status "🚀 Bước 9: Khởi động lại toàn bộ production stack..."
    docker compose -f docker-compose.prod.yml up -d
    print_status "✅ Production stack đã được khởi động"
else
    print_status "🚀 Bước 9: Khởi động lại backend và frontend..."
    docker compose -f docker-compose.prod.yml up -d backend frontend
    print_status "✅ Backend và frontend đã được khởi động"
fi

print_title "🎉 HOÀN THÀNH RESET PRODUCTION DATABASE!"
print_title "=" * 50

print_status "📋 Thông tin kết nối Production:"
print_warning "Database:"
echo "  - Host: localhost"
echo "  - Port: 2679"
echo "  - Database: doanhoi"
echo "  - Username: postgres"
echo "  - Password: your_secure_password"

print_warning "Services:"
echo "  - Frontend: http://localhost:2680"
echo "  - Backend API: http://localhost:2681/api"
echo "  - Domain: https://doanhoi.hcmut.edu.vn"

print_warning "🔑 Tài khoản đăng nhập mặc định:"
echo "  - Email: admin@doanhoi.com"
echo "  - Password: admin1"
echo "  - Role: super_admin"

print_warning "🚀 Các bước tiếp theo:"
echo "  1. Kiểm tra services: docker compose -f docker-compose.prod.yml ps"
echo "  2. Xem logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  3. Truy cập ứng dụng: https://doanhoi.hcmut.edu.vn"

print_title "✨ Production database đã được reset thành công!"
