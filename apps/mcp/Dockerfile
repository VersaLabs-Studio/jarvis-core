# =============================================================================
# JARVIS MCP base image (Phase E §5.3 E3 — C4 + H2 closure).
#
# Single base image that installs all 6 npm MCP servers at exact pinned
# versions. Per-server containers override the entrypoint `command:` to
# pick which stdio MCP server the bridge spawns.
#
# Version resolution: each ARG is resolved at build time via:
#   npm view @modelcontextprotocol/sdk version
#   npm view @modelcontextprotocol/server-github version
#   ...
# The compose file passes the resolved versions as build args. No `latest`
# and no `-y` at runtime — the versions are baked at build.
# =============================================================================

FROM node:20-slim

# Non-root user (UID 1001, matches Hermes's H1 hardening)
RUN useradd -m -u 1001 -s /bin/bash mcp

WORKDIR /opt/mcp

# Pin exact versions — no "latest", no "next", no caret. Renovate/Dependabot
# proposes upgrades; nothing auto-pulls at runtime (H2 closure).
ARG MCP_SDK_VERSION
ARG MCP_GITHUB_VERSION
ARG MCP_NOTION_VERSION
ARG MCP_SUPABASE_VERSION
ARG MCP_BROWSER_VERSION
ARG MCP_FILESYSTEM_VERSION

RUN npm install --no-audit --no-fund \
    @modelcontextprotocol/sdk@${MCP_SDK_VERSION} \
    @modelcontextprotocol/server-github@${MCP_GITHUB_VERSION} \
    @notionhq/notion-mcp-server@${MCP_NOTION_VERSION} \
    @supabase/mcp-server-supabase@${MCP_SUPABASE_VERSION} \
    @playwright/mcp@${MCP_BROWSER_VERSION} \
    @modelcontextprotocol/server-filesystem@${MCP_FILESYSTEM_VERSION}

# Copy the HTTP-to-stdio bridge
COPY --chown=mcp:mcp apps/mcp/src/bridge.js ./bridge.js

# Default port; each per-server service can override via env
ENV MCP_PORT=8765
EXPOSE 8765

# Drop privileges + set entrypoint. The per-server compose `command:`
# passes the server name as the first argv (e.g. `["github"]`).
USER 1001
ENTRYPOINT ["node", "/opt/mcp/bridge.js"]
