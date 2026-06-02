#!/bin/bash
# JARVIS Core - Health Check Script
# Work Package A3: Verifies all services are healthy
# Resolves: H7 (healthchecks)

set -e

echo "=========================================="
echo "JARVIS Core - Health Check"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    exit 1
fi

echo "OK: Docker is running"
echo ""

# Check container status
echo "Container Status:"
echo "----------------------------------------"
docker compose ps

echo ""
echo "Health Status:"
echo "----------------------------------------"

# Function to check service health
check_health() {
    local service=$1
    local url=$2
    local name=$3

    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "OK: $name is healthy"
        return 0
    else
        echo "WARN: $name health check failed"
        return 1
    fi
}

# Check each service
HEALTHY=0
TOTAL=0

# Check Supabase DB
TOTAL=$((TOTAL + 1))
if docker compose exec -T supabase-db pg_isready -U postgres > /dev/null 2>&1; then
    echo "OK: Supabase DB is healthy"
    HEALTHY=$((HEALTHY + 1))
else
    echo "WARN: Supabase DB is not ready"
fi

# Check Supabase Kong
TOTAL=$((TOTAL + 1))
if check_health "supabase-kong" "http://localhost:8000/status" "Supabase Kong"; then
    HEALTHY=$((HEALTHY + 1))
fi

# Check Supabase Auth
TOTAL=$((TOTAL + 1))
if check_health "supabase-auth" "http://localhost:9999/health" "Supabase Auth"; then
    HEALTHY=$((HEALTHY + 1))
fi

# Check Supabase REST
TOTAL=$((TOTAL + 1))
if check_health "supabase-rest" "http://localhost:3000/" "Supabase REST"; then
    HEALTHY=$((HEALTHY + 1))
fi

# Check API
TOTAL=$((TOTAL + 1))
if check_health "api" "http://localhost:3001/health" "JARVIS API"; then
    HEALTHY=$((HEALTHY + 1))
fi

# Check Web
TOTAL=$((TOTAL + 1))
if check_health "web" "http://localhost:3000/" "JARVIS Web"; then
    HEALTHY=$((HEALTHY + 1))
fi

# Check Nginx
TOTAL=$((TOTAL + 1))
if check_health "nginx" "http://localhost:80/health" "Nginx"; then
    HEALTHY=$((HEALTHY + 1))
fi

echo ""
echo "----------------------------------------"
echo "Health Summary: $HEALTHY/$TOTAL services healthy"

# Check resource usage
echo ""
echo "Resource Usage:"
echo "----------------------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Check for recent errors
echo ""
echo "Recent Errors (last 10):"
echo "----------------------------------------"
docker compose logs --tail=10 2>&1 | grep -i "error\|fail\|unhealthy" || echo "No recent errors found"

echo ""
echo "=========================================="
if [ $HEALTHY -eq $TOTAL ]; then
    echo "OK: All services are healthy!"
else
    echo "WARN: Some services are not healthy"
    echo "Run 'docker compose logs -f' to see detailed logs"
fi
echo "=========================================="
echo ""
