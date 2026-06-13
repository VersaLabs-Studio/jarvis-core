---
name: api-integration
description: Integrate with a third-party API — read the docs, generate a typed client + tests, optionally wrap as an MCP. Used for "integrate with X API" or "add a client for Y".
trigger:
  - "integrate with"
  - "add a client for"
  - "API integration"
  - "wrap as MCP"
tools_required: ["filesystem", "browser"]
category: swe
estimated_time: "30-90 minutes"
always_loaded: false
preferred_model_role: coding
---

# API Integration

## Purpose

Integrate with a third-party API end-to-end: read the docs, generate a typed TypeScript client, write tests against a sandbox (when available), and optionally wrap the integration as a Hermes MCP tool. Used for "integrate with X API" or "add a client for Y". The skill is **autonomous for well-documented APIs** (OpenAPI spec, clear auth, sandbox environment) and **HALTS for poorly-documented ones** — those route to a human for the docs reading.

The skill uses the `browser` MCP to read the docs, the `filesystem` MCP to write the client + tests in `/workspace`, and the `code_exec` tool to run the tests in the sandbox.

## Prerequisites

- An API to integrate with (`args.api` is the name; the skill looks up the docs URL)
- The user has provided auth credentials (or the API has a sandbox environment)
- The integration target is clear: a typed client only, OR a typed client + an MCP wrapper

## Steps

### Step 1: Find the API docs

The skill looks up the docs URL:

- If `args.docs_url` is provided, use it
- Otherwise, the skill searches via the `browser` MCP for `<api name> API documentation`

The docs URL is captured; the skill reads it.

### Step 2: Read the docs

The skill drives the browser through the docs:

```
browser.navigate({ url: "<docs-url>" })
browser.snapshot()  // captures the page text
```

The skill extracts:
- **Auth** — API key, OAuth, JWT, etc. How to obtain credentials.
- **Base URL** — e.g. `https://api.example.com/v1`
- **Endpoints** — the relevant ones (e.g. `GET /users`, `POST /orders`)
- **Rate limits** — requests per minute / day
- **Error codes** — 4xx, 5xx shapes
- **Pagination** — cursor-based? offset-based?

The skill skips the marketing pages and the "getting started" tutorials; it focuses on the **API reference** (the technical section).

### Step 3: Find or generate the OpenAPI spec

If the API publishes an OpenAPI spec (`openapi.json` or `swagger.json`), the skill downloads it:

```
browser.navigate({ url: "<docs-url>/openapi.json" })
```

The OpenAPI spec is the **gold standard** for client generation; it removes ambiguity from the prose docs.

If no OpenAPI spec is published, the skill reads 2-3 example requests/responses from the docs and infers the shape. The inference is **less reliable** than the OpenAPI path; the skill flags inferred fields with `// inferred from docs` comments.

### Step 4: Generate the typed client

The skill writes a TypeScript client at `apps/integrations/<api>/client.ts` (or wherever `args.target_path` points):

```typescript
// apps/integrations/<api>/client.ts

export interface <Api>Config {
  apiKey: string;
  baseUrl: string;
}

export interface <Resource> {
  id: string;
  // ... fields from the OpenAPI spec
}

export class <Api>Client {
  constructor(private config: <Api>Config) {}

  async list<Resource>(filters?: object): Promise<{ data: <Resource>[]; total: number }> {
    // ...
  }

  // ... one method per endpoint
}
```

The client follows the JARVIS conventions:
- **No `any`** — all response shapes are typed (from the OpenAPI spec or the inference)
- **Zod at the boundary** — every response is parsed through a Zod schema (`<api>ResourceSchema = z.object({...})`)
- **Errors are typed** — `class <Api>Error extends Error` with `code` and `status` fields
- **No SDK dependencies** — uses the built-in `fetch` (no `axios`, no `node-fetch`)

### Step 5: Write the tests

The skill writes tests at `apps/integrations/<api>/client.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { <Api>Client } from "./client.js";

describe("<api> client", () => {
  it("list<Resource> returns parsed response", async () => {
    const client = new <Api>Client({ apiKey: "test", baseUrl: "https://api.example.com" });
    const result = await client.list<Resource>();
    expect(result.data).toBeInstanceOf(Array);
  });

  // ... one test per endpoint
});
```

If the API has a sandbox environment, the tests hit the sandbox. Otherwise, the tests mock `fetch`:

```typescript
vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [...] }), { status: 200 }));
```

The tests run via `pnpm -F <api-package> test`.

### Step 6: Optionally wrap as an MCP

If `args.wrap_as_mcp = true`, the skill also writes:

```typescript
// apps/integrations/<api>/mcp-server.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// ...

const server = new Server({ name: "<api>", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_<resource>",
      description: "List <resource> from <api>",
      inputSchema: { type: "object", properties: { filters: { type: "object" } } },
    },
    // ... one tool per endpoint
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "list_<resource>") {
    const result = await client.list<Resource>(request.params.arguments?.filters);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
  // ... one handler per tool
});
```

The MCP server is added to the `apps/mcp/<api>/` dir (per E3) and registered in the compose stack.

### Step 7: Document

The skill writes a doc at `apps/integrations/<api>/README.md`:

```markdown
# <Api> Integration

## Auth
<how to obtain credentials>

## Endpoints
<one section per endpoint, with example request/response>

## Sandbox
<the sandbox URL, the test credentials>

## MCP
<if wrapped, how to invoke the MCP tool>
```

The doc is the source of truth for the integration; the client code is the implementation.

### Step 8: Notify the user

Send the user a chat message:

```
[INTEGRATION COMPLETE] <api>
- Client: apps/integrations/<api>/client.ts
- Tests: apps/integrations/<api>/client.test.ts
- Docs: apps/integrations/<api>/README.md
- MCP: <if wrapped, the path>
- Test results: <N tests, M passed>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "api": "...",
    "client_path": "...",
    "test_path": "...",
    "doc_path": "...",
    "mcp_path": "..." | null,
    "tests_passed": 8,
    "tests_total": 8,
    "duration_ms": ...
  }
}
```

The dashboard renders the result; the chat shows the summary.

## Error Handling

- **The API has no docs** — halt; the user provides the docs URL
- **The API has no OpenAPI spec and the docs are ambiguous** — the skill flags the inferred fields; the user reviews
- **The API auth is unclear** — the user provides the auth flow
- **The sandbox returns 401** — the auth credentials are wrong; the user fixes
- **The integration requires schema changes** (e.g. a new `integrations` table) — halt; the user approves a schema migration first
- **The MCP wrapping fails** — the client is fine; the MCP layer is debugged separately
- **The `browser` MCP is unreachable** — halt; the user pastes the docs URL into the chat

## Quality Checks

Before declaring the integration complete:

- [ ] Docs read (or the user provided them)
- [ ] OpenAPI spec used (or fields are flagged as inferred)
- [ ] Client is typed (no `any`)
- [ ] Zod at every response boundary
- [ ] Tests pass
- [ ] README documents auth + endpoints
- [ ] MCP wrapper (if requested) registers and answers a `tools/list` call
- [ ] User notified

An integration that doesn't pass all 8 is a degraded integration. The skill returns `skill:result` with `degraded: true` and a `note` field.
