#!/bin/bash

# PerBillion - Quick Start Guide
# This script will help you get the modern PerBillion platform running

echo "================================================"
echo "  PerBillion - Modern Stock Forecasting Setup  "
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚙️  IMPORTANT: Edit the .env file and add your Alpha Vantage API key"
    echo "   Get a free API key at: https://www.alphavantage.co/support/#api-key"
    echo ""
    echo "   After adding your API key, run this script again."
    read -p "Press Enter to open .env file or Ctrl+C to exit..."
    
    # Try to open in default editor
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo "Please edit .env manually"
    fi
    exit 0
fi

echo "✅ .env file exists"

# Check if Alpha Vantage API key is set
if grep -q "ALPHAVANTAGE_API_KEY=change_me_alpha_vantage_key" .env || ! grep -q "^ALPHAVANTAGE_API_KEY=" .env; then
    echo ""
    echo "⚠️  WARNING: Alpha Vantage API key is not configured"
    echo "   Set ALPHAVANTAGE_API_KEY in .env before running forecasts."
    echo "   Get a free API key at:"
    echo "   https://www.alphavantage.co/support/#api-key"
    echo ""
    exit 1
fi

echo ""
echo "🚀 Starting PerBillion services..."
echo ""

# Stop any existing containers
echo "📦 Stopping existing containers (if any)..."
docker-compose down 2>/dev/null

# Build and start services
echo "🏗️  Building containers..."
docker-compose build

echo "▶️  Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service health..."

check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "✅ $service is healthy"
            return 0
        fi
        echo "   Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to start"
    return 1
}

# Check each service
check_service "MongoDB" "http://localhost:27017" || true
check_service "ML Engine" "http://localhost:5000/health" || true
check_service "Spring Orchestrator" "http://localhost:8080/actuator/health" || true
check_service "API Gateway" "http://localhost:3000/health" || true
check_service "Frontend" "http://localhost:5173" || true
check_service "Nginx" "http://localhost/health" || true

echo ""
echo "================================================"
echo "  🎉 PerBillion is ready!"
echo "================================================"
echo ""
echo "📊 Access the dashboard:"
echo "   http://localhost"
echo ""
echo "🔧 Service URLs:"
echo "   Frontend:     http://localhost:5173"
echo "   API Gateway:  http://localhost:3000"
echo "   Orchestrator: http://localhost:8080"
echo "   ML Engine:    http://localhost:5000"
echo "   MongoDB:      http://localhost:27017"
echo ""
echo "📚 API Documentation:"
echo "   Swagger UI:   http://localhost:8080/swagger-ui.html"
echo ""
echo "📋 View logs:"
echo "   docker-compose logs -f [service-name]"
echo "   Services: frontend, api-gateway, spring-orchestrator, ml-engine, mongodb"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
echo "🔄 Restart services:"
echo "   docker-compose restart"
echo ""
echo "================================================"
echo ""
echo "Ready to forecast! Just enter a stock ticker and let the models do their magic. 📈"
echo ""
