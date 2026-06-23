#!/usr/bin/env bash
#
# boot-smoke.sh — boot-smoke every node-booted service in the JARVIS compose
# (api + hermes). Also pings redis + docker-socket-proxy as bonus checks.
#
# Idempotent. Re-runs are safe. Exits 0 on all pass, non-zero on any fail.
#
# The directive (Phase F F1 rebuild, 2026-06-14): "Boot-smoke each
# node-booted service before declaring F1 done." This script IS that
# boot-smoke. Both api and hermes must show "listening" in their logs
# AND respond on their health endpoints.
#
# Usage: ./deploy/boot-smoke.sh [--compose-file <path>]
# Default compose file: ./docker-compose.yml (relative to repo root)
#
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-file) COMPOSE_FILE="$2"; shift 2;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

# Resolve repo root (parent of the deploy/ dir this script lives in)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_PATH="$REPO_ROOT/$COMPOSE_FILE"
if [[ ! -f "$COMPOSE_PATH" ]]; then
  echo "ERROR: compose file not found: $COMPOSE_PATH" >&2
  exit 1
fi

cd "$REPO_ROOT"

PASS=0
FAIL=0
declare -a RESULTS=()

# ---- Helpers ----
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); RESULTS+=("PASS  $1"); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL  $1"); }
hdr()  { echo; echo "── $1 ──"; }

# ---- Validate compose ----
hdr "docker compose config"
if docker compose -f "$COMPOSE_PATH" config --quiet 2>/dev/null; then
  ok "compose config validates"
else
  bad "compose config invalid"
  docker compose -f "$COMPOSE_PATH" config 2>&1 | tail -30
  exit 1
fi

# ---- Bring up ----
hdr "docker compose up -d"
docker compose -f "$COMPOSE_PATH" up -d

# ---- Wait for healthy (60s ceiling; 30 polls * 2s) ----
hdr "waiting for services to be healthy"
HEALTHY=0
for i in $(seq 1 30); do
  # Count any container that is restarting OR unhealthy
  UNHEALTHY=$(docker compose -f "$COMPOSE_PATH" ps --status=restarting --status=unhealthy -q 2>/dev/null | wc -l)
  if [[ "$UNHEALTHY" -eq 0 ]]; then
    HEALTHY=1
    ok "all services healthy after ${i} polls (${i}*2s)"
    break
  fi
  sleep 2
done
if [[ "$HEALTHY" -ne 1 ]]; then
  bad "some services are not healthy:"
  docker compose -f "$COMPOSE_PATH" ps
  echo
  echo "Last 30 lines of logs:"
  docker compose -f "$COMPOSE_PATH" logs --tail=30
  exit 1
fi

# ============================================================================
# Node service 1: api (Fastify)
# ============================================================================
hdr "boot-smoke: api (Node)"

if docker compose -f "$COMPOSE_PATH" logs api 2>/dev/null | grep -q "API listening on"; then
  ok "api: 'API listening on' in logs"
else
  bad "api: 'API listening on' NOT in logs"
fi

if curl -fsS --max-time 5 "http://127.0.0.1:3001/health" >/dev/null 2>&1; then
  ok "api: GET /health → 200 (host loopback)"
else
  bad "api: GET /health → not 200 on host loopback"
fi

# Auth envelope check (proves the factory's auth middleware is live)
AUTH_RESP=$(curl -s --max-time 5 "http://127.0.0.1:3001/api/cms/workflows?page=1" 2>/dev/null || true)
if echo "$AUTH_RESP" | grep -q '"code":"UNAUTHENTICATED"'; then
  ok "api: GET /api/cms/workflows?page=1 → 401 UNAUTHENTICATED (auth middleware live)"
else
  bad "api: GET /api/cms/workflows?page=1 → unexpected response: $AUTH_RESP"
fi

# ============================================================================
# Node service 2: hermes (Fastify, INTERNAL ONLY)
# ============================================================================
hdr "boot-smoke: hermes (Node)"

if docker compose -f "$COMPOSE_PATH" logs hermes 2>/dev/null | grep -q "Hermes listening on"; then
  ok "hermes: 'Hermes listening on' in logs"
else
  bad "hermes: 'Hermes listening on' NOT in logs"
fi

# Hermes has no host port — exec into the container for the health probe
if docker compose -f "$COMPOSE_PATH" exec -T hermes wget -qO- "http://127.0.0.1:8765/health" 2>/dev/null | grep -q '"ok":true'; then
  ok "hermes: GET /health → 200 (in-container)"
else
  bad "hermes: GET /health → not 200 (in-container)"
fi

# ============================================================================
# Bonus: redis (not Node, but a core dep)
# ============================================================================
hdr "boot-smoke: redis (bonus)"
if docker compose -f "$COMPOSE_PATH" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
  ok "redis: PING → PONG"
else
  bad "redis: PING → no PONG"
fi

# ============================================================================
# Bonus: docker-socket-proxy (Go, not Node; H1 dep)
# ============================================================================
hdr "boot-smoke: docker-socket-proxy (bonus)"
# FIX C (Phase F Stage-2): the tecnativa image ships wget but NOT curl.
if docker compose -f "$COMPOSE_PATH" exec -T docker-socket-proxy wget -qO- "http://localhost:2375/_ping" >/dev/null 2>&1; then
  ok "socket-proxy: GET /_ping → 200"
else
  bad "socket-proxy: GET /_ping → not 200"
fi

# ============================================================================
# Summary
# ============================================================================
echo
echo "==================================================="
echo "JARVIS boot-smoke: $PASS passed, $FAIL failed"
echo "==================================================="
if [[ "$FAIL" -gt 0 ]]; then
  echo
  echo "Failed checks:"
  printf '  - %s\n' "${RESULTS[@]}" | grep '^FAIL'
  exit 1
fi
echo
echo "✅ Both node-booted services (api, hermes) are live."
echo
echo "Next step: issue TLS via deploy/certbot-issue.sh"
