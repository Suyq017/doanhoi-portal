# Production deployment script for server deployment
Write-Host "🚀 Starting production deployment for server..." -ForegroundColor Green

# Check if .env.production exists
if (!(Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "Please create .env.production file with your production environment variables." -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Environment variables will be loaded from .env.production" -ForegroundColor Blue

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Build services
Write-Host "🔨 Building services..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Start backend and database only
Write-Host "🚀 Starting backend and database..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres backend

# Build frontend and copy files
Write-Host "🎨 Building frontend..." -ForegroundColor Blue

# Tạo thư mục dist nếu chưa có
if (!(Test-Path "frontend/dist")) {
    New-Item -ItemType Directory -Path "frontend/dist" -Force
}

# Build frontend bằng cách run container và copy files
docker-compose -f docker-compose.prod.yml --env-file .env.production run --rm frontend

# Kiểm tra build files
Write-Host "📂 Checking frontend build files..." -ForegroundColor Blue
if (Test-Path "frontend/dist/index.html") {
    Write-Host "✅ Frontend build files found in frontend/dist/" -ForegroundColor Green
    $fileCount = (Get-ChildItem "frontend/dist" -Recurse).Count
    Write-Host "📊 Total files built: $fileCount" -ForegroundColor Gray
}
else {
    Write-Host "❌ Frontend build files not found!" -ForegroundColor Red
    Write-Host "Trying alternative build method..." -ForegroundColor Yellow
    
    # Alternative: build directly với npm
    Set-Location frontend
    npm run build
    Set-Location ..
    
    if (Test-Path "frontend/dist/index.html") {
        Write-Host "✅ Frontend built successfully with npm!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml ps

Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host "📋 Next steps for server deployment:" -ForegroundColor Cyan
Write-Host "1. Copy frontend/dist/* to server:/opt/doanhoi-portal/frontend/dist/" -ForegroundColor Gray
Write-Host "2. Restart nginx on server: sudo systemctl restart nginx" -ForegroundColor Gray
Write-Host "3. Backend API running at: http://localhost:9200" -ForegroundColor Gray
Write-Host "📊 View backend logs: docker-compose -f docker-compose.prod.yml logs -f backend" -ForegroundColor Gray
