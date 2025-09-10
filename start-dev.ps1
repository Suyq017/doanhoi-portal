#!/usr/bin/env powershell
# 🚀 Start Doanhoi Portal Development Environment

Write-Host "🌟 Starting Doanhoi Portal Development Environment" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Check current directory
if (-not (Test-Path "docker-compose.dev.yml")) {
    Write-Host "❌ Please run this script from the root directory of doanhoi-portal" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Environment Summary:" -ForegroundColor Blue
Write-Host "  - PostgreSQL: localhost:9000" -ForegroundColor White  
Write-Host "  - Backend API: localhost:9200" -ForegroundColor White
Write-Host "  - Frontend: localhost:5173" -ForegroundColor White
Write-Host "  - Database: doanhoi" -ForegroundColor White
Write-Host "  - Admin Login: admin@doanhoi.com / admin1" -ForegroundColor Yellow
Write-Host ""

# Step 1: Start PostgreSQL
Write-Host "🐘 Step 1: Starting PostgreSQL..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml up postgres -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start PostgreSQL" -ForegroundColor Red
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if database is ready
$dbReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $status = docker exec doanhoi-postgres pg_isready -U postgres -d doanhoi 2>$null
        if ($LASTEXITCODE -eq 0) {
            $dbReady = $true
            break
        }
    } catch {
        # Continue trying
    }
    Write-Host "  Attempt $i/10..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host "❌ PostgreSQL is not ready after 20 seconds" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green

# Step 2: Setup Backend
Write-Host ""
Write-Host "🔧 Step 2: Setting up Backend..." -ForegroundColor Blue
Set-Location backend

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure .env file exists in backend directory" -ForegroundColor Yellow
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Backend dependencies ready!" -ForegroundColor Green

# Step 3: Run Database Seeding (in background)
Write-Host ""
Write-Host "🌱 Step 3: Database seeding..." -ForegroundColor Blue
Write-Host "Running db:setup..." -ForegroundColor Yellow

# Run seeding and capture output
$seedingOutput = npm run db:setup 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database seeding completed successfully!" -ForegroundColor Green
    Write-Host "🔑 Admin Login: admin@doanhoi.com / admin1" -ForegroundColor Yellow
} else {
    Write-Host "⚠️ Database seeding had issues, but continuing..." -ForegroundColor Yellow
    Write-Host "You may need to run 'npm run db:setup' manually later" -ForegroundColor Yellow
}

# Step 4: Start Backend (in background)
Write-Host ""
Write-Host "🚀 Step 4: Starting Backend server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run start:dev" -WindowStyle Minimized
Write-Host "✅ Backend server starting in background..." -ForegroundColor Green

# Step 5: Setup and Start Frontend
Write-Host ""
Write-Host "🎨 Step 5: Setting up Frontend..." -ForegroundColor Blue
Set-Location ../frontend

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Frontend .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure .env file exists in frontend directory" -ForegroundColor Yellow
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Frontend dependencies ready!" -ForegroundColor Green

# Wait a bit for backend to start
Write-Host ""
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 6: Start Frontend
Write-Host ""
Write-Host "🎨 Step 6: Starting Frontend development server..." -ForegroundColor Blue
Write-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor Green
Write-Host "🔗 Backend API will be available at: http://localhost:9200" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 Default Login Credentials:" -ForegroundColor Yellow
Write-Host "┌─────────────────────────────────────────────────┐" -ForegroundColor Yellow
Write-Host "│ Email: admin@doanhoi.com                        │" -ForegroundColor Yellow  
Write-Host "│ Password: admin1                                │" -ForegroundColor Yellow
Write-Host "│ Role: super_admin (all permissions)            │" -ForegroundColor Yellow
Write-Host "└─────────────────────────────────────────────────┘" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 Press Ctrl+C to stop the frontend server" -ForegroundColor Red
Write-Host "🐳 Use 'docker-compose -f docker-compose.dev.yml down' to stop PostgreSQL" -ForegroundColor Cyan
Write-Host ""

# Start frontend (this will block)
npm run dev
