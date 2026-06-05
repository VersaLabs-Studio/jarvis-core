# JARVIS Core - Development Setup Guide

## Overview

This guide covers the local development setup for JARVIS Core using Docker Compose. The setup includes all required services: Supabase (PostgreSQL, Kong, Auth, REST, Storage, Realtime), Fastify API, Next.js Web, and Nginx reverse proxy.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git**
- **Node.js** v18+ (for local development outside Docker)

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd jarvis-core

# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required: POSTGRES_PASSWORD, JWT_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 2. Start Services

```bash
# Start all services
./scripts/dev.sh

# Or manually:
docker compose up -d
```

### 3. Verify Installation

```bash
# Check health
./scripts/health-check.sh

# View logs
docker compose logs -f
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Web** | 3000 | Next.js frontend application |
| **API** | 3001 | Fastify backend API |
| **Kong** | 8000 | Supabase API gateway |
| **DB** | 5432 | PostgreSQL database |
| **Auth** | 9999 | GoTrue authentication |
| **REST** | 3000 | PostgREST API |
| **Storage** | 5000 | File storage |
| **Realtime** | 4000 | WebSocket server |
| **Nginx** | 80 | Reverse proxy |

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password (min 32 chars) | `your_secure_password_here_32chars` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your_jwt_secret_here_32chars_min` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `GITHUB_TOKEN` | GitHub personal access token | - |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - |
| `SITE_URL` | Site URL for auth redirects | `http://localhost:3000` |

## Architecture

### Network Architecture

```
                    +------------------+
                    |     Nginx        |
                    |    (port 80)     |
                    +------------------+
                            |
            +---------------+---------------+
            |                               |
    +-------v-------+             +--------v--------+
    |   JARVIS API  |             |   JARVIS Web    |
    |   (port 3001) |             |   (port 3000)   |
    +----------------+             +-----------------+
            |                               |
            +---------------+---------------+
                            |
                    +-------v-------+
                    |   Kong        |
                    |  (port 8000)  |
                    +----------------+
                            |
            +---------------+---------------+
            |               |               |
    +-------v-------+ +----v-----+ +-------v-------+
    |   Auth        | | REST     | | Storage       |
    | (port 9999)   | |(port 3000)| | (port 5000)   |
    +----------------+ +----------+ +----------------+
            |               |               |
            +---------------+---------------+
                            |
                    +-------v-------+
                    |  PostgreSQL   |
                    |  (port 5432)  |
                    +----------------+
```

### Security Features

- **H1 Fix**: Docker socket proxy instead of raw `docker.sock` access
- **H7 Fix**: Memory limits and healthchecks on all services
- **B3 Fix**: Rate limiting in Nginx `http{}` context
- **Internal Networks**: Supabase services on isolated network
- **Security Headers**: XSS protection, content type options, frame options

## Development Workflow

### Starting Development

```bash
# Start all services
./scripts/dev.sh

# Watch logs
docker compose logs -f api web
```

### Stopping Services

```bash
# Stop all services
./scripts/stop.sh

# Stop and remove volumes
docker compose down -v
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 api
```

### Rebuilding Services

```bash
# Rebuild specific service
docker compose build api

# Rebuild and restart
docker compose up -d --build api
```

## Database Management

### Running Migrations

```bash
# Place migration files in supabase/migrations/
# They will run automatically on first start

# Manual migration
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migration.sql
```

### Connecting to Database

```bash
# Using psql
docker compose exec supabase-db psql -U postgres -d postgres

# Connection string
postgres://postgres:<password>@localhost:5432/postgres
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs

# Check resource usage
docker stats

# Restart specific service
docker compose restart api
```

### Database Connection Issues

```bash
# Check if database is healthy
docker compose exec supabase-db pg_isready -U postgres

# Check database logs
docker compose logs supabase-db

# Reset database
docker compose down -v
docker compose up -d supabase-db
```

### Port Conflicts

```bash
# Check what's using a port
netstat -ano | findstr :3000

# Stop conflicting service
# Or change port in .env
```

### Memory Issues

```bash
# Check memory usage
docker stats

# Increase Docker Desktop memory allocation
# Or reduce mem_limit in docker-compose.yml
```

### Health Check Failures

```bash
# Run health check script
./scripts/health-check.sh

# Check specific service health
docker compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' jarvis-api
```

## Audit Findings Addressed

### H1: Docker Socket Security

**Problem**: Raw `docker.sock` access allows container escape.

**Solution**: `docker-socket-proxy` service with restricted permissions:
- Only containers, services, tasks, networks, volumes, images, info
- No exec, no attach, no logs
- Read-only socket mount

### H7: Resource Limits and Healthchecks

**Problem**: No resource limits or health checks on services.

**Solution**: All services have:
- `mem_limit`: Memory limits to prevent OOM
- `healthcheck`: HTTP/TCP health checks
- `restart: unless-stopped`: Auto-restart policy

### B3: Rate Limiting

**Problem**: Rate limiting in wrong context.

**Solution**: Rate limiting in `http{}` context:
- `limit_req_zone` defined in `http{}`
- Applied per location block
- Different limits for API, web, and auth

## Useful Commands

```bash
# Start services
./scripts/dev.sh

# Stop services
./scripts/stop.sh

# Health check
./scripts/health-check.sh

# View logs
docker compose logs -f

# Rebuild all
docker compose build --no-cache

# Clean everything
docker compose down -v --rmi all

# Enter container
docker compose exec api sh

# Database shell
docker compose exec supabase-db psql -U postgres
```

## Next Steps

1. Configure your `.env` file with actual values
2. Run `./scripts/dev.sh` to start services
3. Access the web app at `http://localhost:3000`
4. Access the API at `http://localhost:3001`
5. Review the [Architecture Documentation](ARCHITECTURE.md) for system design
