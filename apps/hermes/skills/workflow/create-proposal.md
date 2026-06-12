---
name: create-proposal
description: Create a proposal for a project — research the client, structure the proposal, write the document, save to Notion, optionally email it. Used for "create proposal for X" or "draft a proposal for client Y".
trigger:
  - "create proposal"
  - "draft proposal"
  - "proposal for"
  - "write a proposal"
tools_required: ["browser", "notion", "gmail"]
category: communication
estimated_time: "60-120 minutes"
always_loaded: false
preferred_model_role: planning
---

# Create Proposal

## Purpose

Create a proposal for a project end-to-end. The skill researches the client (existing relationship, past work, current needs), structures the proposal (problem, approach, timeline, cost, terms), writes the document, saves to Notion, and optionally emails it. Used for "create proposal for X" or "draft a proposal for client Y". The skill is **autonomous for standard proposals** (1-2 page scope, clear pricing) and **HALTS for complex proposals** (RFPs, multi-stakeholder, custom terms) — those route to a human for the business development cycle.

The skill composes the foundational `plan-feature` (the proposal structure mirrors a plan doc) + `research-and-report` (the client research) + `notion-update` (the document storage) + `email-draft` (the delivery).

## Prerequisites

- A client or project (`args.client` is the client name; the skill looks up the existing relationship)
- A scope of work (the user provides a one-paragraph description; the skill expands it)
- Pricing model (hourly, fixed, retainer — the user provides; the skill applies it)
- Timeline (start date, end date, milestones — the user provides; the skill structures the timeline)

## Steps

### Step 1: Research the client

The skill pulls existing context:

- **CRM** (if available) — past engagements, contacts, deal size
- **Notion** — past proposals, case studies, project docs
- **Gmail** — past threads with the client
- **GitHub** (if applicable) — past code contributions to the client's repos

The skill synthesizes a **client brief**: who they are, what we've done for them, what they need now, what their decision-makers care about.

### Step 2: Define the problem statement

The LLM drafts a problem statement based on the user's scope description:

> <Client name> is facing <problem>. Specifically, <evidence>. This problem is causing <cost / impact>. <Client name> has tried <previous attempts> but they haven't worked because <root cause>.

The problem statement is **specific** (not "improve their digital presence" — "reduce checkout abandonment by 30%"). The user reviews and adjusts.

### Step 3: Define the approach

The LLM drafts an approach:

> We will <deliverable 1> by <method 1>. Specifically, we will:
> - <step 1>
> - <step 2>
> - <step 3>
>
> Then we will <deliverable 2> by <method 2>. ...

The approach is **actionable** (not "leverage our expertise" — "build a Next.js checkout flow with the Stripe SDK"). The user reviews and adjusts.

### Step 4: Build the timeline

The LLM builds a milestone-based timeline:

| Milestone | Duration | Deliverable | Date |
|---|---|---|---|
| Kickoff | 1 week | Project plan + repo setup | <date> |
| Phase 1: <name> | 4 weeks | <deliverable> | <date> |
| Phase 2: <name> | 4 weeks | <deliverable> | <date> |
| Phase 3: <name> | 4 weeks | <deliverable> | <date> |
| Launch + handoff | 1 week | Production deploy + docs | <date> |

