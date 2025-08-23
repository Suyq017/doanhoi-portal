#!/bin/bash

# Production deployment script for Doanhoi Portal

echo "🚀 Starting production deployment..."

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

# Build and start services
echo "🔨 Building and starting production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"
echo "🌐 Frontend available at: http://localhost:9100"
echo "🔗 Backend API available at: http://localhost:9200"
echo "📊 View logs with: docker-compose -f docker-compose.prod.yml logs -f"
