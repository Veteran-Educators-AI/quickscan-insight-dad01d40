#!/bin/bash

# Scanner Bridge Installer
# Run this script to install and start the Scanner Bridge

set -e

echo "🖨️  Scanner Bridge Installer"
echo "============================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo ""
    echo "Please install Docker first:"
    echo "  - Windows/Mac: https://www.docker.com/products/docker-desktop"
    echo "  - Linux: https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    echo ""
    echo "Please install Docker Compose:"
    echo "  https://docs.docker.com/compose/install/"
    echo ""
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Check if already running
if docker ps | grep -q scanner-bridge; then
    echo "⚠️  Scanner Bridge is already running!"
    echo ""
    read -p "Do you want to restart it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Restarting Scanner Bridge..."
        docker-compose down
    else
        echo "Exiting."
        exit 0
    fi
fi

# Build and start
echo "🔨 Building Scanner Bridge..."
docker-compose build

echo ""
echo "🚀 Starting Scanner Bridge..."
docker-compose up -d

echo ""
echo "✅ Scanner Bridge is now running!"
echo ""
echo "📡 WebSocket URL: ws://localhost:8765"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""
echo "Now open ScanGenius and click 'Scanner Bridge' to connect!"
