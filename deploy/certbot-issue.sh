#!/usr/bin/env bash
#
# certbot-issue.sh — idempotent Let's Encrypt cert issuance for
#   api.jarvis.versalabs-studio.com (Phase F F1 rebuild).
#
# Order of operations (all idempotent — re-runs are no-ops):
#   1. Ensure webroot + http{} context additions are in place
#      (deploy/nginx-jarvis-http.conf → /etc/nginx/conf.d/jarvis-http.conf)
#   2. Drop the 80-vhost (ACME + redirect) into conf.d
#      (deploy/nginx-jarvis-server.conf → /etc/nginx/conf.d/jarvis-80.conf)
#   3. nginx -t && systemctl reload nginx
#   4. certbot certonly --webroot for the domain (skip if cert exists)
#   5. After issuance, drop the 443-vhost (proxy + WS) into conf.d
#      (deploy/nginx-jarvis-https.conf → /etc/nginx/conf.d/jarvis-https.conf)
#   6. nginx -t && systemctl reload nginx
#
# Requires: nginx, certbot, /var/www/certbot webroot. The host nginx must
# include /etc/nginx/conf.d/*.conf in its http{} block (Debian default).
# deploy/setup-vps.sh handles the one-time setup of all of this.
#
# Usage: sudo ./deploy/certbot-issue.sh
#
set -euo pipefail

# ---- Config ----
DOMAIN="api.jarvis.versalabs-studio.com"
EMAIL="${CERTBOT_EMAIL:-kidus@versalabs.dev}"  # override via env
WEBROOT="/var/www/certbot"
NGINX_CONF_D="${NGINX_CONF_D:-/etc/nginx/conf.d}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VHOST_HTTP_SRC="$SCRIPT_DIR/nginx-jarvis-http.conf"
VHOST_80_SRC="$SCRIPT_DIR/nginx-jarvis-server.conf"
VHOST_443_SRC="$SCRIPT_DIR/nginx-jarvis-https.conf"

# ---- Sanity ----
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must run as root (sudo $0)" >&2
  exit 1
fi

for f in "$VHOST_HTTP_SRC" "$VHOST_80_SRC" "$VHOST_443_SRC"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing source $f" >&2
    exit 1
  fi
done

if ! command -v certbot >/dev/null; then
  echo "ERROR: certbot not installed. Run: apt-get install -y certbot" >&2
  exit 1
fi

if ! command -v nginx >/dev/null; then
  echo "ERROR: nginx not installed. Run: apt-get install -y nginx" >&2
  exit 1
fi

# ---- Step 1: webroot + http{} context additions ----
mkdir -p "$WEBROOT"
chmod 755 "$WEBROOT"

if [[ ! -f "$NGINX_CONF_D/jarvis-http.conf" ]]; then
  echo "[1/6] installing http{} context additions → $NGINX_CONF_D/jarvis-http.conf"
  install -m 644 "$VHOST_HTTP_SRC" "$NGINX_CONF_D/jarvis-http.conf"
else
  echo "[1/6] http{} additions already present (skipping)"
fi

# ---- Step 2: 80-vhost (ACME + redirect) ----
if [[ ! -f "$NGINX_CONF_D/jarvis-80.conf" ]]; then
  echo "[2/6] installing 80-vhost → $NGINX_CONF_D/jarvis-80.conf"
  install -m 644 "$VHOST_80_SRC" "$NGINX_CONF_D/jarvis-80.conf"
else
  echo "[2/6] 80-vhost already present (skipping)"
fi

# ---- Step 3: reload + validate nginx ----
echo "[3/6] nginx -t && reload"
nginx -t
systemctl reload nginx

# ---- Step 4: certbot issue (skip if cert already exists) ----
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  echo "[4/6] cert for $DOMAIN already issued (skipping)"
else
  echo "[4/6] requesting cert for $DOMAIN (webroot: $WEBROOT)"
  certbot certonly \
    --webroot -w "$WEBROOT" \
    -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$EMAIL" \
    --cert-name "$DOMAIN"
fi

# ---- Step 5: 443-vhost (after cert exists) ----
if [[ ! -f "$NGINX_CONF_D/jarvis-https.conf" ]]; then
  echo "[5/6] installing 443-vhost → $NGINX_CONF_D/jarvis-https.conf"
  install -m 644 "$VHOST_443_SRC" "$NGINX_CONF_D/jarvis-https.conf"
  nginx -t
  systemctl reload nginx
else
  echo "[5/6] 443-vhost already present (skipping)"
fi

# ---- Step 6: verify ----
echo
echo "[6/6] verifying HTTPS for $DOMAIN"
if curl -fsSI --max-time 10 "https://$DOMAIN/health" >/dev/null 2>&1; then
  echo "  ✅ https://$DOMAIN/health → 200 (TLS path is live)"
else
  echo "  ⚠️  https://$DOMAIN/health did not return 200 — check:"
  echo "     - DNS: nslookup $DOMAIN (should resolve to this box's public IP)"
  echo "     - cert: ls -l /etc/letsencrypt/live/$DOMAIN/"
  echo "     - nginx: systemctl status nginx && journalctl -u nginx -n 30"
  echo "     - api:  curl -fsS http://127.0.0.1:3001/health"
fi

echo
echo "✅ certbot-issue.sh complete for $DOMAIN"
