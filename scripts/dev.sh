#!/bin/bash
# JARVIS Core - Development Start Script
# Work Package A3: Starts all services for local development
# Resolves: H1 (docker.sock), H7 (resource limits + healthchecks)

set -e

echo "=========================================="
echo "JARVIS Core - Development Environment"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "OK: Docker is running"

# Check if .env exists
if [ ! -f .env ]; then
    echo "WARNING: .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Please edit .env and configure your values before continuing."
    echo "Required variables:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    read -p "Press Enter after configuring .env to continue..."
fi

echo "OK: .env file exists"

# Create required directories
echo "Creating required directories..."
mkdir -p nginx/certs
mkdir -p supabase/migrations

# Pull latest images
echo ""
echo "Pulling latest images..."
docker compose pull

# Build custom images
echo ""
echo "Building custom images..."
docker compose build

# Start services
echo ""
echo "Starting services..."
docker compose up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 15

# Check health status
echo ""
echo "Service Status:"
echo "----------------------------------------"
docker compose ps

echo ""
echo "=========================================="
echo "JARVIS Core is running!"
echo "=========================================="
echo ""
echo "Services:"
echo "  - Web:    http://localhost:3000"
echo "  - API:    http://localhost:3001"
echo "  - Kong:   http://localhost:8000"
echo "  - DB:     localhost:5432"
echo ""
echo "Useful commands:"
echo "  - View logs:    docker compose logs -f"
echo "  - Stop:         ./scripts/stop.sh"
echo "  - Health check: ./scripts/health-check.sh"
echo ""
