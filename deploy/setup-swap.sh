#!/usr/bin/env bash
#
# setup-swap.sh — idempotent 2-4 GB swapfile for the co-tenant VPS.
#
# The VPS has 0 B swap; with ~4 GB JARVIS (api+hermes+redis+socket-proxy)
# + ~1.6 GB Frappe on a 7.6 GB box, swap is the cushion. Idempotent:
# re-runs detect the existing swap and are a no-op.
#
# Usage: sudo ./deploy/setup-swap.sh [size_in_GB]
# Default size: 2 GB (pass 4 for the larger cushion).
#
set -euo pipefail

SIZE_GB="${1:-2}"
SWAPFILE="/swapfile"

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must run as root (sudo $0)" >&2
  exit 1
fi

# Clamp to a sensible range
if ! [[ "$SIZE_GB" =~ ^[0-9]+$ ]] || [[ "$SIZE_GB" -lt 1 ]] || [[ "$SIZE_GB" -gt 8 ]]; then
  echo "ERROR: size_in_GB must be an integer between 1 and 8 (got '$SIZE_GB')" >&2
  exit 1
fi

# ---- Check existing swap on the same path ----
if swapon --show=NAME --noheadings | grep -qx "$SWAPFILE"; then
  EXISTING_BYTES=$(stat -c %s "$SWAPFILE" 2>/dev/null || echo 0)
  EXISTING_GB=$((EXISTING_BYTES / 1024 / 1024 / 1024))
  if [[ "$EXISTING_GB" -eq "$SIZE_GB" ]]; then
    echo "✅ swap already configured: $SWAPFILE (${EXISTING_GB} GB)"
    swapon --show
    exit 0
  fi
  echo "swapfile $SWAPFILE exists at ${EXISTING_GB} GB (wanted ${SIZE_GB} GB). Recreating."
  swapoff "$SWAPFILE" 2>/dev/null || true
  rm -f "$SWAPFILE"
fi

# ---- Allocate swapfile ----
echo "Allocating ${SIZE_GB} GB swapfile at $SWAPFILE..."
if command -v fallocate >/dev/null; then
  fallocate -l "${SIZE_GB}G" "$SWAPFILE"
else
  # Fallback if fallocate is missing (some minimal images)
  dd if=/dev/zero of="$SWAPFILE" bs=1M count="$((SIZE_GB * 1024))" status=none
fi
chmod 600 "$SWAPFILE"
mkswap "$SWAPFILE"
swapon "$SWAPFILE"

# ---- Persist across reboots ----
if ! grep -qE "^${SWAPFILE//\//\\\/}[[:space:]]+none[[:space:]]+swap" /etc/fstab; then
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
  echo "✅ added $SWAPFILE to /etc/fstab"
fi

# ---- Tune swappiness (lower = prefer RAM; 10 is consensus for app servers) ----
sysctl -w vm.swappiness=10 >/dev/null
if [[ ! -f /etc/sysctl.d/99-jarvis-swap.conf ]]; then
  echo "vm.swappiness=10" > /etc/sysctl.d/99-jarvis-swap.conf
  echo "✅ persisted vm.swappiness=10 to /etc/sysctl.d/99-jarvis-swap.conf"
fi

echo
echo "✅ swap configured:"
swapon --show
free -h
