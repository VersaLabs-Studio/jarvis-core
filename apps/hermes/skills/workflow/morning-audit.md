---
name: morning-audit
description: 8 AM daily audit — GitHub PRs/issues/commits + Notion tasks + Gmail inbox → 1-page briefing → chat + Telegram notification. The first thing the user sees every morning.
trigger:
  - "morning audit"
  - "morning briefing"
  - "what's on today"
  - "morning summary"
tools_required: ["github", "notion", "gmail"]
category: analysis
estimated_time: "2-5 minutes"
always_loaded: false
preferred_model_role: office
---

# Morning Audit

## Purpose

Produce a 1-page morning briefing by aggregating three sources: **GitHub** (PRs/issues/commits), **Notion** (today's tasks), and **Gmail** (unread inbox). The output is a chat message + Telegram notification. This is the most-invoked workflow skill — it runs as a cron at 8 AM every morning (per `cron-list.ts`), and on demand when the user says "morning briefing" or "what's on today."

The briefing is **terse** (1 page; < 500 words). The user reads it in 30 seconds. Anything verbose goes in the linked detail page; the briefing is the index.

## Prerequisites

- A GitHub token with `repo` + `read:user` scopes
- A Notion integration with access to the team's "Today" database
- A Gmail OAuth token (the gmail MCP needs the user's grant)
- The user's timezone (for the 8 AM cron; defaults to `America/New_York` from `apps/api/src/lib/config.ts`)

## Steps

### Step 1: Gather GitHub activity (last 24h)

Call the GitHub MCP to fetch:

```
github.search_issues_and_pull_requests({
  query: "is:open updated:>={yesterday-timestamp}",
  limit: 50,
})
github.list_commits({
  author: "<user>",
  since: "{yesterday-timestamp}",
  limit: 20,
})
```

Filter to:
- **PRs the user is the author of** — status (open, review requested, approved, merged)
- **PRs the user is the reviewer on** — what needs their attention
- **Issues assigned to the user** — open, priority
- **Commits the user pushed** — what shipped

For each PR, fetch the title + URL + status + review count. For each issue, fetch the title + URL + priority. For each commit, fetch the message + URL.

### Step 2: Gather Notion tasks (today)

Call the Notion MCP:

```
notion.query_database({
  database_id: "<TODAY_DB_ID>",
  filter: {
    property: "Due",
    date: { equals: "{today}" }
  },
  sorts: [{ property: "Priority", direction: "descending" }],
})
```

Get the top 5 tasks for today. For each: title + URL + priority + status.

### Step 3: Gather Gmail inbox (unread, important)

Call the Gmail MCP:

```
gmail.list_messages({
  q: "is:unread is:important newer_than:1d",
  max_results: 10,
})
```

Get the top 10 unread + important. For each: sender + subject + 1-line snippet. **Do NOT** include the full body — the briefing is a summary, not a transcript.

### Step 4: Synthesize the briefing

The LLM composes the briefing. The structure (1 page):

```
Good morning, <user>. Here's your Tuesday, June 12.

## GitHub (3 things need your attention)
- **PR #142: "Add invoice generation"** — 2 review comments, waiting on you. [link]
- **PR #138: "Refactor auth"** — CI green, awaiting review. [link]
- **Issue #89: "Notion sync failing"** — assigned to you yesterday. [link]

## Notion (3 tasks for today)
- **Ship Phase E** — high priority, due 5 PM. [link]
- **Write weekly review** — medium priority. [link]
- **Call with Acme** — medium priority, 2 PM. [link]

## Gmail (2 important unread)
- **Alice: "Re: Phase E plan"** — "Looks good, ship it." [link]
- **Bob: "Deployment failed"** — "Vercel build error on main." [link]

Reply to Bob when you have a moment.
```

The structure is **fixed** (3 sections: GitHub, Notion, Gmail). The content is the LLM's pick of the top items. The user reads the briefing in 30 seconds; clicking a link goes to the source.

### Step 5: Send to chat

The LLM's final response is the briefing text (rendered as a chat message with the structured sections). The user sees it in the chat surface.

### Step 6: Notify via Telegram

If `args.notify.telegram === true` (or for the cron, always), call the Telegram MCP:

```
telegram.send_message({
  chat_id: "<user-chat-id>",
  text: "<briefing text, plain version>",
  parse_mode: "Markdown",
})
```

The Telegram version is **the same content, plain text**. The chat surface has the rich formatting; the Telegram is a notification.

### Step 7: Log to system_logs

Write a `system_logs` row via the API factory (per Phase E §5.4):

```
{
  level: "info",
  source: "cron/morning-audit",
  message: "Morning audit fired for 2026-06-12",
  payload: { github_count: 8, notion_count: 5, gmail_count: 2, duration_ms: 4200 },
}
```

The dashboard renders this as an event in the logs page.

## Output

The skill returns the briefing as a structured object:

```json
{
  "type": "skill:result",
  "output": {
    "briefing_markdown": "Good morning, <user>...",
    "github_count": 8,
    "notion_count": 5,
    "gmail_count": 2,
    "duration_ms": 4200,
    "sources": {
      "github_prs": [...],
      "notion_tasks": [...],
      "gmail_messages": [...]
    }
  }
}
```

The chat renders the `briefing_markdown`; the dashboard renders the full object.

## Error Handling

- **GitHub MCP rate-limit (403)** — wait 60s; retry once; if still failing, log to `system_logs` and skip GitHub this morning (the briefing shows GitHub: "skipped due to rate limit").
- **Notion MCP 404** — the database ID is wrong; log to `system_logs`; skip Notion. The user fixes the ID in `apps/hermes/src/config/notion.ts`.
- **Gmail MCP token expired** — the user's OAuth is stale; log to `system_logs`; the user re-grants via the dashboard. Skip Gmail this morning.
- **The LLM hallucinates a PR or issue that doesn't exist** — the briefing must cite the source (e.g. the PR URL from the GitHub MCP response). The dashboard validates the URLs; a 404 URL is a P5 violation. The skill retries with the actual data.
- **The briefing is > 500 words** — the LLM is being verbose; the skill retries with a stricter "1 line per item" prompt.

## Quality Checks

Before declaring the audit complete:

- [ ] GitHub MCP returns real PRs/issues (not hallucinated)
- [ ] Notion MCP returns real tasks (not hallucinated)
- [ ] Gmail MCP returns real messages (not hallucinated)
- [ ] Briefing is < 500 words
- [ ] Briefing has all 3 sections (GitHub, Notion, Gmail)
- [ ] Telegram notification sent (or logged as "Telegram not configured")
- [ ] `system_logs` row created
- [ ] Briefing delivered to chat within 5 minutes of cron fire (or 5 seconds of on-demand fire)

A morning audit that doesn't pass all 8 is a degraded audit. The skill returns `skill:result` with `degraded: true` and a `note` field; the dashboard renders the note.
