---
name: client-report
description: Generate a weekly client status report — pulls GitHub activity + Notion task progress + calendar events → structured 1-page report → email the client. Used for "weekly status report" or "client report for X".
trigger:
  - "weekly status report"
  - "client report"
  - "weekly report"
  - "status update for client"
tools_required: ["github", "notion", "gmail"]
category: communication
estimated_time: "5-10 minutes"
always_loaded: false
preferred_model_role: office
---

# Client Report

## Purpose

Generate a weekly status report for a client. The skill aggregates the week's activity from GitHub (PRs merged, issues closed, commits), Notion (tasks completed, tasks in progress, blockers), and Calendar (meetings attended, meetings scheduled), and composes a 1-page report. The report is sent to the client via Gmail (drafted, not sent; the user reviews). Used for "weekly status report for X" or "client report for <project>". The skill is **autonomous for routine weeks** (consistent activity, no surprises) and **HALTS for eventful weeks** (delays, blockers, scope changes) — those need a human-composed narrative.

The skill runs as a cron (weekly) or on-demand. The cron config is in `apps/hermes/src/cron/registry.ts`.

## Prerequisites

- A client (`args.client` is the client name; the skill looks up the engagement)
- A reporting period (default: last 7 days; `args.period` can override)
- The client has a primary contact (`args.to_email` is the email; the skill looks it up if not provided)
- The team's standard report template (at `docs/templates/client-report.md`; the skill follows it)

## Steps

### Step 1: Define the reporting period

Default: last 7 days ending on `args.report_date` (default: today). The period is `{start_date}` to `{end_date}`.

### Step 2: Gather GitHub activity

The skill queries the GitHub MCP for the week's activity on the client's repos:

```
github.search_issues_and_pull_requests({
  query: "repo:<org>/<client-repo> is:merged merged:<start>..<end>",
  limit: 50,
})
github.search_issues_and_pull_requests({
  query: "repo:<org>/<client-repo> is:closed closed:<start>..<end>",
  limit: 50,
})
github.list_commits({
  repo: "<org>/<client-repo>",
  since: "<start>",
  until: "<end>",
  limit: 100,
})
```

The skill filters to the team's contributions (the user + collaborators) and excludes the client's own commits.

### Step 3: Gather Notion activity

The skill queries the Notion MCP for the week's task progress on the client's project:

```
notion.query_database({
  database_id: "<CLIENT_TASKS_DB_ID>",
  filter: {
    and: [
      { property: "Status", status: { equals: "Done" } },
      { property: "Completed", date: { on_or_after: "<start>" } },
    ],
  },
})
notion.query_database({
  database_id: "<CLIENT_TASKS_DB_ID>",
  filter: {
    and: [
      { property: "Status", status: { does_not_equal: "Done" } },
      { property: "Due", date: { on_or_before: "<end>" } },
    ],
  },
})
```

The skill captures: tasks completed this week, tasks in progress, tasks overdue.

### Step 4: Gather Calendar activity

The skill queries the calendar (via the API, not the MCP) for the week's meetings with the client:

```
api.list_calendar_events({
  start: "<start>",
  end: "<end>",
  attendees: ["<client-contact-email>"],
})
```

The skill captures: meetings attended, meetings scheduled for the future.

### Step 5: Compose the report

The LLM composes a 1-page report following the team's template:

```markdown
# Weekly Status: <Client Name>

**Week of:** <start date> – <end date>
**Project:** <project name>
**Prepared by:** <user name>

## TL;DR
<1 paragraph: 3-5 sentences summarizing the week. What's the headline?>

## What Shipped
- <PR #1 title> — merged on <date>
- <PR #2 title> — merged on <date>
- <Feature X> — launched to production
- <Bug #N> — fixed and deployed

## In Progress
- <Feature Y> — 60% done, on track for <target date>
- <Refactor Z> — code review pending, ETA <date>

## Metrics
- **Velocity:** <N story points> (vs. <previous week>)
- **Bugs open:** <N> (vs. <previous week>)
- **PR cycle time:** <N hours> (vs. <previous week>)
- **Uptime:** <N%> (last 7 days)

## Next Week
- <Goal 1>
- <Goal 2>
- <Goal 3>

## Blockers
- <blocker 1, with the mitigation>
- (or: "None this week")

## Meetings
- <Meeting 1> — <outcome>
- <Meeting 2> — <outcome>

---

*Questions? Reply to this email or schedule a call: <calendar link>*
```

The structure is **fixed**; the content is the LLM's pick. The report is 1 page (~500 words). If it's longer, the LLM is being verbose; the skill retries with a stricter prompt.

### Step 6: Draft the email

The skill calls `email-draft` with the report as the body:

```
gmail.create_draft({
  to: "<client primary contact>",
  subject: "Weekly Status: <Project Name> — <week of date>",
  body: "<the report text>",
  // The report is in the email body; no attachments (Notion is the source)
})
```

The user reviews the draft before sending.

### Step 7: Save to Notion

The skill creates a Notion page in the client's project space:

```
notion.create_page({
  database_id: "<CLIENT_REPORTS_DB_ID>",
  properties: {
    title: "Weekly Status: <Project Name> — <week of date>",
    client: "<client name>",
    week_of: "<start date>",
    status: "Draft",
  },
  children: [<the report blocks>],
})
```

The Notion page becomes the canonical record; the email is a copy.

### Step 8: Log to system_logs

The skill writes a `system_logs` row:

```
{
  level: "info",
  source: "skill:client-report",
  message: "Generated client report for <client> — week of <date>",
  payload: { client, week_of, github_activity: N, notion_tasks: N, calendar_events: N }
}
```

The dashboard renders the event in the logs page; the operator can audit the report cadence.

### Step 9: Notify the user

Send the user a chat message:

```
[CLIENT REPORT] <Client Name> — week of <date>
- Notion: <url>
- Email: <draft URL in Gmail>
- GitHub: <N> PRs merged, <N> issues closed, <N> commits
- Notion: <N> tasks completed, <N> in progress, <N> overdue
- Status: <drafted; not sent>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "client": "...",
    "week_of": "...",
    "notion_url": "...",
    "gmail_draft_url": "...",
    "github": { "prs_merged": 5, "issues_closed": 3, "commits": 23 },
    "notion_tasks": { "completed": 8, "in_progress": 4, "overdue": 0 },
    "calendar_events": 2,
    "word_count": 487,
    "duration_ms": 12345
  }
}
```

The dashboard renders the report card; the chat shows the summary.

## Error Handling

- **No GitHub activity this week** — the report says "No code changes this week"; the user reviews
- **Tasks overdue** — the report highlights the overdue tasks; the user reviews the narrative
- **A blocker emerged** — the report surfaces the blocker; the user is asked to add a mitigation
- **The client is on a billing pause** — the report is skipped; the user is notified
- **The Gmail draft fails** — the Notion page is still created; the user emails manually
- **The week had a security incident** — the report **HALTs**; the user writes the narrative manually; security incidents are never auto-reported

## Quality Checks

Before declaring the report complete:

- [ ] All 3 sources queried (GitHub, Notion, Calendar)
- [ ] Report follows the team template
- [ ] Report is 1 page (~500 words)
- [ ] TL;DR is concise (3-5 sentences)
- [ ] Metrics are populated (no "N/A" placeholders)
- [ ] Blockers section is non-empty (or "None this week")
- [ ] Notion page created
- [ ] Gmail draft staged
- [ ] User notified

A report that doesn't pass all 9 is a degraded report. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the report before sending.