The timeline is **realistic** (the skill factors in the team's capacity). The user adjusts.

### Step 5: Calculate the cost

The LLM applies the pricing model:

- **Hourly** — `<hours> × $<rate> = $<total>` (with a line item per phase)
- **Fixed** — `<total> (<breakdown by phase>)`
- **Retainer** — `<monthly fee> for <scope>`

The cost includes a 15% buffer for unknowns; the user can adjust.

### Step 6: Draft the terms

The LLM drafts standard terms:

- **Payment** — net-30; 50% upfront, 50% on completion
- **IP** — work product is client's upon final payment
- **Confidentiality** — mutual NDA; standard 2-year term
- **Termination** — 30-day notice; pro-rated refund of unused hours
- **Warranty** — 30-day bug-fix warranty post-launch

The terms are based on the team's standard template; the user can adjust. **Sensitive terms (liability, indemnification) are HALTs** — the user fills those in manually.

### Step 7: Write the proposal document

The skill composes the full proposal at `docs/proposals/<client-slug>-<project-slug>-<date>.md`:

```markdown
# Proposal: <Project Name>

**Client:** <client name>
**Date:** <date>
**Prepared by:** <user name>
**Valid until:** <date + 30 days>

## 1. Executive Summary
<1 paragraph: the problem, the solution, the cost, the timeline>

## 2. About <Client Name>
<1-2 paragraphs: who they are, what we know about them>

## 3. The Problem
<the problem statement from Step 2>

## 4. Our Approach
<the approach from Step 3, with details>

## 5. Timeline
<the timeline table from Step 4>

## 6. Investment
<the cost from Step 5, with breakdown>

## 7. Terms
<the terms from Step 6>

## 8. About <Team Name>
<1-2 paragraphs: who we are, relevant case studies>

## 9. Next Steps
<1-2 paragraphs: how to proceed; the kickoff date>

---

*This proposal is valid for 30 days from the date above.*
```

The doc is the source of truth; Notion is the rendering.

### Step 8: Save to Notion

The skill creates a Notion page in the team's "Proposals" database:

```
notion.create_page({
  database_id: "<PROPOSALS_DB_ID>",
  properties: {
    title: "Proposal: <Project Name>",
    client: "<client name>",
    status: "Draft",
    prepared_by: "<user name>",
    valid_until: "<date + 30 days>",
    amount: "<total cost>",
  },
  children: [<the proposal blocks>],
})
```

The Notion page becomes the canonical record; the markdown is the source.

### Step 9: Optionally email the proposal

If `args.email = true`, the skill calls `email-draft`:

```
gmail.create_draft({
  to: "<client primary contact>",
  subject: "Proposal: <Project Name> — valid until <date>",
  body: "<cover letter — 1 paragraph + link to Notion>",
  attachments: [<the markdown as a .md attachment>],
})
```

The user reviews the draft before sending.

### Step 10: Notify the user

Send the user a chat message:

```
[PROPOSAL DRAFTED] <Client Name>: <Project Name>
- Notion: <url>
- Local doc: docs/proposals/<slug>.md
- Cost: $<total> (<pricing model>)
- Timeline: <weeks> weeks
- Status: <Draft | Sent (in Gmail draft)>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "client": "...",
    "project": "...",
    "notion_url": "...",
    "local_doc": "...",
    "cost": 50000,
    "currency": "USD",
    "timeline_weeks": 12,
    "email_status": "draft" | "not_sent",
    "duration_ms": ...
  }
}
```

The dashboard renders the proposal card; the chat shows the summary.

## Error Handling

- **No past context with the client** — the skill drafts a "first-time client" proposal; the user reviews
- **Pricing model is unclear** — the skill picks the most common (hourly at the team's rate); the user reviews
- **The terms are sensitive (legal, indemnification)** — halt; the user fills in manually
- **The client is a competitor of an existing client** — halt; the user reviews the conflict
- **The Notion database schema doesn't match** — the user is asked to fix the schema
- **The Gmail draft fails** — the Notion page is still created; the user emails manually

## Quality Checks

Before declaring the proposal complete:

- [ ] Client brief is accurate (matches the team's records)
- [ ] Problem statement is specific (not generic)
- [ ] Approach is actionable (not "leverage expertise")
- [ ] Timeline is realistic (factors in team capacity)
- [ ] Cost includes a buffer (15%)
- [ ] Terms follow the team's standard template
- [ ] No sensitive terms auto-filled (legal, indemnification)
- [ ] Notion page created
- [ ] Local doc saved
- [ ] User notified

A proposal that doesn't pass all 10 is a degraded proposal. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the proposal before sending.
