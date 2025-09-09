#!/bin/bash

# Deploy script cho Doanhoi Portal trên CentOS
set -e

echo "�� Bắt đầu deploy Doanhoi Portal..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Kiểm tra Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker không chạy. Vui lòng khởi động Docker!"
    exit 1
fi

print_status "1. Dừng containers cũ (nếu có)..."
docker compose -f docker-compose.prod.yml down || true

print_status "2. Chuẩn bị build backend..."
cd backend
if [ ! -f "package.json" ]; then
    print_error "Không tìm thấy package.json trong backend!"
    exit 1
fi
cd ..

print_status "3. Chuẩn bị build frontend..."
cd frontend
if [ ! -f ".env.production" ]; then
    print_error "Không tìm thấy .env.production trong frontend!"
    exit 1
fi
cp .env.production .env
if [ ! -f "package.json" ]; then
    print_error "Không tìm thấy package.json trong frontend!"
    exit 1
fi
cd ..

print_status "4. Build và khởi động Docker containers..."
print_status "   - Backend sẽ được build từ source code trong container"
print_status "   - Frontend sẽ được build từ source code trong container"
print_status "   - PostgreSQL sẽ sử dụng image có sẵn"

docker compose -f docker-compose.prod.yml up -d --build

print_status "5. Chờ services khởi động..."
sleep 30

print_status "6. Kiểm tra trạng thái services..."

# Kiểm tra PostgreSQL
if docker exec doanhoi-postgres-prod pg_isready -U postgres > /dev/null 2>&1; then
    print_status "✅ PostgreSQL đã sẵn sàng"
else
    print_error "❌ PostgreSQL chưa sẵn sàng"
fi

# Kiểm tra Backend
if curl -f http://localhost:2681/api > /dev/null 2>&1; then
    print_status "✅ Backend đã sẵn sàng tại port 2681"
else
    print_warning "⚠️ Backend có thể vẫn đang khởi động..."
fi

# Kiểm tra Frontend
if curl -f http://localhost:2680 > /dev/null 2>&1; then
    print_status "✅ Frontend đã sẵn sàng tại port 2680"
else
    print_warning "⚠️ Frontend có thể vẫn đang khởi động..."
fi

print_status "7. Hiển thị containers đang chạy:"
docker compose -f docker-compose.prod.yml ps

print_status "🎉 Deploy hoàn tất!"
print_status "📊 Thông tin truy cập:"
print_status "   Frontend: http://localhost:2680"
print_status "   Backend API: http://localhost:2681/api"
print_status "   Domain: https://doanhoi.hcmut.edu.vn (sau khi config nginx)"

print_warning "📝 Bước tiếp theo:"
print_warning "   1. Cấu hình Nginx reverse proxy từ port 443 -> 2680"
print_warning "   2. Kiểm tra firewall cho port 2680, 2681"
print_warning "   3. Kiểm tra SSL certificate"

print_status "📋 Các lệnh hữu ích:"
print_status "   Xem logs: docker compose -f docker-compose.prod.yml logs -f"
print_status "   Restart: docker compose -f docker-compose.prod.yml restart"
print_status "   Stop: docker compose -f docker-compose.prod.yml down"
