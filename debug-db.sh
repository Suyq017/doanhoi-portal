#!/bin/bash

echo "🔍 DOANHOI DATABASE DEBUG SCRIPT"
echo "================================"

# Parse environment argument
ENV="dev"
if [ "$1" = "--prod" ] || [ "$1" = "--production" ]; then
    ENV="prod"
    COMPOSE_FILE="docker-compose.prod.yml"
    DB_PORT="2679"
    CONTAINER_PREFIX="prod"
else
    COMPOSE_FILE="docker-compose.yml"
    DB_PORT="9000"
    CONTAINER_PREFIX=""
fi

echo "🎯 Environment: $ENV"
echo "📁 Compose file: $COMPOSE_FILE"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}📋 Kiểm tra Docker containers...${NC}"
docker compose -f $COMPOSE_FILE ps

echo -e "\n${YELLOW}📋 Kiểm tra PostgreSQL logs...${NC}"
docker compose -f $COMPOSE_FILE logs postgres | tail -10

echo -e "\n${YELLOW}📋 Kiểm tra ports...${NC}"
netstat -tlnp | grep $DB_PORT

echo -e "\n${YELLOW}📋 Kiểm tra file .env...${NC}"
if [ -f "backend/.env" ]; then
    echo "✅ File .env exists"
    echo "DB_HOST=$(grep DB_HOST backend/.env || echo 'NOT SET')"
    echo "DB_PORT=$(grep DB_PORT backend/.env || echo 'NOT SET')"
else
    echo "❌ File .env không tồn tại"
    echo "🔧 Tạo file .env từ .env.example..."
    cp backend/.env.example backend/.env
    
    if [ "$ENV" = "prod" ]; then
        echo "🔧 Cập nhật .env cho production..."
        sed -i "s/DB_PORT=9000/DB_PORT=2679/" backend/.env
        sed -i "s/DB_PASSWORD=password/DB_PASSWORD=your_secure_password/" backend/.env
    fi
fi

echo -e "\n${YELLOW}📋 Test kết nối database...${NC}"
if docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL đang chạy${NC}"
    
    echo -e "\n${YELLOW}📋 Kiểm tra database doanhoi...${NC}"
    if docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw doanhoi; then
        echo -e "${GREEN}✅ Database doanhoi đã tồn tại${NC}"
    else
        echo -e "${YELLOW}⚠️  Database doanhoi chưa tồn tại, tạo mới...${NC}"
        docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"
    fi
    
    echo -e "\n${YELLOW}📋 Kiểm tra tables...${NC}"
    table_count=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d doanhoi -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    echo "Tables count: $table_count"
    
else
    echo -e "${RED}❌ PostgreSQL không thể kết nối${NC}"
    echo "🔧 Khởi động lại PostgreSQL..."
    docker compose -f $COMPOSE_FILE restart postgres
    sleep 10
fi

echo -e "\n${YELLOW}📋 Kiểm tra Node.js dependencies...${NC}"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ Node modules đã cài đặt${NC}"
else
    echo -e "${YELLOW}⚠️  Cài đặt Node modules...${NC}"
    cd backend && npm install && cd ..
fi

echo -e "\n${GREEN}🎯 HƯỚNG DẪN TIẾP THEO:${NC}"
if [ "$ENV" = "prod" ]; then
    echo "🏭 PRODUCTION MODE:"
    echo "1. Reset nhanh: ./quick-reset-db-prod.sh"
    echo "2. Reset hoàn toàn: ./reset-database-prod.sh"
    echo "3. Manual schema: cd backend && DB_PORT=2679 npm run db:create-schema"
    echo "4. Manual seed: cd backend && DB_PORT=2679 npm run seed"
else
    echo "🔧 DEVELOPMENT MODE:"
    echo "1. Reset nhanh: ./quick-reset-db.sh"
    echo "2. Reset hoàn toàn: ./reset-database.ps1 (Windows) hoặc ./reset-database.sh"
    echo "3. Manual schema: cd backend && npm run db:create-schema"
    echo "4. Manual seed: cd backend && npm run seed"
fi

echo -e "\n${YELLOW}📝 Usage: ./debug-db.sh [--prod]${NC}"

echo -e "\n6. Environment variables:"
echo "DB_HOST: ${DB_HOST:-localhost}"
echo "DB_PORT: ${DB_PORT:-9000}"
echo "DB_NAME: ${DB_NAME:-doanhoi}"

echo -e "\n7. Manual schema creation (if needed):"
echo "cd backend && npm run db:create-schema"

echo -e "\n8. If still failing, try:"
echo "  - docker-compose restart postgres"
echo "  - docker-compose down && docker-compose up -d"
echo "  - Check .env file in backend directory"
