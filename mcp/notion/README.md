# Notion MCP Server

Notion knowledge base integration for JARVIS via Model Context Protocol.

## Capabilities

- Search Notion pages and databases
- Get page content
- Create new pages
- Update existing pages
- List databases

## Setup

1. Create a Notion Integration:
   - Go to https://www.notion.so/my-integrations
   - Create a new integration
   - Copy the Internal Integration Token
   - Share pages/databases with the integration

2. Add to `.env`:
   ```
   NOTION_API_KEY=your_notion_token_here
   ```

3. Start the service:
   ```bash
   docker compose up -d mcp-notion
   ```

## Configuration

See `config/mcp-servers/notion.yaml` for full configuration.

## Testing

```bash
# Check if service is running
docker compose ps mcp-notion

# View logs
docker compose logs mcp-notion