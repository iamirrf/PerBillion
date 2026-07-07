#!/bin/bash

# PerBillion Quick Start Script
# This script helps you launch the PerBillion platform

set -e

echo "🚀 PerBillion Quick Start"
echo "========================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env to add your Alpha Vantage API key"
    echo "   Get a free key at: https://www.alphavantage.co/support/#api-key"
    echo ""
fi

# Pull latest images
echo "📦 Pulling Docker images..."
docker-compose pull

# Build custom images
echo "🔨 Building services..."
docker-compose build

# Start services
echo "🚀 Starting PerBillion services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

services=(
    "http://localhost:5432|PostgreSQL Database"
    "http://localhost:27017|MongoDB Database"
    "http://localhost:5000/health|ML Engine"
    "http://localhost:3000/health|API Gateway"
    "http://localhost:8080/actuator/health|Spring Orchestrator"
    "http://localhost:5173|Frontend"
)

all_healthy=true
for service in "${services[@]}"; do
    IFS='|' read -r url name <<< "$service"
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "  ✅ $name"
    else
        echo "  ⏳ $name (starting...)"
        all_healthy=false
    fi
done

echo ""
if [ "$all_healthy" = true ]; then
    echo "✅ All services are healthy!"
else
    echo "⏳ Some services are still starting. This is normal."
    echo "   Run 'docker-compose ps' to check status"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ PerBillion is now running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Access Points:"
echo "   Frontend:        http://localhost"
echo "   API Gateway:     http://localhost/api"
echo "   Swagger UI:      http://localhost:8080/swagger-ui.html"
echo "   ML Engine:       http://localhost:5000"
echo ""
echo "📚 Next Steps:"
echo "   1. Open http://localhost in your browser"
echo "   2. Register a new account"
echo "   3. Create your first forecast"
echo ""
echo "📖 Documentation:"
echo "   - README.md"
echo "   - docs/MARKETING_FEATURES.md"
echo "   - docs/AWS_DEPLOYMENT_GUIDE.md"
echo "   - IMPLEMENTATION_COMPLETE.md"
echo ""
echo "🛠️  Useful Commands:"
echo "   View logs:       docker-compose logs -f"
echo "   Stop services:   docker-compose down"
echo "   Restart:         docker-compose restart"
echo "   Check status:    docker-compose ps"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
