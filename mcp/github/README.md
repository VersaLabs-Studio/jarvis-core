# GitHub MCP Server

GitHub integration for JARVIS via Model Context Protocol.

## Capabilities

- Create/update files in repositories
- Search repositories
- Create and manage issues
- Create and manage pull requests
- List issues and PRs
- Get file contents

## Setup

1. Generate a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer Settings > Personal Access Tokens
   - Create a token with scopes: `repo`, `workflow`, `read:org`
   - Copy the token

2. Add to `.env`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

3. Start the service:
   ```bash
   docker compose up -d mcp-github
   ```

## Configuration

See `config/mcp-servers/github.yaml` for full configuration.

## Testing

```bash
# Check if service is running
docker compose ps mcp-github

# View logs
docker compose logs mcp-github