#!/bin/bash
# JARVIS Docker Start Script
# Starts all JARVIS services (OpenClaw + MCP servers)

set -e

echo "🦞🔥 Starting JARVIS..."

# Navigate to openclaw directory
cd ~/openclaw

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example to .env and configure your keys."
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest images..."
docker compose pull

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait for gateway to be healthy
echo "⏳ Waiting for gateway to be healthy..."
sleep 10

# Check health
if docker compose ps | grep -q "healthy"; then
    echo ""
    echo "✅ JARVIS is LIVE!"
    echo ""
    echo "📊 Services Status:"
    docker compose ps
    echo ""
    echo "🌐 Dashboard: http://187.124.45.161:18789"
    echo "💬 Telegram: @Jarvis1015Bot"
    echo ""
    echo "🦞🔥 JARVIS at your service, sir!"
else
    echo "⚠️  Gateway may still be starting. Check logs with:"
    echo "   docker compose logs -f openclaw-gateway"
fi