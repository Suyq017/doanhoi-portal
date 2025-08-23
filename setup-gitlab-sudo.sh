#!/bin/bash

# Script to configure sudo permissions for gitlab-runner
# Run this script as root/admin on the server

echo "🔧 Configuring sudo permissions for gitlab-runner..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root"
    echo "Usage: sudo bash setup-gitlab-sudo.sh"
    exit 1
fi

# Create sudoers file for gitlab-runner
echo "📝 Creating sudoers configuration..."
cat > /etc/sudoers.d/gitlab-runner << 'EOF'
# GitLab Runner sudo permissions for deployment
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/mkdir
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/cp
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/chown
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/chmod
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/docker
gitlab-runner ALL=(ALL) NOPASSWD: /usr/local/bin/docker-compose
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/docker-compose
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
gitlab-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl status nginx
EOF

# Set proper permissions on sudoers file
chmod 440 /etc/sudoers.d/gitlab-runner

# Validate sudoers configuration
echo "🔍 Validating sudoers configuration..."
visudo -c -f /etc/sudoers.d/gitlab-runner

if [ $? -eq 0 ]; then
    echo "✅ GitLab Runner sudo configuration created successfully"
    echo "📋 Permissions granted:"
    echo "  - mkdir, cp, chown, chmod for file operations"
    echo "  - docker and docker-compose for container management"
    echo "  - nginx reload/restart for web server management"
    
    echo "🧪 Testing sudo permissions..."
    sudo -u gitlab-runner sudo -n mkdir -p /tmp/gitlab-test && echo "✅ mkdir works" || echo "❌ mkdir failed"
    sudo -u gitlab-runner sudo -n docker --version && echo "✅ docker works" || echo "❌ docker failed"
    sudo rm -rf /tmp/gitlab-test
    
    echo "✅ Setup completed! GitLab Runner can now use sudo for deployment."
else
    echo "❌ Sudoers configuration validation failed"
    rm -f /etc/sudoers.d/gitlab-runner
    exit 1
fi
