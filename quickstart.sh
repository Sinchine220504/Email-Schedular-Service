#!/bin/bash

# ReachInbox Email Scheduler - Quick Start Script
# This script sets up the entire project in one go

set -e

echo "🚀 ReachInbox Email Scheduler - Quick Start"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

# Start Docker services
echo ""
echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ PostgreSQL and Redis started${NC}"

# Wait for services to be ready
echo ""
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Setup Backend
echo ""
echo -e "${BLUE}⚙️  Setting up backend...${NC}"
cd backend

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"
REDIS_URL="redis://localhost:6379"

ETHEREAL_USER="your_ethereal_email@ethereal.email"
ETHEREAL_PASS="your_ethereal_password"

MAX_EMAILS_PER_HOUR=200
DELAY_BETWEEN_EMAILS_MS=2000
WORKER_CONCURRENCY=5

PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:3001"
EOF
    echo -e "${YELLOW}⚠️  Created .env file. Please update ETHEREAL credentials!${NC}"
    echo -e "${YELLOW}   Get free credentials at: https://ethereal.email${NC}"
fi

echo "Installing dependencies..."
npm install --silent

echo "Setting up database..."
npx prisma generate --silent
npx prisma db push --skip-generate --accept-data-loss

echo -e "${GREEN}✅ Backend ready${NC}"

# Setup Frontend
echo ""
echo -e "${BLUE}⚙️  Setting up frontend...${NC}"
cd ../frontend

if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=demo
NEXTAUTH_SECRET=dev-secret-key-not-for-production
NEXTAUTH_URL=http://localhost:3001
EOF
fi

echo "Installing dependencies..."
npm install --silent

echo -e "${GREEN}✅ Frontend ready${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Update backend/.env with Ethereal credentials:"
echo "   - Get free account: https://ethereal.email"
echo "   - Set ETHEREAL_USER and ETHEREAL_PASS"
echo ""
echo "2. Start the backend (new terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "3. Start the frontend (new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open http://localhost:3001 in your browser"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Setup Guide: SETUP.md"
echo "   - Architecture: ARCHITECTURE.md"
echo "   - Testing: TESTING.md"
echo "   - Deployment: DEPLOYMENT.md"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   - Save your Ethereal credentials securely"
echo "   - Never commit .env files"
echo "   - Use strong secrets in production"
echo ""
