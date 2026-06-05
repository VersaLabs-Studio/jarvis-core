#!/bin/bash
# JARVIS Core - Development Stop Script
# Work Package A3: Stops all services gracefully

set -e

echo "=========================================="
echo "JARVIS Core - Stopping Services"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Stop services gracefully
echo "Stopping services..."
docker compose down

echo ""
echo "OK: All services stopped"
echo ""
echo "Useful commands:"
echo "  - Start:        ./scripts/dev.sh"
echo "  - Remove volumes: docker compose down -v"
echo "  - Full cleanup: docker compose down -v --rmi all"
echo ""
