#!/bin/bash

# Script to fix GitLab Runner git issues on server
echo "Fixing GitLab Runner git fetch issues..."

# Check if running as gitlab-runner
if [ "$(whoami)" != "gitlab-runner" ]; then
    echo "Please run this script as gitlab-runner user"
    echo "sudo -u gitlab-runner bash fix-git-issues.sh"
    exit 1
fi

# Clean GitLab Runner builds directory
echo "Cleaning GitLab Runner builds directory..."
cd /home/gitlab-runner/builds
sudo rm -rf */0/duytnb/doanhoi-portal/.git 2>/dev/null || true
sudo rm -rf */*/duytnb/doanhoi-portal/.git 2>/dev/null || true

# Clean any corrupted git repositories
find /home/gitlab-runner/builds -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true

# Fix git configuration
echo "Configuring git for gitlab-runner..."
git config --global http.postBuffer 524288000
git config --global core.compression 0
git config --global http.maxRequestBuffer 100M
git config --global core.preloadindex true
git config --global core.fscache true
git config --global gc.auto 256

# Update GitLab Runner configuration to use shallow clone
echo "Checking GitLab Runner configuration..."
if [ -f "/etc/gitlab-runner/config.toml" ]; then
    echo "GitLab Runner config exists"
    # Backup current config
    sudo cp /etc/gitlab-runner/config.toml /etc/gitlab-runner/config.toml.backup.$(date +%Y%m%d_%H%M%S)
    
    # Add git configuration to runner config
    if ! grep -q "git_depth" /etc/gitlab-runner/config.toml; then
        echo "Adding git configuration to runner..."
        sudo sed -i '/\[runners\.docker\]/a\    git_depth = 1' /etc/gitlab-runner/config.toml || true
        sudo sed -i '/\[runners\.docker\]/a\    git_strategy = "fetch"' /etc/gitlab-runner/config.toml || true
    fi
    
    # Restart GitLab Runner
    echo "Restarting GitLab Runner..."
    sudo systemctl restart gitlab-runner
    sudo systemctl status gitlab-runner
else
    echo "GitLab Runner config not found at /etc/gitlab-runner/config.toml"
fi

# Test git clone
echo "Testing git clone..."
cd /tmp
rm -rf test-clone 2>/dev/null || true
git clone --depth 1 https://gitlab.com/duytnb/doanhoi-portal.git test-clone
if [ $? -eq 0 ]; then
    echo "✅ Git clone test successful"
    rm -rf test-clone
else
    echo "❌ Git clone test failed"
fi

echo "Git issues fix completed!"
echo "Try running the GitLab pipeline again."
