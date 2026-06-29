#!/usr/bin/env bash
#
# setup-vps.sh — VPS OS hardening for the co-tenant JARVIS deploy (Phase F F1).
#
# Idempotent. Safe to re-run.
#
# This script does NOT:
#   - enable ufw (would sever Frappe's :8080/:9000)
#   - install the JARVIS app stack (that's boot-smoke.sh or `docker compose up -d`)
#   - issue TLS certs (that's certbot-issue.sh)
#
# This script DOES:
#   - install Docker Engine + Compose v2
#   - install base tooling (git, curl, wget, htop, jq, fail2ban, unattended-upgrades)
#   - configure fail2ban (SSH brute-force protection)
#   - enable unattended-upgrades
#   - create the JARVIS install dir at /opt/jarvis
#   - add a jarvis-http.conf include to the host nginx's http{} block
#     (so certbot-issue.sh's rate-limit zones load)
#
# Usage: sudo ./deploy/setup-vps.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must run as root (sudo $0)" >&2
  exit 1
fi

# ---- 1. apt update + base tooling ----
echo "[1/6] apt update + base packages"
apt-get update -y
apt-get install -y --no-install-recommends \
  git curl wget htop jq ca-certificates gnupg lsb-release \
  fail2ban unattended-upgrades nginx certbot python3-certbot-nginx

# ---- 2. Docker Engine + Compose v2 (official convenience script) ----
if ! command -v docker >/dev/null; then
  echo "[2/6] installing Docker Engine"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  echo "✅ Docker installed: $(docker --version)"
else
  echo "[2/6] Docker already installed: $(docker --version)"
fi

# ---- 3. fail2ban (SSH protection) ----
if [[ ! -f /etc/fail2ban/jail.local ]]; then
  echo "[3/6] configuring fail2ban (SSH jail)"
  cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
backend = systemd
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = %(sshd_log)s
EOF
  systemctl enable --now fail2ban
  echo "✅ fail2ban enabled"
else
  echo "[3/6] fail2ban already configured"
fi

# ---- 4. unattended-upgrades ----
echo "[4/6] configuring unattended-upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

# ---- 5. /opt/jarvis ----
JARVIS_USER="${SUDO_USER:-root}"
if [[ ! -d /opt/jarvis ]]; then
  echo "[5/6] creating /opt/jarvis (owned by $JARVIS_USER)"
  mkdir -p /opt/jarvis
  chown "$JARVIS_USER":"$JARVIS_USER" /opt/jarvis
  echo "✅ /opt/jarvis created"
else
  echo "[5/6] /opt/jarvis already exists"
fi

# ---- 6. nginx http{} include (one-time, for certbot-issue.sh) ----
# Only acts if /etc/nginx/nginx.conf is the Debian default.
NGINX_MAIN="/etc/nginx/nginx.conf"
if [[ -f "$NGINX_MAIN" ]] && ! grep -q "include /etc/nginx/conf.d/jarvis-http.conf" "$NGINX_MAIN"; then
  if grep -qE "^[[:space:]]*include[[:space:]]+/etc/nginx/conf\.d/\*\.conf;" "$NGINX_MAIN"; then
    echo "[6/6] adding jarvis-http.conf include to nginx http{}"
    cp "$NGINX_MAIN" "${NGINX_MAIN}.bak.$(date +%Y%m%d-%H%M%S)"
    # Insert our include right after the existing conf.d include (http{} context)
    sed -i 's|^    include /etc/nginx/conf.d/\*.conf;|    include /etc/nginx/conf.d/*.conf;\n    include /etc/nginx/conf.d/jarvis-http.conf;|' "$NGINX_MAIN"
    nginx -t
    systemctl reload nginx
    echo "✅ nginx http{} now includes conf.d/jarvis-http.conf"
  else
    echo "[6/6] nginx http{} does not include conf.d/*.conf; skipping auto-include (add manually if needed)"
  fi
else
  echo "[6/6] nginx http{} include already present (or nginx not installed yet)"
fi

echo
echo "✅ VPS hardening complete."
echo
echo "Next steps (in order):"
echo "  1. Clone the repo:    cd /opt/jarvis && git clone <repo> ."
echo "  2. Add swap:          sudo /opt/jarvis/deploy/setup-swap.sh 2"
echo "  3. Create .env:       cp .env.example .env  &&  chmod 600 .env  &&  edit"
echo "  4. Start the stack:   cd /opt/jarvis && docker compose up -d"
echo "  5. Boot-smoke:        sudo /opt/jarvis/deploy/boot-smoke.sh"
echo "  6. Issue TLS:         sudo /opt/jarvis/deploy/certbot-issue.sh"
