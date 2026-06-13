---
name: research-and-report
description: Research a topic end-to-end — browser-based reading, synthesis, structured report. Used for "research X", "compare A vs B", "what's the state of Y". The browser MCP is the web-exec proxy.
trigger:
  - "research"
  - "compare A vs B"
  - "what's the state of"
  - "investigate"
tools_required: ["browser", "notion"]
category: research
estimated_time: "15-30 minutes"
always_loaded: false
preferred_model_role: planning
---

# Research and Report

## Purpose

Research a topic end-to-end and produce a structured report. The user says "research X", "compare A vs B", or "what's the state of Y"; the skill uses the `browser` MCP to read sources, synthesizes the findings, and writes a structured report to Notion. The skill is **autonomous for narrow topics** (1-2 sources, clear question) and **HALTS for broad topics** (multi-day research, no clear question) — those route to a human researcher.

The browser MCP is `@playwright/mcp` (a real Chromium via Playwright). The MCP runs in a Docker container; the skill drives the browser with `playwright`-style commands. The skill **scrapes public content only** — no login, no paywall bypass, no scraping of PII.

## Prerequisites

- A research question (`args.topic` is the question or topic)
- The `browser` MCP is configured (Playwright + a Chromium binary)
- The `notion` MCP is configured (a destination database for the report)
- The user has provided a question that can be answered by web research (not "what do I think about X" — that's not research)

## Steps

### Step 1: Define the research scope

The skill asks the LLM to:
- Break the topic into 3-5 sub-questions
- For each sub-question, list 2-3 candidate sources
- Estimate the total sources needed (target: 5-10 sources for a typical report)

The scope is logged to a `research_plan` artifact. The user can review and adjust.

### Step 2: Read the sources

For each source, the skill drives the browser:

```
browser.navigate({ url: "<source-url>" })
browser.snapshot()  // captures the visible text
```

The skill extracts the key claims + the source URL. Each claim is tagged with a confidence (HIGH / MEDIUM / LOW) based on the source's authority (e.g. official docs > reputable blog > random tweet).

The skill **does not** read more than 20 sources in one run (memory + time bound). If the research needs more, the skill halts and the user splits.

### Step 3: Synthesize the findings

The LLM composes a structured report:

```markdown
# <Topic>: Research Report

## Executive Summary
<1 paragraph: the answer in 3-5 sentences>

## Background
<1-2 paragraphs: context for the answer>

## Key Findings
<numbered list, each with a source URL>

## Comparison (if applicable)
<table comparing A vs B>

## Trade-offs
<bulleted list of pros/cons>

## Recommendations
<numbered list: what the user should do>

## Open Questions
<bulleted list: what we still don't know>

## Sources
<numbered list of all sources read, with URLs>
```

The structure is **fixed**; the content is the LLM's pick. The report is 1-2 pages; if it's longer, the LLM is being verbose — the skill retries with a stricter prompt.

### Step 4: Verify the sources

The skill must cite **real sources** (no hallucinated URLs). Before posting, the skill checks each cited URL:

```
browser.navigate({ url: "<cited-url>" })
```

The browser must return a 200 (or a 301/302 that resolves to 200). A 404 or a non-resolving URL is a hallucination; the skill removes the citation and re-runs the synthesis.

### Step 5: Post to Notion

The skill creates a Notion page in the team's "Research" database:

```
notion.create_page({
  database_id: "<RESEARCH_DB_ID>",
  properties: {
    title: "<Topic>: Research Report",
    status: "Draft",
    author: "skill:research-and-report",
    question: "<args.topic>",
  },
  children: [<the report blocks>],
})
```

The Notion page becomes the canonical record. The user can edit + publish.

### Step 6: Save a local copy

The skill also writes the report to `docs/research/<topic-slug>.md` for git-tracked archival. The doc is committed in the same commit as the Notion page creation (the doc is the source of truth; Notion is the rendering).

### Step 7: Notify the user

Send the user a chat message:

```
[RESEARCH COMPLETE] <Topic>
- Notion: <url>
- Local copy: docs/research/<slug>.md
- Sources read: <N>
- Key findings: <top 3 bullets>
- Open questions: <count>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "topic": "...",
    "notion_url": "...",
    "local_doc": "docs/research/<slug>.md",
    "sources_read": 8,
    "key_findings": [...],
    "open_questions": [...],
    "duration_ms": ...
  }
}
```

The dashboard renders the Notion card; the chat shows the summary.

## Error Handling

- **Browser can't reach the source (404, 5xx)** — skip the source; log a warning; continue with the remaining sources
- **The source is behind a paywall / requires login** — the browser can navigate but the content is empty; the skill skips and logs "paywall / login required"
- **The source returns a CAPTCHA** — the skill halts; the user is asked to manually solve the CAPTCHA or pick a different source
- **The LLM hallucinates a URL** — the browser check fails; the skill removes the citation and re-runs
- **The LLM is verbose (> 2 pages)** — the skill retries with a stricter prompt
- **The Notion API rate-limits** — wait 60s; retry once
- **The `browser` MCP is unreachable** — halt; the user checks the MCP container

## Quality Checks

Before declaring the research complete:

- [ ] 5-20 sources read
- [ ] All cited URLs verified (browser returned 200)
- [ ] Report is 1-2 pages (not verbose)
- [ ] Report has all 8 sections (Exec Summary, Background, Findings, Comparison, Trade-offs, Recommendations, Open Questions, Sources)
- [ ] Notion page created
- [ ] Local copy saved to `docs/research/<slug>.md`
- [ ] User notified

A research report that doesn't pass all 7 is a degraded report. The skill returns `skill:result` with `degraded: true` and a `note` field; the dashboard renders the note.
