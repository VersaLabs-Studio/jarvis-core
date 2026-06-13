---
name: notion-update
description: Create or update Notion pages in the team's workspace — databases, formatted content, correct parent. Used for "update docs", "add to Notion", "create a Notion page".
trigger:
  - "update docs"
  - "add to Notion"
  - "create Notion page"
  - "Notion update"
tools_required: ["notion"]
category: communication
estimated_time: "2-5 minutes"
always_loaded: false
preferred_model_role: office
---

# Notion Update

## Purpose

Create or update Notion pages in the team's workspace. The skill handles database selection, page formatting (Notion's block-based schema), parent placement, and property validation. Used for "update docs", "add to Notion", or "create a Notion page about X". The skill is **autonomous for routine pages** (DB-backed, simple properties) and **HALTS for complex pages** (multi-column, embedded databases, custom components) — those route to a human via the Notion UI.

The Notion MCP is `@notionhq/notion-mcp-server` (the official Notion MCP). It speaks the Notion API directly; the skill uses it for create / update / query operations.

## Prerequisites

- A Notion integration token with access to the target workspace (`notion_token` env var)
- A target page or database (the user provides the URL or ID)
- The user has described the page content (or the skill infers it from the context)

## Steps

### Step 1: Parse the target

The skill accepts the target in three forms:
- A Notion URL: `https://www.notion.so/versalabs/Title-<id>` → extract the page/database ID
- A Notion ID: `abc12345-6789-...` → use as-is
- A name: "Ships database" → search the workspace for the matching page/database

For name-based targets, the skill queries the Notion API:

```
notion.search({ query: "<name>", filter: { property: "object", value: "page" | "database" } })
```

The user is asked to confirm if multiple matches are found.

### Step 2: Validate the target

The skill checks:
- The integration has access to the target (the API returns 404 if not)
- The target is the right type (page vs. database) for the operation
- The user has write permission (the integration's scope includes write)

A 404 or 403 means the integration lacks access; the user is asked to add the integration to the page/database.

### Step 3: Build the page content

Notion pages are made of **blocks** (paragraphs, headings, lists, tables, code, etc.). The skill composes the block tree from the user's input:

- **Plain text** → `paragraph` blocks (split by double-newline)
- **Markdown** → parsed into the equivalent blocks (heading, paragraph, list, code)
- **Properties** → page properties (title, status, tags, dates) for database pages

The block tree is built in memory; the skill validates the tree against Notion's schema (e.g. nested blocks have a max depth of 2; tables have a fixed structure).

### Step 4: Create or update the page

For a new page:

```
notion.create_page({
  parent: { database_id: "<db-id>" } | { page_id: "<page-id>" },
  properties: { ... },
  children: [ ... blocks ... ],
})
```

For an existing page:

```
notion.update_page_blocks({
  page_id: "<page-id>",
  children: [ ... new blocks ... ],
  // For updates, the skill appends; it doesn't replace the existing content
  // unless args.replace = true
})
```

The skill captures the page URL from the response; the user is notified.

### Step 5: Format the content

The skill applies the team's Notion style:
- Headings: H1 for the page title (already in the property), H2 for sections, H3 for subsections
- Paragraphs: max 3 lines per paragraph; the skill splits long paragraphs
- Code blocks: language tag (typescript, bash, sql, etc.); monospaced font
- Lists: bulleted for unordered, numbered for ordered; nested up to 2 levels
- Tables: only for comparison data; the skill prefers bulleted lists for prose
- Images / Files: the skill uploads via Notion's file API; for v1.5, only public URLs

The formatting is **consistent** across pages; the team has a "Notion style guide" (a doc the skill can be pointed to in `args.style_guide_url`).

### Step 6: Add properties (for database pages)

For a database page, the skill sets the properties per the database schema:

- **title** — the page name (always present)
- **status** — one of the database's allowed values (e.g. "In Progress", "Done")
- **assignee** — a Notion user reference
- **due date** — a Notion date object
- **tags** — a Notion multi-select

The skill reads the database schema first:

```
notion.retrieve_database({ database_id: "<db-id>" })
```

And matches the user's input to the property types. A status mismatch (e.g. "Done" not in the allowed list) is a validation error; the user is asked to pick a valid value.

### Step 7: Notify collaborators

If the page is assigned to someone, the skill adds a comment:

```
notion.create_comment({
  page_id: "<page-id>",
  rich_text: [{ type: "text", text: { content: "<message>" } }],
})
```

The comment is a short note: "Created by skill:notion-update on <date>. Let me know if you have edits."

### Step 8: Log to system_logs

The skill writes a `system_logs` row via the API factory:

```
{
  level: "info",
  source: "skill:notion-update",
  message: "Created Notion page <url>",
  payload: { page_id, database_id, action: "create" | "update" }
}
```

The dashboard renders the event in the logs page.

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "page_url": "...",
    "page_id": "...",
    "action": "create" | "update",
    "blocks_added": 12,
    "properties_set": { "title": "...", "status": "..." },
    "duration_ms": 1234
  }
}
```

The dashboard renders the Notion card; the chat shows the summary.

## Error Handling

- **Integration lacks access** — the user is asked to add the integration to the page
- **Invalid block (e.g. nested too deep)** — the skill flattens the structure; retries
- **Property mismatch** — the user is asked to pick a valid value
- **Page is archived** — the skill un-archives; if that fails, halt
- **Rate limit (429)** — wait 60s; retry once
- **Block content too large** — the skill splits the content across multiple update calls

## Quality Checks

Before declaring the update complete:

- [ ] Target resolved (page or database)
- [ ] User has write access
- [ ] Block tree validates against Notion's schema
- [ ] All required properties set (for database pages)
- [ ] Formatting follows the team style
- [ ] Collaborator notified (if assigned)
- [ ] `system_logs` row created
- [ ] User notified

An update that doesn't pass all 8 is a degraded update. The skill returns `skill:result` with `degraded: true` and a `note` field.
