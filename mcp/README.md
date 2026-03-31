# MCP Servers

Individual Model Context Protocol (MCP) server implementations for JARVIS integrations.

## Structure

```
mcp/
├── github/     # GitHub MCP - Repository management, PRs, issues
├── vercel/     # Vercel MCP - Deployment, project management
├── notion/     # Notion MCP - Documentation, knowledge base
└── gmail/      # Gmail/Google MCP - Email, calendar, drive
```

## Usage

Each MCP server runs as a separate Docker container or npx process. See individual directories for configuration.

## Philosophy

Individual MCPs over Composio for:
- Pure flexibility
- Zero vendor lock-in
- Full control over each integration
- Easy to add/remove without affecting others