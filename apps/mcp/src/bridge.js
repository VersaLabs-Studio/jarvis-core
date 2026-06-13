// =============================================================================
// MCP HTTP-to-stdio bridge (Phase E §5.3 E3 — C1 binding).
//
// Each MCP container runs ONE instance of this bridge (with the appropriate
// server name as argv[2]) + ONE stdio MCP server as a child process. The
// bridge exposes three HTTP endpoints:
//
//   GET  /health — { ok, server, uptime_s, tool_count, last_refresh }
//   GET  /tools  — { tools: string[], last_refresh }      (cached; refreshes every 5 min)
//   POST /call   — { name, arguments } → { ok: true, result } | { ok: false, error }
//
// The bridge uses @modelcontextprotocol/sdk's StdioClientTransport to
// forward requests to the npm MCP server (which speaks stdio JSON-RPC).
// No network exposure: the container listens on 0.0.0.0 but only Hermes
// (on the jarvis-internal network) can reach it.
//
// Per-server packages (pinned in the Dockerfile, no -y, no latest):
//   github     → @modelcontextprotocol/server-github@<pin>
//   notion     → @notionhq/notion-mcp-server@<pin>
//   supabase   → @supabase/mcp-server-supabase@<pin>     (corrected from @supabase/mcp-server; C4)
//   browser    → @playwright/mcp@<pin>                    (corrected from @anthropic/mcp-server-browser; C4)
//   filesystem → @modelcontextprotocol/server-filesystem@<pin>
//   gmail      → @gongrzhe/server-gmail-autoauth-mcp@<pin> (community; pending Part 4 §4.6)
// =============================================================================

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createServer } from "node:http";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SERVER_NAME = process.argv[2];
const PORT = parseInt(process.env.MCP_PORT || "8765", 10);
const TOOL_REFRESH_INTERVAL_MS = 5 * 60_000; // refresh tools/list every 5 min

const SERVER_PACKAGES = {
  github: "@modelcontextprotocol/server-github/dist/index.js",
  notion: "@notionhq/notion-mcp-server/dist/index.js",
  supabase: "@supabase/mcp-server-supabase/dist/index.js",
  browser: "@playwright/mcp/dist/index.js",
  filesystem: "@modelcontextprotocol/server-filesystem/dist/index.js",
  gmail: "@gongrzhe/server-gmail-autoauth-mcp/dist/index.js",
};

if (!SERVER_NAME || !SERVER_PACKAGES[SERVER_NAME]) {
  // eslint-disable-next-line no-console
  console.error(`Usage: node bridge.js <server-name>  (one of: ${Object.keys(SERVER_PACKAGES).join(", ")})`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Boot — connect to the stdio MCP server
// ---------------------------------------------------------------------------

const transport = new StdioClientTransport({
  command: "node",
  args: [`node_modules/${SERVER_PACKAGES[SERVER_NAME]}`],
  env: process.env, // forward all env vars (GITHUB_TOKEN, NOTION_TOKEN, etc.)
  stderr: "pipe",
});

const client = new Client(
  { name: `mcp-bridge-${SERVER_NAME}`, version: "1.0.0" },
  { capabilities: {} },
);

await client.connect(transport);

// stderr is consumed; pipe to our stderr for visibility
if (transport.stderr) {
  transport.stderr.on("data", (chunk) => {
    process.stderr.write(`[${SERVER_NAME} stderr] ${chunk.toString()}`);
  });
}

let cachedTools = [];
let lastRefreshAt = 0;
let lastRefreshError = null;

async function refreshTools() {
  try {
    const result = await client.listTools();
    cachedTools = (result.tools ?? []).map((t) => t.name);
    lastRefreshAt = Date.now();
    lastRefreshError = null;
    // eslint-disable-next-line no-console
    console.log(`[${SERVER_NAME}] refreshed tools (${cachedTools.length}): ${cachedTools.join(", ")}`);
  } catch (err) {
    lastRefreshError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`[${SERVER_NAME}] refreshTools failed: ${lastRefreshError}`);
  }
}

await refreshTools();
const refreshTimer = setInterval(refreshTools, TOOL_REFRESH_INTERVAL_MS);
refreshTimer.unref(); // don't keep the process alive just for the refresh

const BOOT_TIME_MS = Date.now();

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const httpServer = createServer(async (req, res) => {
  // CORS — the bridge is internal-only, but Hermes may be on a different origin in dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // GET /health
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        server: SERVER_NAME,
        uptime_s: Math.floor((Date.now() - BOOT_TIME_MS) / 1000),
        tool_count: cachedTools.length,
        last_refresh: lastRefreshAt > 0 ? new Date(lastRefreshAt).toISOString() : null,
        last_refresh_error: lastRefreshError,
      }),
    );
    return;
  }

  // GET /tools
  if (req.method === "GET" && url.pathname === "/tools") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        tools: cachedTools,
        last_refresh: lastRefreshAt > 0 ? new Date(lastRefreshAt).toISOString() : null,
        last_refresh_error: lastRefreshError,
      }),
    );
    return;
  }

  // POST /call
  if (req.method === "POST" && url.pathname === "/call") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const request = JSON.parse(body);
        if (typeof request.name !== "string" || request.name.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "name is required" }));
          return;
        }
        if (!cachedTools.includes(request.name)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: `TOOL_NOT_FOUND: ${request.name}` }));
          return;
        }
        const result = await client.callTool({ name: request.name, arguments: request.arguments ?? {} });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, result }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[${SERVER_NAME}] MCP bridge listening on 0.0.0.0:${PORT} (stdio → ${SERVER_PACKAGES[SERVER_NAME]})`);
});

// Graceful shutdown
function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[${SERVER_NAME}] received ${signal}, shutting down`);
  clearInterval(refreshTimer);
  httpServer.close(() => {
    void client.close().then(() => process.exit(0)).catch(() => process.exit(1));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
