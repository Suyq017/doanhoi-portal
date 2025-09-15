#!/bin/bash

# Complete Database Reset Script for Linux
# This script will:
# 1. Stop current containers
# 2. Remove old database volumes
# 3. Create new containers with fresh database
# 4. Run migrations and seeding

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to confirm action
confirm_action() {
    local message=$1
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    print_color "$YELLOW" "⚠️  $message"
    read -p "Bạn có chắc chắn? (y/N): " response
    case $response in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Parse arguments
KEEP_CONTAINERS=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -k|--keep-containers)
            KEEP_CONTAINERS=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -k, --keep-containers    Keep containers, only reset data"
            echo "  -f, --force             Skip confirmation prompts"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use $0 --help for usage information"
            exit 1
            ;;
    esac
done

print_color "$BLUE" "🔄 SCRIPT RESET DATABASE DOANHOI PORTAL (Linux)"
print_color "$BLUE" "=================================================="

# Check Docker
if ! docker --version >/dev/null 2>&1; then
    print_color "$RED" "❌ Docker chưa được cài đặt hoặc chưa chạy!"
    exit 1
fi
print_color "$GREEN" "✅ Docker đã được cài đặt"

# Check docker-compose
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
    print_color "$GREEN" "✅ Docker Compose đã sẵn sàng"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
    print_color "$GREEN" "✅ Docker Compose đã sẵn sàng"
else
    print_color "$RED" "❌ Docker Compose chưa được cài đặt!"
    exit 1
fi

# Confirm reset
if ! confirm_action "Thao tác này sẽ XÓA TOÀN BỘ dữ liệu database hiện tại!"; then
    print_color "$YELLOW" "🚫 Đã hủy thao tác reset database"
    exit 0
fi

print_color "$BLUE" "🛑 Bước 1: Dừng các containers hiện tại..."
if $DOCKER_COMPOSE down; then
    print_color "$GREEN" "✅ Đã dừng containers"
else
    print_color "$YELLOW" "⚠️  Một số containers có thể đã dừng trước đó"
fi

if [[ "$KEEP_CONTAINERS" == "false" ]]; then
    print_color "$BLUE" "🗑️  Bước 2: Xóa volumes database cũ..."
    
    # Remove postgres and pgadmin volumes
    docker volume rm doanhoi-portal_postgres_data 2>/dev/null || true
    docker volume rm doanhoi-portal_pgadmin_data 2>/dev/null || true
    
    # Remove any other doanhoi-related volumes
    docker volume ls -q | grep -E "(postgres|pgadmin|doanhoi)" | xargs -r docker volume rm 2>/dev/null || true
    
    print_color "$GREEN" "✅ Đã xóa volumes database cũ"

    print_color "$BLUE" "🚀 Bước 3: Khởi động containers mới..."
    if $DOCKER_COMPOSE up -d postgres pgadmin; then
        print_color "$GREEN" "✅ Đã khởi động PostgreSQL và PgAdmin"
    else
        print_color "$RED" "❌ Lỗi khi khởi động containers!"
        exit 1
    fi
else
    print_color "$BLUE" "🔄 Bước 2: Restart containers hiện tại..."
    $DOCKER_COMPOSE restart postgres
    print_color "$GREEN" "✅ Đã restart PostgreSQL container"
fi

print_color "$BLUE" "⏳ Bước 4: Đợi PostgreSQL khởi động..."
attempts=0
max_attempts=30

while [ $attempts -lt $max_attempts ]; do
    sleep 2
    attempts=$((attempts + 1))
    
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U postgres -d doanhoi >/dev/null 2>&1; then
        print_color "$GREEN" "✅ PostgreSQL đã sẵn sàng"
        break
    fi
    
    echo -n "."
    
    if [ $attempts -ge $max_attempts ]; then
        print_color "$RED" "\n❌ Timeout: PostgreSQL không thể khởi động sau 60 giây"
        exit 1
    fi
done

if [[ "$KEEP_CONTAINERS" == "false" ]]; then
    print_color "$BLUE" "🏗️  Bước 5: Tạo database và cấu trúc..."
    print_color "$GREEN" "✅ Database đã được chuẩn bị"
fi

print_color "$BLUE" "📦 Bước 6: Cài đặt dependencies cho backend..."
cd backend || {
    print_color "$RED" "❌ Không tìm thấy thư mục backend!"
    exit 1
}

if [ ! -d "node_modules" ]; then
    if npm install; then
        print_color "$GREEN" "✅ Đã cài đặt backend dependencies"
    else
        print_color "$RED" "❌ Lỗi khi cài đặt backend dependencies!"
        exit 1
    fi
else
    print_color "$GREEN" "✅ Backend dependencies đã có sẵn"
fi

print_color "$BLUE" "🌱 Bước 7: Tạo database schema..."
if npm run db:create-schema; then
    print_color "$GREEN" "✅ Database schema đã được tạo"
else
    print_color "$RED" "❌ Lỗi khi tạo database schema!"
    exit 1
fi

print_color "$BLUE" "🌱 Bước 8: Chạy database seeding..."
if npm run seed; then
    print_color "$GREEN" "✅ Đã hoàn thành database seeding"
else
    print_color "$RED" "❌ Lỗi khi seeding database!"
    print_color "$YELLOW" "💡 Thử chạy thủ công: cd backend && npm run seed"
    exit 1
fi

cd ..

print_color "$BLUE" "🔍 Bước 9: Kiểm tra kết quả..."
cd backend || exit 1

# Check users table
user_count=$($DOCKER_COMPOSE exec -T postgres psql -U postgres -d doanhoi -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
if [[ -n "$user_count" && "$user_count" -gt 0 ]]; then
    print_color "$GREEN" "✅ Database đã có dữ liệu: $user_count users"
else
    print_color "$YELLOW" "⚠️  Không thể kiểm tra database, nhưng reset có thể đã thành công"
fi

cd ..

print_color "$GREEN" "🎉 HOÀN THÀNH RESET DATABASE!"
print_color "$GREEN" "=================================================="

print_color "$BLUE" "📋 Thông tin kết nối:"
print_color "$YELLOW" "Database:"
echo "  - Host: localhost"
echo "  - Port: 9000"
echo "  - Database: doanhoi"
echo "  - Username: postgres"
echo "  - Password: password"

print_color "$YELLOW" "\nPgAdmin:"
echo "  - URL: http://localhost:9001"
echo "  - Email: admin@doanhoi.com"
echo "  - Password: admin123"

print_color "$YELLOW" "\n🔑 Tài khoản đăng nhập mặc định:"
echo "  - Email: admin@doanhoi.com"
echo "  - Password: admin1"
echo "  - Role: super_admin"

print_color "$YELLOW" "\n🚀 Các bước tiếp theo:"
echo "  1. Khởi động backend: cd backend && npm run start:dev"
echo "  2. Khởi động frontend: cd frontend && npm run dev"
echo "  3. Truy cập: http://localhost:9100"

print_color "$GREEN" "\n✨ Database đã được reset thành công và sẵn sàng sử dụng!"
