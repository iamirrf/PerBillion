#!/bin/bash

# PerBillion Setup Script
# Complete environment setup and dependency installation

set -e

echo "🚀 PerBillion Complete Setup"
echo "=============================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
echo "📋 Checking Prerequisites..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
print_success "Docker is installed and running"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    print_error "Docker Compose is not available"
    exit 1
fi
print_success "Docker Compose is available"

echo ""
echo "📦 Setup Options:"
echo "1. Docker-only setup (Recommended - No local dependencies needed)"
echo "2. Full local development setup (Requires Node.js, Python, Java)"
echo ""
read -p "Choose option (1 or 2): " SETUP_OPTION

if [ "$SETUP_OPTION" = "2" ]; then
    echo ""
    echo "🔧 Checking Local Development Tools..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found"
        echo "Install from: https://nodejs.org/"
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION"
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_warning "Python 3 not found"
        echo "Install from: https://www.python.org/"
    else
        PYTHON_VERSION=$(python3 --version)
        print_success "$PYTHON_VERSION"
    fi
    
    # Check Java
    if ! command -v java &> /dev/null; then
        print_warning "Java not found"
        echo "Install from: https://adoptium.net/"
    else
        JAVA_VERSION=$(java -version 2>&1 | head -n 1)
        print_success "$JAVA_VERSION"
    fi
    
    echo ""
    read -p "Continue with local setup? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Switching to Docker-only setup..."
        SETUP_OPTION="1"
    fi
fi

echo ""
echo "📄 Configuring Environment..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_info ".env already exists"
fi

# Check for Alpha Vantage API key
if grep -q "ALPHAVANTAGE_API_KEY=change_me_alpha_vantage_key" .env; then
    print_warning "Alpha Vantage API key is still a placeholder"
    echo ""
    echo "For production use, get a free API key at:"
    echo "https://www.alphavantage.co/support/#api-key"
    echo ""
    read -p "Do you have an API key to enter now? (y/n): " HAS_KEY
    if [ "$HAS_KEY" = "y" ]; then
        read -p "Enter your Alpha Vantage API key: " API_KEY
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/ALPHAVANTAGE_API_KEY=change_me_alpha_vantage_key/ALPHAVANTAGE_API_KEY=$API_KEY/" .env
        else
            sed -i "s/ALPHAVANTAGE_API_KEY=change_me_alpha_vantage_key/ALPHAVANTAGE_API_KEY=$API_KEY/" .env
        fi
        print_success "API key configured"
    fi
fi

# Generate secure secrets if they're still default
if grep -q "change_me_local_mongo_password" .env || grep -q "change_me_256_bit_jwt_secret" .env; then
    print_info "Generating secure passwords..."
    POSTGRES_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    MONGO_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/POSTGRES_PASSWORD=change_me_legacy_postgres_password/POSTGRES_PASSWORD=$POSTGRES_PASS/" .env
        sed -i '' "s/MONGO_PASSWORD=change_me_local_mongo_password/MONGO_PASSWORD=$MONGO_PASS/" .env
        sed -i '' "s|JWT_SECRET=change_me_256_bit_jwt_secret|JWT_SECRET=$JWT_SECRET|" .env
    else
        sed -i "s/POSTGRES_PASSWORD=change_me_legacy_postgres_password/POSTGRES_PASSWORD=$POSTGRES_PASS/" .env
        sed -i "s/MONGO_PASSWORD=change_me_local_mongo_password/MONGO_PASSWORD=$MONGO_PASS/" .env
        sed -i "s|JWT_SECRET=change_me_256_bit_jwt_secret|JWT_SECRET=$JWT_SECRET|" .env
    fi
    print_success "Generated secure credentials"
fi

if [ "$SETUP_OPTION" = "2" ]; then
    echo ""
    echo "📦 Installing Local Dependencies..."
    
    # Frontend
    if [ -d "services/frontend" ] && command -v npm &> /dev/null; then
        echo "Installing frontend dependencies..."
        cd services/frontend
        npm install
        cd ../..
        print_success "Frontend dependencies installed"
    fi
    
    # API Gateway
    if [ -d "services/api-gateway" ] && command -v npm &> /dev/null; then
        echo "Installing API gateway dependencies..."
        cd services/api-gateway
        npm install
        cd ../..
        print_success "API gateway dependencies installed"
    fi
    
    # ML Engine
    if [ -d "services/ml-engine" ] && command -v python3 &> /dev/null; then
        echo "Installing Python dependencies..."
        cd services/ml-engine
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        deactivate
        cd ../..
        print_success "Python dependencies installed"
    fi
    
    # Spring Orchestrator
    if [ -d "services/spring-orchestrator" ] && command -v ./mvnw &> /dev/null; then
        echo "Building Spring Boot application..."
        cd services/spring-orchestrator
        ./mvnw clean package -DskipTests
        cd ../..
        print_success "Spring Boot application built"
    fi
fi

echo ""
echo "🐳 Building Docker Images..."
echo "This may take 5-10 minutes on first run..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose build
else
    docker compose build
fi

print_success "Docker images built successfully"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Quick Start Commands:"
echo ""
echo "  Start all services:"
if command -v docker-compose &> /dev/null; then
    echo "    docker-compose up -d"
else
    echo "    docker compose up -d"
fi
echo ""
echo "  View logs:"
if command -v docker-compose &> /dev/null; then
    echo "    docker-compose logs -f"
else
    echo "    docker compose logs -f"
fi
echo ""
echo "  Stop all services:"
if command -v docker-compose &> /dev/null; then
    echo "    docker-compose down"
else
    echo "    docker compose down"
fi
echo ""
echo "📍 Access Points:"
echo "  • Frontend:     http://localhost"
echo "  • API Gateway:  http://localhost/api"
echo "  • Swagger UI:   http://localhost:8080/swagger-ui.html"
echo "  • ML Engine:    http://localhost:5000"
echo ""
echo "📚 Documentation:"
echo "  • README.md                      - Complete guide"
echo "  • docs/AWS_DEPLOYMENT_GUIDE.md   - AWS deployment"
echo "  • docs/MARKETING_FEATURES.md     - Feature list"
echo "  • IMPLEMENTATION_COMPLETE.md     - Implementation details"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "PerBillion is ready to launch! 🎉"
echo ""
