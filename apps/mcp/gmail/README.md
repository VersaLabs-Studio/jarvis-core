# Gmail MCP

The `gmail` MCP server provides Gmail access. Wired to `@gongrzhe/server-gmail-autoauth-mcp` (a community server).

> **⚠ PENDING per Part 4 §4.6:** this is a community server. Trust review is required before wiring to real client email. v1.5 ships the probe + the package; the `mcp-test` route returns `{ok: false, error: "PENDING"}`. F will complete the trust review and OAuth flow.

## Endpoints (called by `mcp-client.ts`)

- `GET /health` — liveness probe
- `GET /tools` — cached `tools/list`
- `POST /call {name, arguments}` — invoke a tool

## Setup (when trust review passes)

1. Generate an OAuth client at https://console.cloud.google.com/apis/credentials
2. Set the redirect URI to `http://localhost:3000/oauth2callback`
3. Copy `.env.example` to `.env` and fill in `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET`
4. First run prompts the OAuth flow in the container's stdout; the user follows the link, grants, and pastes the code

## Probe behavior

`POST /v1/mcp/test {server: "gmail"}` returns:
```json
{ "server": "gmail", "ok": false, "error": "MCP_PENDING: server 'gmail' is not yet wired in v1.5 (Part 4 §4.6). Verify before production use." }
```

The `gmail` identifier is in the allow-list (so the route accepts it), but the `mcp-client.ts` returns the pending error rather than dispatching to the bridge. Once trust review passes (F-scope), remove the pending gate.
