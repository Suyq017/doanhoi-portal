#!/bin/bash

# 🔧 GitLab CI/CD Setup Script cho Doanhoi Portal
# Script này giúp tự động thiết lập các components cần thiết

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="103.88.121.146"
PRODUCTION_USER="root"
DEPLOY_PATH="/opt/doanhoi-portal"
DOMAIN="doanhoi.hcmut.edu.vn"
SSH_KEY_NAME="gitlab_deploy_key"

echo -e "${BLUE}🚀 GitLab CI/CD Setup Script for Doanhoi Portal${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    SSH_DIR="$HOME/.ssh"
    print_info "Detected Windows environment (Git Bash)"
else
    SSH_DIR="$HOME/.ssh"
    print_info "Detected Unix-like environment"
fi

# Step 1: Check prerequisites
echo -e "\n${BLUE}📋 Step 1: Checking Prerequisites${NC}"
echo "=================================="

# Check Git
if command -v git &> /dev/null; then
    print_status "Git is installed"
else
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check SSH
if command -v ssh &> /dev/null; then
    print_status "SSH is available"
else
    print_error "SSH is not available"
    exit 1
fi

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status "Current directory is a Git repository"
else
    print_error "Current directory is not a Git repository"
    print_info "Please run this script from the root of your Doanhoi Portal project"
    exit 1
fi

# Step 2: Generate SSH Key for GitLab CI/CD
echo -e "\n${BLUE}🔐 Step 2: SSH Key Generation${NC}"
echo "================================"

mkdir -p "$SSH_DIR"

if [ -f "$SSH_DIR/$SSH_KEY_NAME" ]; then
    print_warning "SSH key $SSH_KEY_NAME already exists"
    read -p "Do you want to regenerate it? (y/N): " regenerate
    if [[ $regenerate =~ ^[Yy]$ ]]; then
        rm -f "$SSH_DIR/$SSH_KEY_NAME" "$SSH_DIR/$SSH_KEY_NAME.pub"
    else
        print_info "Using existing SSH key"
    fi
fi

if [ ! -f "$SSH_DIR/$SSH_KEY_NAME" ]; then
    print_info "Generating new SSH key for GitLab CI/CD..."
    ssh-keygen -t rsa -b 4096 -C "gitlab-ci@doanhoi.com" -f "$SSH_DIR/$SSH_KEY_NAME" -N ""
    print_status "SSH key generated successfully"
fi

# Step 3: Test SSH connection to production server
echo -e "\n${BLUE}🔗 Step 3: Testing SSH Connection${NC}"
echo "=================================="

print_info "Testing SSH connection to production server..."
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_DIR/$SSH_KEY_NAME" "$PRODUCTION_USER@$PRODUCTION_SERVER" "echo 'SSH connection successful'" 2>/dev/null; then
    print_status "SSH connection to production server successful"
else
    print_warning "SSH connection failed. You need to add the public key to the server."
    echo ""
    print_info "Public key to add to server:"
    echo "----------------------------"
    cat "$SSH_DIR/$SSH_KEY_NAME.pub"
    echo "----------------------------"
    echo ""
    print_info "Run this command on the production server:"
    echo "mkdir -p ~/.ssh && echo '$(cat "$SSH_DIR/$SSH_KEY_NAME.pub")' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
    echo ""
    read -p "Press Enter after you've added the public key to the server..."
    
    # Test again
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_DIR/$SSH_KEY_NAME" "$PRODUCTION_USER@$PRODUCTION_SERVER" "echo 'SSH connection successful'" 2>/dev/null; then
        print_status "SSH connection successful after adding key"
    else
        print_error "SSH connection still failing. Please check server configuration."
        exit 1
    fi
fi

# Step 4: Verify project structure
echo -e "\n${BLUE}📁 Step 4: Verifying Project Structure${NC}"
echo "======================================"

