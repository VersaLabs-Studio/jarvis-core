#!/bin/bash
# JARVIS Health Check Script
# Checks the health of all JARVIS services

set -e

echo "🦞 JARVIS Health Check"
echo "======================"
echo ""

# Navigate to openclaw directory
cd ~/openclaw

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    exit 1
fi

echo "✅ Docker is running"

# Check container status
echo ""
echo "📊 Container Status:"
echo "-------------------"
docker compose ps

# Check gateway health
echo ""
echo "🔍 Gateway Health:"
echo "------------------"
if curl -s http://localhost:18789/health > /dev/null 2>&1; then
    echo "✅ Gateway is healthy (port 18789)"
else
    echo "⚠️  Gateway health check failed"
fi

# Check resource usage
echo ""
echo "📈 Resource Usage:"
echo "------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Check recent logs for errors
echo ""
echo "⚠️  Recent Errors (last 10):"
echo "----------------------------"
docker compose logs --tail=10 2>&1 | grep -i "error\|fail\|unhealthy" || echo "No recent errors found"

echo ""
echo "======================"
echo "🦞 Health check complete!"