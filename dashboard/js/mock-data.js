// JARVIS Dashboard - Mock Data
// Realistic data for demo purposes

const MockData = {
  // System Info
  system: {
    name: "JARVIS Core",
    version: "1.1",
    vps: {
      provider: "Hostinger",
      plan: "KVM-4",
      cpu: "4 vCPU",
      ram: "16 GB",
      storage: "200 GB NVMe",
      ip: "187.124.45.161"
    },
    uptime: "14 days, 7 hours, 23 minutes",
    openclawVersion: "latest",
    dockerVersion: "24.x"
  },

  // Services Status
  services: [
    {
      name: "OpenClaw Gateway",
      container: "jarvis-gateway",
      status: "healthy",
      ports: ["18789", "18790", "18791"],
      uptime: "14d 7h",
      health: "✓ Healthy"
    },
    {
      name: "GitHub MCP",
      container: "jarvis-mcp-github",
      status: "healthy",
      ports: ["9234"],
      uptime: "14d 6h",
      health: "✓ Healthy",
      package: "@modelcontextprotocol/server-github"
    },
    {
      name: "Vercel MCP",
      container: "jarvis-mcp-vercel",
      status: "healthy",
      ports: ["9235"],
      uptime: "14d 6h",
      health: "✓ Healthy",
      package: "@vercel/mcp-server"
    },
    {
      name: "Notion MCP",
      container: "jarvis-mcp-notion",
      status: "healthy",
      ports: ["9236"],
      uptime: "14d 5h",
      health: "✓ Healthy",
      package: "@notionhq/notion-mcp-server"
    },
    {
      name: "Browser MCP",
      container: "jarvis-mcp-browser",
      status: "healthy",
      ports: ["9237"],
      uptime: "14d 5h",
      health: "✓ Healthy",
      package: "@anthropic/mcp-server-browser"
    },
    {
      name: "Gmail MCP",
      container: "jarvis-mcp-gmail",
      status: "pending",
      ports: [],
      uptime: "N/A",
      health: "⏳ Pending OAuth",
      package: "@modelcontextprotocol/server-gmail"
    }
  ],

  // Model Routing
  models: {
    routing: [
      { task: "Planning", primary: "NVIDIA Nemotron-3-Super:free", fallback: ["GLM-5-Turbo", "MiniMax-M2.5:free"] },
      { task: "Coding", primary: "NVIDIA Nemotron-3-Super:free", fallback: ["MiniMax-M2.5:free", "GLM-5-Turbo"] },
      { task: "Office", primary: "MiniMax M2.5:free", fallback: ["Nemotron-3-Super:free"] },
      { task: "Fast", primary: "GLM-5-Turbo", fallback: ["Nemotron-3-Super:free"] }
    ],
    available: [
      { name: "NVIDIA Nemotron-3-Super:free", type: "free", context: "128k", useCase: "Planning, Coding" },
      { name: "MiniMax M2.5:free", type: "free", context: "100k", useCase: "SWE-Bench, Office" },
      { name: "GLM-5-Turbo", type: "paid", context: "128k", useCase: "Fast execution" },
      { name: "Step-3.5-free", type: "free", context: "64k", useCase: "Fallback" }
    ],
    usage: {
      totalTokens: 1245678,
      byModel: [
        { name: "Nemotron-3-Super", tokens: 856432, percentage: 68.7 },
        { name: "MiniMax M2.5", tokens: 234567, percentage: 18.8 },
        { name: "GLM-5-Turbo", tokens: 154679, percentage: 12.5 }
      ]
    }
  },

  // MCP Integrations
  integrations: [
    { name: "GitHub", status: "configured", icon: "github", tools: 12, package: "@modelcontextprotocol/server-github" },
    { name: "Vercel", status: "configured", icon: "vercel", tools: 8, package: "@vercel/mcp-server" },
    { name: "Notion", status: "configured", icon: "notion", tools: 10, package: "@notionhq/notion-mcp-server" },
    { name: "Browser", status: "configured", icon: "browser", tools: 15, package: "@anthropic/mcp-server-browser" },
    { name: "Gmail", status: "pending-oauth", icon: "gmail", tools: 18, package: "@modelcontextprotocol/server-gmail" },
    { name: "VS Code", status: "pending", icon: "vscode", tools: 0, package: "TBD" },
    { name: "Shell/File", status: "pending", icon: "terminal", tools: 0, package: "TBD" }
  ],

  // Workflows
  workflows: [
    {
      name: "Morning Audit",
      schedule: "0 8 * * *",
      description: "Daily system health check and task summary",
      lastRun: "2026-04-23 08:00:00",
      nextRun: "2026-04-24 08:00:00",
      status: "enabled",
      lastOutput: "✓ All systems operational. 3 PRs pending review."
    },
    {
      name: "Deploy Pipeline",
      schedule: "Manual",
      description: "Plan → Code → Commit → Deploy → Update Docs",
      lastRun: "2026-04-22 14:30:00",
      nextRun: "N/A",
      status: "manual",
      lastOutput: "✓ Successfully deployed to Vercel"
    }
  ],

  // Cron Jobs
  cronJobs: [
    { id: 1, schedule: "0 8 * * *", command: "/workflows/morning-audit.sh", lastRun: "2026-04-23 08:00", nextRun: "2026-04-24 08:00", enabled: true },
    { id: 2, schedule: "0 * * * *", command: "docker ps | grep -q jarvis-gateway", lastRun: "2026-04-23 21:00", nextRun: "2026-04-23 22:00", enabled: true },
    { id: 3, schedule: "0 2 * * *", command: "git -C /home/node/.openclaw backup", lastRun: "2026-04-23 02:00", nextRun: "2026-04-24 02:00", enabled: true }
  ],

  // Log Entries
  logs: [
    { timestamp: "2026-04-23 21:43:01", level: "INFO", service: "openclaw-gateway", message: "Morning audit completed successfully" },
    { timestamp: "2026-04-23 21:43:00", level: "INFO", service: "openclaw-gateway", message: "Checking GitHub PRs..." },
    { timestamp: "2026-04-23 21:42:58", level: "INFO", service: "mcp-github", message: "Found 3 open PRs in jarvis-core" },
    { timestamp: "2026-04-23 21:42:55", level: "INFO", service: "openclaw-gateway", message: "Starting morning audit workflow" },
    { timestamp: "2026-04-23 14:30:12", level: "INFO", service: "mcp-vercel", message: "Deployment successful: jarvis-dashboard" },
    { timestamp: "2026-04-23 14:30:10", level: "INFO", service: "openclaw-gateway", message: "Deploy pipeline triggered" },
    { timestamp: "2026-04-23 08:00:00", level: "INFO", service: "morning-audit", message: "Daily audit: All systems healthy" },
    { timestamp: "2026-04-22 14:30:00", level: "INFO", service: "deploy-pipeline", message: "Feature X shipped successfully" },
    { timestamp: "2026-04-22 10:15:33", level: "WARN", service: "mcp-gmail", message: "OAuth token expired, refresh needed" },
    { timestamp: "2026-04-21 16:45:22", level: "ERROR", service: "mcp-notion", message: "API rate limit reached, retrying..." }
  ],

  // Chat Messages
  chatMessages: [
    { sender: "user", message: "Jarvis, morning audit", timestamp: "2026-04-23 08:00:00" },
    { sender: "jarvis", message: "Running morning audit...\n\n✓ System health: All services operational\n✓ GitHub: 3 PRs pending review\n✓ Notion: 5 tasks due this week\n✓ VPS: CPU 12%, RAM 38%, Disk 45%\n\nDaily plan generated. Would you like me to send it to Telegram?", timestamp: "2026-04-23 08:00:05", model: "Nemotron-3-Super:free" },
    { sender: "user", message: "Yes, send to Telegram", timestamp: "2026-04-23 08:00:10" },
    { sender: "jarvis", message: "✓ Summary sent to Telegram (@Jarvis1015Bot)", timestamp: "2026-04-23 08:00:12" },
    { sender: "user", message: "Jarvis, ship feature X", timestamp: "2026-04-22 14:30:00" },
    { sender: "jarvis", message: "Starting deploy pipeline...\n\n1. Planning with Nemotron-3-Super ✓\n2. Coding implementation ✓\n3. Git commit created ✓\n4. Deployed to Vercel ✓\n5. Notion docs updated ✓\n\nFeature X shipped successfully!", timestamp: "2026-04-22 14:30:15", model: "MiniMax M2.5:free", tools: ["GitHub MCP", "Vercel MCP", "Notion MCP"] }
  ],

  // Analytics
  analytics: {
    totalMessages: 1247,
    mcpToolCalls: 3891,
    tasksCompleted: 156,
    successRate: 98.3,
    costSavings: {
      vsChatGPT: "$2,847",
      vsClaude: "$1,923",
      vsCopilot: "$3,241"
    },
    dailyActiveTime: "6.2 hours avg",
    modelDistribution: [
      { model: "Nemotron-3-Super", percentage: 68.7, color: "#ffffff" },
      { model: "MiniMax M2.5", percentage: 18.8, color: "#a1a1aa" },
      { model: "GLM-5-Turbo", percentage: 12.5, color: "#71717a" }
    ]
  },

  // Config Files
  configFiles: [
    { name: "openclaw.json", path: "config/openclaw.json", type: "json", size: "2.4 KB" },
    { name: "models.yaml", path: "config/models.yaml", type: "yaml", size: "1.1 KB" },
    { name: "github.yaml", path: "config/mcp-servers/github.yaml", type: "yaml", size: "0.8 KB" },
    { name: "vercel.yaml", path: "config/mcp-servers/vercel.yaml", type: "yaml", size: "0.7 KB" },
    { name: "notion.yaml", path: "config/mcp-servers/notion.yaml", type: "yaml", size: "0.9 KB" },
    { name: "browser.yaml", path: "config/mcp-servers/browser.yaml", type: "yaml", size: "0.6 KB" },
    { name: "gmail.yaml", path: "config/mcp-servers/gmail.yaml", type: "yaml", size: "0.5 KB" }
  ],

  // Environment Variables (masked)
  envVars: [
    { name: "OPENROUTER_API_KEY", value: "sk-or-v1-****-****-****-****", masked: true },
    { name: "GITHUB_TOKEN", value: "ghp_****-****-****-****", masked: true },
    { name: "VERCEL_TOKEN", value: "****-****-****-****", masked: true },
    { name: "NOTION_API_KEY", value: "secret_****-****-****", masked: true },
    { name: "TELEGRAM_BOT_TOKEN", value: "****:****-****-****", masked: true },
    { name: "GATEWAY_TOKEN", value: "****-****-****-****", masked: true }
  ]
};

// Helper function to get status color
function getStatusColor(status) {
  const colors = {
    'healthy': 'rgba(74, 222, 128, 0.9)',
    'configured': 'rgba(74, 222, 128, 0.9)',
    'enabled': 'rgba(74, 222, 128, 0.9)',
    'degraded': 'rgba(251, 191, 36, 0.9)',
    'pending': 'rgba(251, 191, 36, 0.9)',
    'pending-oauth': 'rgba(251, 191, 36, 0.9)',
    'error': 'rgba(248, 113, 113, 0.9)',
    'disabled': 'rgba(161, 161, 170, 0.6)'
  };
  return colors[status] || 'rgba(161, 161, 170, 0.6)';
}

// Helper function to get status badge
function getStatusBadge(status) {
  const color = getStatusColor(status);
  return `<span class="px-2 py-1 text-xs rounded" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">${status}</span>`;
}
