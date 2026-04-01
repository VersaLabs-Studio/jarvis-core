# Gmail MCP Server

Gmail/Google integration for JARVIS via Model Context Protocol.

## Capabilities

- Search emails
- Read specific emails
- Send emails
- List labels

## Status: PENDING SETUP

This MCP requires OAuth 2.0 setup with Google Cloud.

## Setup (When Ready)

1. Create a Google Cloud Project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Get refresh token via OAuth flow
5. Add credentials to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   ```

## Configuration

See `config/mcp-servers/gmail.yaml` for full configuration.