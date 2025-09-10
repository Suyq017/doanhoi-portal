#!/bin/bash

# Script setup nhanh cho CentOS server
# Chạy script này TRƯỚC KHI deploy

echo "🔧 Setup CentOS server cho Doanhoi Portal..."

# Colors
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

# Kiểm tra root permission
if [ "$EUID" -ne 0 ]; then
    print_error "Script này cần chạy với quyền root!"
    exit 1
fi

print_status "1. Cập nhật hệ thống..."
yum update -y

print_status "2. Cài đặt các gói cần thiết..."
yum install -y curl wget git vim nano htop firewalld

print_status "3. Cài đặt Node.js 18..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

print_status "4. Cài đặt Docker..."
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io

print_status "5. Khởi động Docker..."
systemctl start docker
systemctl enable docker

print_status "6. Cài đặt Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

print_status "7. Tạo thư mục dự án..."
mkdir -p /opt/doanhoi-portal
chmod 755 /opt/doanhoi-portal

print_status "8. Cấu hình firewall..."
systemctl start firewalld
systemctl enable firewalld

# Mở port cho ứng dụng
firewall-cmd --permanent --add-port=2680/tcp
firewall-cmd --permanent --add-port=2681/tcp
firewall-cmd --permanent --add-port=2682/tcp
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

print_status "9. Kiểm tra cài đặt..."
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"

print_status "✅ Setup server hoàn tất!"
print_warning "📝 Bước tiếp theo:"
print_warning "   1. Upload source code vào /opt/doanhoi-portal"
print_warning "   2. Chạy script deploy.sh"
print_warning "   3. Cấu hình Nginx reverse proxy"

print_status "📊 Firewall status:"
firewall-cmd --list-all
