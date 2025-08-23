#!/bin/bash

# Production deployment script for server deployment

echo "🚀 Starting production deployment for server..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production file with your production environment variables."
    exit 1
fi

# Load environment variables
set -a
source .env.production
set +a

echo "📋 Environment variables loaded from .env.production"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Build services
echo "🔨 Building services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Start backend and database only
echo "🚀 Starting backend and database..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres backend

# Build frontend and copy files
echo "🎨 Building frontend..."
docker-compose -f docker-compose.prod.yml --env-file .env.production run --rm frontend

# Copy built files to deployment location
echo "📂 Copying frontend build files to /opt/doanhoi-portal/frontend/dist/..."
sudo mkdir -p /opt/doanhoi-portal/frontend/dist
sudo cp -r frontend/dist/* /opt/doanhoi-portal/frontend/dist/
sudo chown -R www-data:www-data /opt/doanhoi-portal/frontend/dist

# Restart nginx
echo "🔄 Restarting nginx..."
sudo systemctl restart nginx
sudo systemctl status nginx

echo "⏳ Waiting for backend to start..."
sleep 20

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"
echo "🌐 Website available at: https://103.88.121.146"
echo "🔗 Backend API available at: http://localhost:9200"
echo "📊 View backend logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "📊 View nginx logs: sudo tail -f /var/log/nginx/access.log"
