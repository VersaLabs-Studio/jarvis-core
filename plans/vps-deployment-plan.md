# VPS Deployment Plan - Phase 2b

**Created:** 2026-04-01 | **Priority:** High | **Risk Level:** Medium (other projects on VPS)

---

## Important Notes

- **VPS has other projects** - We must be careful not to interfere with existing services
- **OpenClaw already deployed** - We're integrating, not reinstalling
- **jarvis user exists** - We'll work under this user only
- **Step-by-step guidance** - Each step will be verified before proceeding

---

## Step 1: Assess Current VPS Status

**Goal:** Understand what's currently running without making any changes.

### Commands to run on VPS (as jarvis user):

```bash
# 1. Check who you are
whoami

# 2. Check current directory
pwd

# 3. Check if OpenClaw is running
docker ps

# 4. Check OpenClaw directory structure
ls -la ~/openclaw/

# 5. Check OpenClaw config
cat ~/openclaw/.openclaw/openclaw.json 2>/dev/null || echo "Config not found at expected path"

# 6. Check existing Docker networks
docker network ls

# 7. Check existing Docker volumes
docker volume ls

# 8. Check disk usage (ensure we have space)
df -h

# 9. Check if git is installed
git --version

# 10. Check if there are other project directories
ls -la ~/
```

**What to look for:**
- OpenClaw container status
- Existing Docker networks/volumes (don't conflict)
- Available disk space
- Other project directories (avoid interference)

---

## Step 2: Clone jarvis-core Repository

**Goal:** Get the repo onto the VPS safely.

### Commands:

```bash
# Navigate to jarvis user home
cd ~

# Clone the repository (replace with your actual repo URL)
git clone https://github.com/kidusabdula/jarvis-core.git

# Verify clone
ls -la jarvis-core/

# Navigate into the project
cd jarvis-core
```

---

## Step 3: Set Up Environment Variables

**Goal:** Configure API tokens securely.

### Commands:

```bash
# Copy the example env file
cp .env.example .env

# Edit the .env file (use nano or vim)
nano .env

# Fill in these values:
# OPENROUTER_API_KEY=your_actual_key
# GITHUB_TOKEN=ghp_your_token
# VERCEL_TOKEN=your_vercel_token
# NOTION_API_KEY=your_notion_key
# TELEGRAM_BOT_TOKEN=your_telegram_token
# GATEWAY_TOKEN=generate_or_use_existing
# TELEGRAM_ALLOW_FROM=343865518

# Secure the .env file
chmod 600 .env
```

---

## Step 4: Backup Existing OpenClaw Config

**Goal:** Safety first - backup before any changes.

### Commands:

```bash
# Create backup directory
mkdir -p ~/openclaw-backup-$(date +%Y%m%d)

# Copy existing config
cp -r ~/openclaw/* ~/openclaw-backup-$(date +%Y%m%d)/

# Verify backup
ls -la ~/openclaw-backup-$(date +%Y%m%d)/
```

---

## Step 5: Deploy MCP Services (One at a Time)

**Goal:** Add MCP services without disrupting existing services.

### 5a. Start with GitHub MCP only:

```bash
cd ~/jarvis-core

# Start only GitHub MCP
docker compose up -d mcp-github

# Check status
docker compose ps mcp-github

# Check logs
docker compose logs mcp-github
```

### 5b. Then Notion MCP:

```bash
docker compose up -d mcp-notion
docker compose ps mcp-notion
docker compose logs mcp-notion
```

### 5c. Then Vercel MCP:

```bash
docker compose up -d mcp-vercel
docker compose ps mcp-vercel
docker compose logs mcp-vercel
```

### 5d. Then Browser MCP:

```bash
docker compose up -d mcp-browser
docker compose ps mcp-browser
docker compose logs mcp-browser
```

---

## Step 6: Update OpenClaw Configuration

**Goal:** Point OpenClaw to use the new jarvis-core config.

### Options:

**Option A:** Copy config to existing OpenClaw directory
```bash
cp ~/jarvis-core/config/openclaw.json ~/openclaw/.openclaw/
```

**Option B:** Use jarvis-core docker-compose directly
```bash
cd ~/jarvis-core
docker compose --profile all up -d
```

**Recommendation:** Start with Option A (less disruptive), test, then consider Option B.

---

## Step 7: Test Integration

**Goal:** Verify everything works.

### Commands:

```bash
# Check all services
docker compose ps

# Check gateway health
curl http://localhost:18789/health

# Check Telegram bot
# Send message to @Jarvis1015Bot: "Jarvis, status"

# Check logs for errors
docker compose logs --tail=50
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Stop jarvis-core services
cd ~/jarvis-core
docker compose down

# Restore backup
rm -rf ~/openclaw/*
cp -r ~/openclaw-backup-YYYYMMDD/* ~/openclaw/

# Restart original OpenClaw
cd ~/openclaw
docker compose up -d
```

---

## Next Steps After Deployment

1. Test each MCP via Telegram
2. Set up Phase 3 daily workflows
3. Plan custom Next.js dashboard

---

*This plan will be executed step-by-step with verification at each stage.*
