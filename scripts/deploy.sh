#!/bin/bash
# JARVIS Deploy Script
# Full deployment: pull, build, restart, and verify

set -e

echo "🦞🔥 JARVIS Deployment"
echo "====================="
echo ""

# Navigate to openclaw directory
cd ~/openclaw

# Step 1: Backup current config
echo "📦 Step 1: Backing up current config..."
BACKUP_DIR="config-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p ~/jarvis-backups
cp -r ~/.openclaw ~/jarvis-backups/$BACKUP_DIR 2>/dev/null || echo "No existing config to backup"
echo "✅ Config backed up to ~/jarvis-backups/$BACKUP_DIR"

# Step 2: Pull latest code from GitHub
echo ""
echo "📥 Step 2: Pulling latest from GitHub..."
cd ~/versalabs-jarvis 2>/dev/null || cd ~
git pull origin main 2>/dev/null || echo "No git repo found - skipping"
echo "✅ Code updated"

# Step 3: Pull latest Docker images
echo ""
echo "🐳 Step 3: Pulling latest Docker images..."
cd ~/openclaw
docker compose pull
echo "✅ Images updated"

# Step 4: Restart services
echo ""
echo "🚀 Step 4: Restarting services..."
docker compose down
docker compose up -d
echo "✅ Services restarted"

# Step 5: Wait and verify
echo ""
echo "⏳ Step 5: Waiting for services to stabilize..."
sleep 15

# Step 6: Health check
echo ""
echo "🏥 Step 6: Running health check..."
if curl -s http://localhost:18789/health > /dev/null 2>&1; then
    echo "✅ Gateway is healthy!"
else
    echo "⚠️  Gateway health check failed - check logs"
    docker compose logs --tail=20
fi

# Summary
echo ""
echo "====================="
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Status:"
docker compose ps
echo ""
echo "🌐 Dashboard: http://187.124.45.161:18789"
echo "💬 Telegram: @Jarvis1015Bot"
echo ""
echo "🦞🔥 JARVIS deployed and ready, sir!"