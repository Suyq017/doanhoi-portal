# Production deployment script for Doanhoi Portal (Windows)

Write-Host "🚀 Starting production deployment..." -ForegroundColor Green

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

# Build and start services
Write-Host "🔨 Building and starting production services..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml ps

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Frontend available at: http://localhost:9100" -ForegroundColor Cyan
Write-Host "🔗 Backend API available at: http://localhost:9200" -ForegroundColor Cyan
Write-Host "📊 View logs with: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
