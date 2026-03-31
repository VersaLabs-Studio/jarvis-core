#!/bin/bash
# JARVIS Docker Stop Script
# Gracefully stops all JARVIS services

set -e

echo "🦞 Stopping JARVIS..."

# Navigate to openclaw directory
cd ~/openclaw

# Stop services gracefully
echo "🛑 Stopping services..."
docker compose down

echo ""
echo "✅ JARVIS stopped successfully."
echo ""
echo "💡 To start again: ./scripts/docker-start.sh"
echo "💡 To remove volumes: docker compose down -v"