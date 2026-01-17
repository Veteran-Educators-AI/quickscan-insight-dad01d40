@echo off
REM Scanner Bridge Installer for Windows
REM Run this script to install and start the Scanner Bridge

echo.
echo Scanner Bridge Installer
echo ============================
echo.

REM Check for Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X Docker is not installed.
    echo.
    echo Please install Docker Desktop first:
    echo   https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo [OK] Docker found
echo.

REM Check if already running
docker ps | findstr scanner-bridge >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] Scanner Bridge is already running!
    echo.
    set /p RESTART="Do you want to restart it? (y/n): "
    if /i "%RESTART%"=="y" (
        echo [~] Restarting Scanner Bridge...
        docker-compose down
    ) else (
        echo Exiting.
        pause
        exit /b 0
    )
)

REM Build and start
echo [~] Building Scanner Bridge...
docker-compose build

echo.
echo [~] Starting Scanner Bridge...
docker-compose up -d

echo.
echo [OK] Scanner Bridge is now running!
echo.
echo WebSocket URL: ws://localhost:8765
echo.
echo To view logs:
echo   docker-compose logs -f
echo.
echo To stop:
echo   docker-compose down
echo.
echo Now open ScanGenius and click 'Scanner Bridge' to connect!
echo.
pause
