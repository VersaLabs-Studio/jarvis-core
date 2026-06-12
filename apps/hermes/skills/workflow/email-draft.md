---
name: email-draft
description: Draft an email to a recipient — reads context (the conversation history, related Notion docs, etc.), composes a professional draft, and either sends via Gmail or stages for review.
trigger:
  - "draft email to"
  - "email"
  - "reply to"
  - "send an email"
tools_required: ["gmail"]
category: communication
estimated_time: "2-5 minutes"
always_loaded: false
preferred_model_role: office
---

# Email Draft

## Purpose

Draft a professional email to a recipient. The skill reads context (the conversation history, related Notion docs, the user's previous emails to the same person), composes a draft, and either sends via Gmail or stages for review. Used for "draft email to X" or "reply to <thread>". The skill is **autonomous for routine emails** (status update, scheduling, ack) and **HALTS for sensitive emails** (negotiations, complaints, legal) — those route to a human for tone review.

The Gmail MCP is the email-send proxy. The skill **does not** send without an explicit `args.send = true` flag; the default is `args.send = false` (draft only, the user reviews before sending).

## Prerequisites

- A Gmail OAuth token with `gmail.send` scope (`gmail_token` env var)
- A recipient (`args.to` is the email address; the user can also say "reply to <thread>")
- A subject (`args.subject`) or the skill infers it
- The body context (the user can provide a one-liner; the skill expands it)

## Steps

### Step 1: Resolve the recipient

If the user says "email Sarah", the skill searches the user's contacts:

```
gmail.list_contacts({ query: "Sarah" })
```

If multiple matches, the user is asked to pick. The resolved email is `args.to`.

If the user says "reply to <thread>", the skill fetches the thread:

```
gmail.get_thread({ thread_id: "<thread-id>" })
```

The last message's sender is the recipient; the subject is "Re: <original subject>".

### Step 2: Gather context

The skill pulls context from multiple sources to compose a relevant draft:

- **Gmail thread history** (for replies) — the previous emails in the thread
- **Notion** (for project context) — search the team's Notion workspace for related docs (e.g. "Q2 Roadmap" if the email is about a roadmap update)
- **GitHub** (for engineering emails) — the user may want to reference a PR or issue
- **Calendar** (for scheduling emails) — the user's availability

The skill does **not** query every source for every email; it picks the relevant ones based on the email's intent.

### Step 3: Compose the draft

The LLM composes a draft following the team's style guide:

- **Greeting** — "Hi <first name>," (informal) or "Dear <full name>," (formal). The skill picks based on the relationship (inferred from previous emails).
- **Opening** — 1 sentence: the purpose of the email in plain language. No "I hope this email finds you well" boilerplate.
- **Body** — 1-3 short paragraphs. Bullet points for lists. Bold for emphasis (sparingly).
- **Closing** — "Best," (informal) or "Sincerely," (formal). The user's signature is appended.
- **Signature** — the user's name, title, and one-line contact info. Pulled from the user's profile.

The draft is **terse** (under 200 words for routine emails; under 500 for complex ones). The LLM is prompted to avoid filler.

### Step 4: Stage the draft

By default (`args.send = false`), the draft is staged in Gmail:

```
gmail.create_draft({
  to: "<recipient>",
  subject: "<subject>",
  body: "<draft text>",
  thread_id: "<thread-id>" | null,  // for replies
  in_reply_to: "<message-id>" | null,  // for replies
})
```

The response is a `draft_id`; the user can review in Gmail.

### Step 5: Optionally send

If `args.send = true`, the skill sends the draft:

```
gmail.send_draft({ draft_id: "<draft-id>" })
```

The skill **double-checks** sensitive cases:
- The recipient is an external address (not `@versalabs.dev`) — confirm
- The subject contains "legal", "contract", "termination", "lawsuit" — confirm
- The body contains the user's credit card, SSN, or other PII — halt and warn

If any check fails, the skill halts with a clear "this email needs human review" message; the draft is preserved in Gmail.

### Step 6: Log the send (if sent)

If the email was sent, the skill writes a `system_logs` row:

```
{
  level: "info",
  source: "skill:email-draft",
  message: "Sent email to <recipient>: <subject>",
  payload: { to, subject, message_id, action: "send" | "draft" }
}
```

The dashboard renders the event in the logs page; the user can audit the outbound communications.

### Step 7: Notify the user

Send the user a chat message:

```
[EMAIL DRAFTED] To: <recipient>
- Subject: <subject>
- Status: <draft | sent>
- Length: <word count>
- Gmail link: <draft URL>
- Note: <any tone warnings, e.g. "the draft assumes <X>; verify">
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "to": "...",
    "subject": "...",
    "status": "draft" | "sent",
    "draft_id": "..." | null,
    "message_id": "..." | null,
    "word_count": 187,
    "tone_notes": [...] | [],
    "duration_ms": 1234
  }
}
```

The dashboard renders the email card; the chat shows the summary.

## Error Handling

- **Recipient not in contacts** — the user is asked for the full email address
- **Multiple "Sarah" matches** — the user is asked to pick
- **The thread is locked (e.g. auto-responder)** — the skill uses the latest message from the actual recipient
- **OAuth token expired** — the user re-grants via the dashboard; the skill halts
- **The email contains PII** — halt; the user is warned; the draft is preserved
- **The email is to an external recipient AND `args.send = true`** — confirm; the skill asks "send to <external recipient>?"
- **The Gmail API rate-limits** — wait 60s; retry once

## Quality Checks

Before declaring the draft complete:

- [ ] Recipient resolved (email address valid; not a bounce-list address)
- [ ] Subject is concise (< 80 chars)
- [ ] Body is < 500 words (routine emails < 200)
- [ ] Tone matches the user's relationship with the recipient
- [ ] Context is relevant (the LLM didn't hallucinate project details)
- [ ] No PII in the body (unless explicitly intended)
- [ ] Draft is staged in Gmail (or sent, if `args.send = true`)
- [ ] User notified

A draft that doesn't pass all 8 is a degraded draft. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the Gmail draft before sending.
