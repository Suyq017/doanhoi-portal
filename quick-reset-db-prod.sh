#!/bin/bash

# Quick Production Database Reset
# Nhanh gọn cho development trên production server

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

print_title() {
    echo -e "${BLUE}$1${NC}"
}

# Parse force flag
FORCE=false
if [ "$1" = "--force" ]; then
    FORCE=true
fi

print_title "⚡ QUICK PRODUCTION DATABASE RESET"
print_title "=" * 40

if [ "$FORCE" != "true" ]; then
    print_warning "⚠️  Thao tác này sẽ XÓA TOÀN BỘ dữ liệu production!"
    read -p "Tiếp tục? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "🚫 Đã hủy"
        exit 0
    fi
fi

print_status "🗑️  Bước 1: Reset database..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS doanhoi;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"
print_status "✅ Database đã được tạo lại"

print_status "🏗️  Bước 2: Tạo schema..."
# Run create-schema from inside backend container to use Docker network
if docker compose -f docker-compose.prod.yml exec -T backend npm run db:create-schema 2>/dev/null; then
    print_status "✅ Schema đã được tạo từ backend container"
else
    print_warning "⚠️  Thử tạo schema từ host..."
    cd backend
    DB_HOST=doanhoi-postgres-prod \
    DB_PORT=5432 \
    DB_USERNAME=postgres \
    DB_PASSWORD=your_secure_password \
    DB_NAME=doanhoi \
    npm run db:create-schema
    cd ..
fi
print_status "✅ Schema đã được tạo"

print_status "🌱 Bước 3: Seed database..."
# Run seed from inside backend container to use Docker network  
if docker compose -f docker-compose.prod.yml exec -T backend npm run seed 2>/dev/null; then
    print_status "✅ Đã seed từ backend container"
else
    print_warning "⚠️  Thử seed từ host..."
    cd backend
    DB_HOST=doanhoi-postgres-prod \
    DB_PORT=5432 \
    DB_USERNAME=postgres \
    DB_PASSWORD=your_secure_password \
    DB_NAME=doanhoi \
    npm run seed
    cd ..
fi
print_status "✅ Đã seed xong"

print_title "🎉 Hoàn thành! Production database đã được reset."
print_warning "🔑 Login: admin@doanhoi.com / admin1"
print_warning "🌐 URL: https://doanhoi.hcmut.edu.vn"
