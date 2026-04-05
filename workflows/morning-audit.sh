#!/bin/bash
# JARVIS Morning Audit Script
# Runs daily checks and generates summary

echo "🦞 JARVIS Morning Audit - $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="

# 1. System Health
echo ""
echo "📊 SYSTEM HEALTH"
echo "----------------"
echo "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Uptime: $(uptime -p)"

# 2. Docker Status
echo ""
echo "🐳 DOCKER STATUS"
echo "----------------"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | head -10

# 3. GitHub Status
echo ""
echo "🐙 GITHUB STATUS"
echo "----------------"
echo "Repositories:"
gh repo list kidusabdula --limit 5 --json name,updatedAt,isArchived 2>/dev/null | python3 -c "
import json,sys
repos = json.load(sys.stdin)
for r in repos:
    print(f\"  • {r['name']} (updated: {r['updatedAt'][:10]})\")
" 2>/dev/null || echo "  (GitHub CLI not available)"

# 4. Recent commits
echo ""
echo "📝 RECENT COMMITS (jarvis-core)"
echo "----------------"
cd /home/jarvis/jarvis-core 2>/dev/null && git log --oneline -5 2>/dev/null || echo "  (Not a git repo)"

# 5. OpenClaw Status
echo ""
echo "🤖 OPENCLAW STATUS"
echo "----------------"
curl -s http://localhost:18789/healthz 2>/dev/null || echo "  (Gateway not responding)"

echo ""
echo "=========================================="
echo "✅ Audit complete. Have a productive day!"
