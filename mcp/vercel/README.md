# Vercel MCP Server

Vercel deployment integration for JARVIS via Model Context Protocol.

## Capabilities

- List Vercel projects
- Deploy to Vercel
- Get deployment status
- List recent deployments

## Setup

1. Generate a Vercel Token:
   - Go to Vercel Dashboard > Settings > Tokens
   - Create a new token
   - Copy the token

2. Add to `.env`:
   ```
   VERCEL_TOKEN=your_token_here
   ```

3. Start the service:
   ```bash
   docker compose up -d mcp-vercel
   ```

## Configuration

See `config/mcp-servers/vercel.yaml` for full configuration.

## Testing

```bash
# Check if service is running
docker compose ps mcp-vercel

# View logs
docker compose logs mcp-vercel