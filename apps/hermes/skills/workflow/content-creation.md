---
name: content-creation
description: Write a blog post (or any long-form content) — research the topic, outline the post, write the draft, optimize for SEO, save to Notion (or publish to the blog). Used for "write a blog post about X" or "draft a blog post on Y".
trigger:
  - "write blog post"
  - "draft blog post"
  - "create content"
  - "blog about"
tools_required: ["browser", "notion"]
category: content
estimated_time: "60-120 minutes"
always_loaded: false
preferred_model_role: office
---

# Content Creation

## Purpose

Write a long-form content piece (blog post, article, white paper) end-to-end. The skill researches the topic (via the browser MCP), outlines the post (H1 + H2s + H3s), writes the draft (1500-3000 words), optimizes for SEO (title tag, meta description, headings, internal links), saves to Notion, and optionally publishes to the blog. Used for "write a blog post about X" or "draft a blog post on Y". The skill is **autonomous for standard posts** (clear topic, well-defined audience) and **HALTS for opinion pieces** (where the user's voice matters) — those need a human-composed first draft.

The skill composes the foundational `plan-feature` (the post outline is a plan) + `research-and-report` (the topic research) + `notion-update` (the doc storage) + `seo-audit` (the SEO check) into a single flow.

## Prerequisites

- A topic (`args.topic` is the topic; e.g. "How to build a multi-tenant SaaS on Supabase")
- A target audience (`args.audience`; e.g. "full-stack developers", "engineering managers")
- A target length (`args.length`; default: 2000 words; can be 1500-3000)
- A target keyword (`args.keyword`; the SEO primary keyword; e.g. "multi-tenant SaaS")
- The team has a blog platform (Notion + a publish-to-web hook, or a static site generator)

## Steps

### Step 1: Research the topic

The skill uses the `browser` MCP to research the topic:

```
browser.navigate({ url: "https://www.google.com/search?q=<topic>" })
browser.snapshot()  // captures the SERP
```

The skill reads the top 10 results, then visits 3-5 authoritative sources (e.g. official docs, reputable blogs). For each, it captures the key claims + the URL.

The research is structured as a **source ledger** — each claim is tagged with a source URL and a confidence (HIGH / MEDIUM / LOW). The LLM uses the ledger to ground the post in real sources (no hallucination).

### Step 2: Outline the post

The LLM composes an outline (H1 + H2s + H3s):

```markdown
# <SEO-optimized title with the primary keyword>

## Introduction (1 paragraph)
<the hook: why this matters; what the reader will learn>

## <H2 1: First major point>
### <H3 1.1: Sub-point>
### <H3 1.2: Sub-point>

## <H2 2: Second major point>
### <H3 2.1: Sub-point>
### <H3 2.2: Sub-point>

## <H2 3: Third major point>
### <H3 3.1: Sub-point>
### <H3 3.2: Sub-point>

## Conclusion (1 paragraph)
<the takeaway; the call to action>

## Further Reading
<3-5 links to authoritative sources>
```

The outline is **keyword-aware**: the primary keyword appears in the title, the H1, at least one H2, and the first paragraph. Secondary keywords appear in 2-3 H2s.

The user reviews the outline; the skill proceeds with the full draft.

### Step 3: Write the draft

The LLM writes the post, following the outline. The writing follows the team's content style:

- **Tone** — informative, professional, slightly conversational; second-person ("you"); no jargon without definition
- **Length** — 2000 words default; can be 1500-3000
- **Paragraphs** — 3-5 sentences max; the skill splits longer paragraphs
- **Lists** — bulleted for unordered, numbered for ordered; nested up to 2 levels
- **Code** — fenced with the language tag; used sparingly (the post is prose, not a tutorial)
- **Images** — referenced via markdown `![alt](url)`; the skill generates alt text
- **Links** — internal links to other posts / docs; external links to authoritative sources

The draft is **the post**; the outline is just for review.

### Step 4: SEO optimization

The skill runs a `seo-audit` pass on the draft:

- **Title tag** — < 60 chars, includes the primary keyword
- **Meta description** — 150-160 chars, includes the primary keyword + a call to action
- **H1** — exactly 1, includes the primary keyword
- **H2s** — 3-7, each includes a secondary keyword
- **H3s** — 0-3 per H2, for sub-points
- **Keyword density** — primary keyword appears 3-5 times in the body; not stuffed
- **Internal links** — 2-3 to other posts / docs
- **External links** — 2-3 to authoritative sources
- **Image alt text** — descriptive, includes keywords where natural
- **Readability** — Flesch reading ease ≥ 60; average sentence length < 20 words

The skill makes any necessary edits to hit the SEO targets.

### Step 5: Save to Notion

The skill creates a Notion page in the team's "Content" database:

```
notion.create_page({
  database_id: "<CONTENT_DB_ID>",
  properties: {
    title: "<SEO title>",
    topic: "<args.topic>",
    audience: "<args.audience>",
    primary_keyword: "<args.keyword>",
    word_count: 2000,
    status: "Draft",
    author: "<user name>",
  },
  children: [<the post blocks>],
})
```

The Notion page becomes the canonical record; the markdown is the source.

### Step 6: Save a local copy

The skill writes the post to `docs/content/<topic-slug>.md` for git-tracked archival:

```markdown
---
title: <SEO title>
date: <publish date>
author: <user name>
topic: <args.topic>
audience: <args.audience>
primary_keyword: <args.keyword>
---

# <SEO title>

<the post body>
```

The doc is committed in the same commit as the Notion page creation.

### Step 7: Optionally publish

If `args.publish = true`, the skill publishes to the team's blog:

- **For Notion-published blogs** — toggle the "Published" status on the Notion page
- **For static site blogs** — commit the markdown to the `blog/` dir; the static site generator picks it up on the next deploy

The skill notifies the user when the post is live.

### Step 8: Schedule social media (optional)

If `args.schedule_social = true`, the skill schedules social media posts:

```
twitter.create_post({ text: "<hook + link to post>", scheduled_at: "<datetime>" })
linkedin.create_post({ text: "<hook + link to post>", scheduled_at: "<datetime>" })
```

The user reviews the drafts before they go live.

### Step 9: Notify the user

Send the user a chat message:

```
[CONTENT CREATED] <Topic>
- Notion: <url>
- Local doc: docs/content/<slug>.md
- Word count: <N>
- Primary keyword: <args.keyword>
- SEO score: <X>/10 (from the seo-audit pass)
- Status: <Draft | Published (live URL)>
- Social: <scheduled posts>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "title": "...",
    "notion_url": "...",
    "local_doc": "...",
    "word_count": 2000,
    "seo_score": 8.5,
    "primary_keyword": "...",
    "status": "draft" | "published",
    "live_url": "..." | null,
    "duration_ms": ...
  }
}
```

The dashboard renders the post card; the chat shows the summary.

## Error Handling

- **The topic is too narrow (no SERP results)** — the skill broadens the topic; the user reviews
- **The research returns only LOW-confidence sources** — the skill halts; the user provides authoritative sources
- **The outline has no clear angle** — the skill iterates on the angle; the user picks
- **The post is below the SEO score (e.g. 6/10)** — the skill retries with stricter SEO prompts
- **The blog platform is unreachable** — the Notion page is created; the user publishes manually
- **The user wants an opinion piece** — halt; the user writes the first draft; the skill edits + polishes

## Quality Checks

Before declaring the post complete:

- [ ] 3-5 authoritative sources read
- [ ] Outline reviewed by the user
- [ ] Post is 1500-3000 words
- [ ] Primary keyword in title, H1, first paragraph, 3-5 body mentions
- [ ] SEO score ≥ 8.0/10
- [ ] Readability score ≥ 60 (Flesch)
- [ ] Internal + external links
- [ ] Notion page created
- [ ] Local doc saved
- [ ] User notified

A post that doesn't pass all 10 is a degraded post. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the post before publishing.
