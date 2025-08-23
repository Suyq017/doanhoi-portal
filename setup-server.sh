#!/bin/bash

# Server deployment script với proper permissions
echo "🚀 Starting server deployment..."

DEPLOY_PATH="/opt/doanhoi-portal"
BACKUP_PATH="/opt/backups/doanhoi-portal"

# Create backup
echo "📦 Creating backup..."
sudo mkdir -p $BACKUP_PATH
sudo cp -r $DEPLOY_PATH $BACKUP_PATH/backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Setup deployment directory
echo "📁 Setting up deployment directory..."
sudo mkdir -p $DEPLOY_PATH
sudo mkdir -p $DEPLOY_PATH/backend
sudo mkdir -p $DEPLOY_PATH/frontend

# Create .env.production if not exists
if [ ! -f "$DEPLOY_PATH/.env.production" ]; then
    echo "📝 Creating .env.production..."
    sudo tee $DEPLOY_PATH/.env.production > /dev/null << EOF
# Database Configuration
DB_PASSWORD=your_secure_db_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here_should_be_at_least_32_characters
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here_should_be_at_least_32_characters

# Google OAuth
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GOOGLE_CALLBACK_URL=https://103.88.121.146/auth/google/callback

# Frontend URL
FRONTEND_URL=https://103.88.121.146

# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
EOF
    echo "⚠️ Please update .env.production with your actual values!"
fi

# Set permissions
sudo chown -R gitlab-runner:gitlab-runner $DEPLOY_PATH
sudo chmod -R 755 $DEPLOY_PATH

echo "✅ Server setup completed!"
echo "📋 Next steps:"
echo "1. Update $DEPLOY_PATH/.env.production with actual values"
echo "2. Run GitLab CI/CD pipeline to deploy"
echo "3. Check deployment: sudo docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml ps"
