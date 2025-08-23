#!/bin/bash

# Manual deployment script for server admin
# Run this script with sudo after GitLab CI completes

DEPLOY_PATH="/opt/doanhoi-portal"
SOURCE_PATH="/home/gitlab-runner/deployment"

echo "🚀 Starting manual deployment from GitLab CI artifacts..."

# Check if artifacts exist
if [ ! -d "$SOURCE_PATH" ]; then
    echo "❌ Error: No deployment artifacts found at $SOURCE_PATH"
    echo "Please run GitLab CI pipeline first"
    exit 1
fi

echo "📋 Found deployment artifacts:"
ls -la $SOURCE_PATH

# Create backup
echo "📦 Creating backup..."
mkdir -p /opt/backups/doanhoi-portal
cp -r $DEPLOY_PATH /opt/backups/doanhoi-portal/backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No existing deployment to backup"

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p $DEPLOY_PATH/backend
mkdir -p $DEPLOY_PATH/frontend

# Copy files
echo "📋 Copying application files..."
cp -r $SOURCE_PATH/backend/dist $DEPLOY_PATH/backend/
cp -r $SOURCE_PATH/frontend/dist $DEPLOY_PATH/frontend/
cp $SOURCE_PATH/docker-compose.prod.yml $DEPLOY_PATH/
cp $SOURCE_PATH/backend/Dockerfile.prod $DEPLOY_PATH/backend/
cp $SOURCE_PATH/frontend/Dockerfile.prod $DEPLOY_PATH/frontend/

# Copy environment file if exists
if [ -f "/opt/configs/doanhoi-portal/.env.production" ]; then
    echo "🔐 Copying environment configuration..."
    cp /opt/configs/doanhoi-portal/.env.production $DEPLOY_PATH/
else
    echo "⚠️ Warning: No .env.production found in /opt/configs/doanhoi-portal/"
fi

# Set permissions
echo "🔧 Setting permissions..."
chown -R gitlab-runner:gitlab-runner $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH

# Docker deployment
echo "🐳 Starting Docker deployment..."
cd $DEPLOY_PATH
docker-compose -f docker-compose.prod.yml down || echo "No existing containers to stop"
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Copy frontend to nginx
echo "📁 Copying frontend files to nginx location..."
mkdir -p /opt/doanhoi-portal/frontend/dist
cp -r frontend/dist/* /opt/doanhoi-portal/frontend/dist/
chown -R www-data:www-data /opt/doanhoi-portal/frontend/dist

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx || echo "Warning: nginx reload failed"

# Health checks
echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking deployment status..."
docker-compose -f docker-compose.prod.yml ps

echo "🔍 Testing backend API..."
curl -f http://localhost:9200/api || echo "⚠️ Backend health check failed"

echo "🔍 Testing frontend..."
curl -f https://103.88.121.146 || echo "⚠️ Frontend health check failed"

echo "✅ Manual deployment completed!"
echo "🌐 Frontend: https://103.88.121.146"
echo "🔗 Backend API: http://localhost:9200"
echo "📊 Logs: docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml logs"

# Clean up source files
echo "🧹 Cleaning up source files..."
rm -rf $SOURCE_PATH
echo "Deployment artifacts cleaned up"
