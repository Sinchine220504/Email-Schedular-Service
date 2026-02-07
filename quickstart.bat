@echo off
REM ReachInbox Email Scheduler - Quick Start Script for Windows
REM This script sets up the entire project in one go

echo.
echo ========================================
echo ReachInbox Email Scheduler - Quick Start
echo ========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker not found. Please install Docker
    pause
    exit /b 1
)
echo [OK] Docker installed

REM Start Docker services
echo.
echo Starting Docker services...
call docker-compose up -d

echo [OK] PostgreSQL and Redis started
echo.

REM Setup Backend
echo Setting up backend...
cd backend

if not exist .env (
    echo Creating .env file...
    (
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox
        echo REDIS_URL=redis://localhost:6379
        echo.
        echo ETHEREAL_USER=your_ethereal_email@ethereal.email
        echo ETHEREAL_PASS=your_ethereal_password
        echo.
        echo MAX_EMAILS_PER_HOUR=200
        echo DELAY_BETWEEN_EMAILS_MS=2000
        echo WORKER_CONCURRENCY=5
        echo.
        echo PORT=3000
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:3001
    ) > .env
    echo [WARNING] Created .env file. Please update ETHEREAL credentials!
    echo [INFO] Get free credentials at: https://ethereal.email
)

echo Installing dependencies...
call npm install --silent

echo Setting up database...
call npx prisma generate --silent
call npx prisma db push --skip-generate --accept-data-loss

echo [OK] Backend ready

REM Setup Frontend
cd ..\frontend

if not exist .env.local (
    echo Creating .env.local file...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
        echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=demo
        echo NEXTAUTH_SECRET=dev-secret-key-not-for-production
        echo NEXTAUTH_URL=http://localhost:3001
    ) > .env.local
)

echo Installing dependencies...
call npm install --silent

echo [OK] Frontend ready

echo.
echo ========================================
echo [OK] Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Update backend\.env with Ethereal credentials:
echo    - Get free account: https://ethereal.email
echo    - Set ETHEREAL_USER and ETHEREAL_PASS
echo.
echo 2. Start the backend (new terminal):
echo    cd backend ^&^& npm run dev
echo.
echo 3. Start the frontend (new terminal):
echo    cd frontend ^&^& npm run dev
echo.
echo 4. Open http://localhost:3001 in your browser
echo.
echo Documentation:
echo   - Setup Guide: SETUP.md
echo   - Architecture: ARCHITECTURE.md
echo   - Testing: TESTING.md
echo   - Deployment: DEPLOYMENT.md
echo.
pause