required_files=(
    ".gitlab-ci.yml"
    "docker-compose.prod.yml"
    ".env.production"
    "frontend/.env.production"
    "backend/Dockerfile.prod"
    "frontend/Dockerfile.prod"
    "frontend/nginx.conf"
    "backend/package.json"
    "frontend/package.json"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file exists"
    else
        print_error "$file is missing"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Missing required files. Please ensure all files are present before continuing."
    exit 1
fi

# Step 5: Check environment files
echo -e "\n${BLUE}⚙️ Step 5: Checking Environment Configuration${NC}"
echo "============================================="

# Check backend .env.production
if grep -q "DB_PASSWORD=your-secure-password-here" .env.production 2>/dev/null; then
    print_warning "Backend .env.production contains default password"
    print_info "Please update the database password in .env.production"
fi

if grep -q "JWT_SECRET=your-super-secret-jwt-key" .env.production 2>/dev/null; then
    print_warning "Backend .env.production contains default JWT secret"
    print_info "Please update JWT secrets in .env.production"
fi

# Check frontend .env.production
if grep -q "your-domain.com" frontend/.env.production 2>/dev/null; then
    print_warning "Frontend .env.production contains placeholder domain"
    print_info "Please update the domain in frontend/.env.production"
fi

# Step 6: Generate GitLab Variables commands
echo -e "\n${BLUE}🔧 Step 6: GitLab Variables Setup${NC}"
echo "================================="

print_info "GitLab Variables to add to your project:"
echo ""
echo "Variable Name: SSH_PRIVATE_KEY"
echo "Type: File"
echo "Protected: Yes"
echo "Value: (Copy the content below)"
echo "---BEGIN PRIVATE KEY---"
cat "$SSH_DIR/$SSH_KEY_NAME"
echo "---END PRIVATE KEY---"
echo ""

cat << EOF
Other Variables to add in GitLab:

Variable Name: PRODUCTION_SERVER
Value: $PRODUCTION_SERVER
Type: Variable
Protected: Yes

Variable Name: PRODUCTION_USER  
Value: $PRODUCTION_USER
Type: Variable
Protected: Yes

Variable Name: DEPLOY_PATH
Value: $DEPLOY_PATH
Type: Variable
Protected: Yes

Variable Name: DOMAIN
Value: $DOMAIN
Type: Variable
Protected: No
EOF

# Step 7: Test pipeline syntax
echo -e "\n${BLUE}✅ Step 7: Validating Pipeline Configuration${NC}"
echo "==========================================="

if [ -f ".gitlab-ci.yml" ]; then
    print_info "Checking .gitlab-ci.yml syntax..."
    
    # Basic YAML syntax check (if available)
    if command -v python3 &> /dev/null; then
        python3 -c "import yaml; yaml.safe_load(open('.gitlab-ci.yml'))" 2>/dev/null
        if [ $? -eq 0 ]; then
            print_status ".gitlab-ci.yml syntax is valid"
        else
            print_warning ".gitlab-ci.yml may have syntax issues"
        fi
    else
        print_info "Python3 not available for YAML validation"
    fi
    
    # Check for required stages
    if grep -q "stages:" .gitlab-ci.yml && grep -q "deploy_production:" .gitlab-ci.yml; then
        print_status "Pipeline stages are properly configured"
    else
        print_warning "Pipeline configuration may be incomplete"
    fi
fi

# Step 8: Final instructions
echo -e "\n${BLUE}🎯 Step 8: Final Setup Instructions${NC}"
echo "===================================="

echo ""
print_info "Next steps to complete GitLab CI/CD setup:"
echo ""
echo "1. 📝 Add the SSH_PRIVATE_KEY and other variables to GitLab:"
echo "   → Go to your GitLab project"
echo "   → Settings > CI/CD > Variables"
echo "   → Add each variable listed above"
echo ""
echo "2. 🔧 Update environment files if needed:"
echo "   → .env.production (database password, JWT secrets)"
echo "   → frontend/.env.production (domain configuration)"
echo ""
echo "3. 🚀 Push code to trigger first pipeline:"
echo "   → git add ."
echo "   → git commit -m 'feat: setup CI/CD pipeline'"
echo "   → git push origin dev"
echo ""
echo "4. 📊 Monitor pipeline in GitLab:"
echo "   → CI/CD > Pipelines"
echo "   → Click 'Play' button for deploy_production stage"
echo ""
echo "5. ✅ Verify deployment:"
echo "   → Check https://$DOMAIN"
echo "   → Login with admin@doanhoi.com / admin123"
echo ""

# Step 9: Create helper scripts
echo -e "\n${BLUE}📋 Step 9: Creating Helper Scripts${NC}"
echo "=================================="

# Create quick deployment script
cat > scripts/quick-deploy.sh << 'EOF'
#!/bin/bash
# Quick deployment script for emergency deploys

set -e

echo "🚨 Emergency Deployment to Production"
echo "====================================="

# Check if we're on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️ Warning: You're not on 'dev' branch"
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/N): " continue_deploy
    if [[ ! $continue_deploy =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
git commit -m "deploy: emergency deployment $TIMESTAMP" || true

# Push to trigger pipeline
git push origin $CURRENT_BRANCH

echo "✅ Code pushed. Check GitLab pipeline for deployment status."
echo "🔗 Pipeline URL: https://gitlab.com/YOUR_USERNAME/doanhoi-portal/-/pipelines"
EOF

# Create server health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check script

echo "🩺 Doanhoi Portal Health Check"
echo "=============================="

DOMAIN="doanhoi.hcmut.edu.vn"

# Check domain
echo "🌐 Checking domain accessibility..."
if curl -f -k https://$DOMAIN >/dev/null 2>&1; then
    echo "✅ Domain is accessible"
else
    echo "❌ Domain is not accessible"
fi

# Check API
echo "🔧 Checking API endpoint..."
if curl -f -k https://$DOMAIN/api >/dev/null 2>&1; then
    echo "✅ API is responding"
else
    echo "❌ API is not responding"
fi

echo ""
echo "🔗 Application URLs:"
echo "   - Website: https://$DOMAIN"
echo "   - Admin: https://$DOMAIN (admin@doanhoi.com / admin123)"
EOF

mkdir -p scripts
chmod +x scripts/quick-deploy.sh
chmod +x scripts/health-check.sh

print_status "Helper scripts created in scripts/ directory"

echo ""
echo -e "${GREEN}🎉 GitLab CI/CD Setup Complete!${NC}"
echo "=================================="
print_info "Your Doanhoi Portal is now ready for automated deployment!"
print_info "Follow the final setup instructions above to complete the configuration."
echo ""
