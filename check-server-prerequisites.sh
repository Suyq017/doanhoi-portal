#!/bin/bash

# Server prerequisites check script
echo "🔍 Checking server prerequisites for deployment..."

# Check if running as gitlab-runner
echo "📊 Current user: $(whoami)"
if [ "$(whoami)" != "gitlab-runner" ]; then
    echo "⚠️ Warning: Not running as gitlab-runner user"
fi

# Check sudo permissions
echo "🔐 Checking sudo permissions..."
if sudo -n true 2>/dev/null; then
    echo "✅ Sudo permissions OK"
else
    echo "❌ No sudo permissions. Please configure sudoers for gitlab-runner"
    echo "Run: sudo visudo"
    echo "Add: gitlab-runner ALL=(ALL) NOPASSWD: ALL"
fi

# Check Docker
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker installed: $(docker --version)"
    if sudo docker ps &> /dev/null; then
        echo "✅ Docker daemon running"
    else
        echo "❌ Docker daemon not running"
    fi
else
    echo "❌ Docker not installed"
fi

# Check Docker Compose
echo "🐳 Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose not installed"
fi

# Check Nginx
echo "🌐 Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx installed: $(nginx -v 2>&1)"
    if sudo systemctl is-active nginx &> /dev/null; then
        echo "✅ Nginx service running"
    else
        echo "⚠️ Nginx service not running"
    fi
else
    echo "❌ Nginx not installed"
fi

# Check deployment directory
echo "📁 Checking deployment directory..."
if [ -d "/opt/doanhoi-portal" ]; then
    echo "✅ Deployment directory exists"
    echo "📊 Directory permissions: $(ls -ld /opt/doanhoi-portal)"
else
    echo "⚠️ Deployment directory doesn't exist"
    echo "Creating: sudo mkdir -p /opt/doanhoi-portal"
    sudo mkdir -p /opt/doanhoi-portal
fi

# Check backup directory
echo "📁 Checking backup directory..."
if [ -d "/opt/backups" ]; then
    echo "✅ Backup directory exists"
else
    echo "⚠️ Creating backup directory..."
    sudo mkdir -p /opt/backups/doanhoi-portal
fi

# Check nginx static directory
echo "📁 Checking nginx static directory..."
if [ -d "/opt/doanhoi-portal/frontend/dist" ]; then
    echo "✅ Nginx static directory exists"
else
    echo "⚠️ Creating nginx static directory..."
    sudo mkdir -p /opt/doanhoi-portal/frontend/dist
    sudo chown -R www-data:www-data /opt/doanhoi-portal/frontend/dist
fi

# Check environment file
echo "🔐 Checking environment configuration..."
if [ -f "/opt/configs/doanhoi-portal/.env.production" ]; then
    echo "✅ Server environment file exists"
else
    echo "⚠️ Server environment file not found"
    echo "Please create: /opt/configs/doanhoi-portal/.env.production"
fi

# Check GitLab Runner tags
echo "🏷️ Checking GitLab Runner tags..."
if [ -f "/etc/gitlab-runner/config.toml" ]; then
    if grep -q "deploy" /etc/gitlab-runner/config.toml && grep -q "production" /etc/gitlab-runner/config.toml; then
        echo "✅ GitLab Runner has deploy and production tags"
    else
        echo "⚠️ GitLab Runner missing deploy/production tags"
        echo "Please update runner config with tags: [\"deploy\", \"production\"]"
    fi
else
    echo "⚠️ GitLab Runner config not found"
fi

echo ""
echo "🎯 Summary:"
echo "✅ Ready for deployment if all checks passed"
echo "⚠️ Fix any warnings before deploying"
echo ""
echo "📋 Manual deployment steps:"
echo "1. Fix any issues above"
echo "2. Push code to GitLab"
echo "3. Run deployment job manually in GitLab CI/CD"
