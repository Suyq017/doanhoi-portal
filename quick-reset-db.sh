#!/bin/bash

# Quick Reset Database Script for Linux
# Reset database quickly (drop & recreate, then seed)

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
FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-f|--force]"
            exit 1
            ;;
    esac
done

print_color "$BLUE" "⚡ QUICK RESET DATABASE (Linux)"
print_color "$BLUE" "=============================="

# Confirm reset
if ! confirm_action "Thao tác này sẽ XÓA TOÀN BỘ dữ liệu database!"; then
    print_color "$YELLOW" "🚫 Đã hủy"
    exit 0
fi

# Check if Docker is running
if ! docker --version >/dev/null 2>&1; then
    print_color "$RED" "❌ Docker chưa được cài đặt hoặc chưa chạy!"
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    print_color "$RED" "❌ Docker Compose chưa được cài đặt!"
    exit 1
fi

print_color "$GREEN" "✅ Docker và Docker Compose đã sẵn sàng"

print_color "$BLUE" "🗑️  Bước 1: Drop database..."
if $DOCKER_COMPOSE exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS doanhoi;" && \
   $DOCKER_COMPOSE exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"; then
    print_color "$GREEN" "✅ Database đã được tạo lại"
else
    print_color "$RED" "❌ Lỗi khi reset database!"
    exit 1
fi

print_color "$BLUE" "🏗️  Bước 2: Tạo schema..."
cd backend || {
    print_color "$RED" "❌ Không tìm thấy thư mục backend!"
    exit 1
}

if npm run db:create-schema; then
    print_color "$GREEN" "✅ Schema đã được tạo"
else
    print_color "$RED" "❌ Lỗi khi tạo schema!"
    cd ..
    exit 1
fi

print_color "$BLUE" "🌱 Bước 3: Seed lại database..."
if npm run seed; then
    print_color "$GREEN" "✅ Đã seed xong"
else
    print_color "$RED" "❌ Lỗi khi seed!"
    cd ..
    exit 1
fi

cd ..

print_color "$GREEN" "🎉 Hoàn thành! Database đã được reset."
print_color "$YELLOW" "🔑 Login: admin@doanhoi.com / admin1"

print_color "$BLUE" "📋 Thông tin kết nối:"
echo "Database:"
echo "  - Host: localhost"
echo "  - Port: 9000"
echo "  - Database: doanhoi"
echo "  - Username: postgres"
echo "  - Password: password"
echo ""
echo "PgAdmin:"
echo "  - URL: http://localhost:9001"
echo "  - Email: admin@doanhoi.com"
echo "  - Password: admin123"
