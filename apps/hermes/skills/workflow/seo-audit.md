---
name: seo-audit
description: Audit the SEO of a website — crawl the site via the browser MCP, check meta tags / headings / images / performance, score and report. Used for "audit SEO for X" or "what's the SEO state of Y".
trigger:
  - "audit SEO"
  - "SEO check"
  - "check SEO"
  - "SEO audit for"
tools_required: ["browser"]
category: content
estimated_time: "15-30 minutes"
always_loaded: false
preferred_model_role: audit
---

# SEO Audit

## Purpose

Audit the SEO of a website end-to-end. The skill crawls the site via the `browser` MCP (Playwright-driven Chromium), checks meta tags / headings / images / performance / mobile-friendliness, scores each category, and produces a structured report. Used for "audit SEO for X" or "what's the SEO state of Y". The skill is **autonomous for standard sites** (< 50 pages, well-formed) and **HALTS for huge / JavaScript-heavy sites** (where the browser MCP can't see the content) — those need a human-composed plan.

The skill uses the `browser` MCP (`@playwright/mcp`) to navigate the site. The MCP is a real Chromium; the skill reads the rendered DOM (not the source), so JavaScript-rendered content is visible.

## Prerequisites

- A site to audit (`args.url` is the base URL; e.g. `https://jarvis.versalabs.dev`)
- A scope (default: crawl up to 50 pages starting from the base URL; `args.max_pages` can override)
- The browser MCP is configured (Playwright + Chromium)
- The user has permission to crawl the site (the skill respects `robots.txt`; if disallowed, it halts)

## Steps

### Step 1: Check `robots.txt` and `sitemap.xml`

The skill fetches the robots file:

```
browser.navigate({ url: "<args.url>/robots.txt" })
```

If the robots disallows the user-agent (default: `*`), the skill halts with a clear message: "robots.txt disallows crawling; please grant permission or use a different user-agent."

The skill also fetches the sitemap:

```
browser.navigate({ url: "<args.url>/sitemap.xml" })
```

The sitemap is the **authoritative list** of pages to audit. The skill uses it as the crawl seed (if available; otherwise, it follows internal links from the base URL).

### Step 2: Crawl the site

For each URL in the crawl queue:

```
browser.navigate({ url: "<page-url>" })
browser.snapshot()  // captures the rendered DOM
```

The skill extracts:
- **Meta tags** — title, meta description, meta robots, canonical link, Open Graph tags
- **Headings** — H1 (exactly 1?), H2s (3-7?), H3s (for sub-points)
- **Images** — alt text present? alt text descriptive? image dimensions set?
- **Links** — internal (broken? nofollow?) + external (broken? nofollow?)
- **Content** — word count, keyword density, readability
- **Structured data** — JSON-LD, microdata, RDFa
- **Performance** — page load time, first contentful paint, largest contentful paint
- **Mobile-friendliness** — viewport meta, responsive images, tap target sizes

The skill caps the crawl at `args.max_pages` (default: 50).

### Step 3: Score each category

For each category, the skill computes a score (0-10):

#### Title tag (max 10)
- **9-10** — 30-60 chars, includes primary keyword, unique across pages
- **6-8** — present, but slightly too long/short, or duplicated across a few pages
- **3-5** — present but missing keyword, or significantly off-length
- **0-2** — missing, or duplicate across many pages

#### Meta description (max 10)
- **9-10** — 150-160 chars, includes keyword + CTA, unique
- **6-8** — present, slightly off-length or generic
- **3-5** — present but missing keyword or CTA
- **0-2** — missing, or duplicate

#### Headings (max 10)
- **9-10** — exactly 1 H1, 3-7 H2s, H3s for sub-points, hierarchy is correct
- **6-8** — slightly off (2 H1s, or missing H2s on a long page)
- **3-5** — wrong hierarchy (H3 before H2), or no H1
- **0-2** — no headings, or completely wrong

#### Images (max 10)
- **9-10** — all images have alt text, dimensions are set, lazy loading is used
- **6-8** — most images have alt text; a few missing
- **3-5** — many images missing alt text or dimensions
- **0-2** — most images unoptimized

#### Performance (max 10)
- **9-10** — LCP < 2.5s, FCP < 1.8s, CLS < 0.1
- **6-8** — slightly above the targets
- **3-5** — significantly above the targets
- **0-2** — very slow

#### Mobile-friendliness (max 10)
- **9-10** — viewport meta set, responsive images, tap targets ≥ 48x48
- **6-8** — mostly good, a few small tap targets
- **3-5** — viewport missing, or images not responsive
- **0-2** — not mobile-friendly at all

The **overall score** is the weighted average: title (15%), description (10%), headings (15%), images (10%), performance (30%), mobile (20%).

### Step 4: Compile the report

The LLM composes a structured report:

```markdown
# SEO Audit: <Site Name>

**URL:** <args.url>
**Date:** <date>
**Pages crawled:** <N>
**Overall score:** <X>/10

## Score by Category
- **Title tag:** <X>/10
- **Meta description:** <X>/10
- **Headings:** <X>/10
- **Images:** <X>/10
- **Performance:** <X>/10
- **Mobile-friendliness:** <X>/10

## Top Issues (priority order)
1. <issue 1> — affects <N> pages — fix: <fix>
2. <issue 2> — affects <N> pages — fix: <fix>
3. ...

## Per-Page Findings
<table of page URL + title + score + top issue>

## Recommendations
1. <recommendation 1> — impact: <high/medium/low> — effort: <hours>
2. <recommendation 2> — impact: <high/medium/low> — effort: <hours>
3. ...

## Methodology
<crawled with @playwright/mcp via the JARVIS Hermes runtime; scored using the team's SEO rubric; respects robots.txt>
```

The report is 2-3 pages. If it's longer, the LLM is being verbose; the skill retries.

### Step 5: Save the report

The skill saves the report to `docs/seo-audits/<site-slug>-<date>.md` for git-tracked archival.

### Step 6: Optionally email the report

If `args.email = true`, the skill drafts an email with the report attached:

```
gmail.create_draft({
  to: "<user email>",
  subject: "SEO Audit: <Site Name> — score <X>/10",
  body: "<the report text>",
  attachments: [{ filename: "<slug>.md", path: "/workspace/docs/seo-audits/<slug>.md" }],
})
```

The user reviews the draft before sending (typically to the client or the team).

### Step 7: Notify the user

Send the user a chat message:

```
[SEO AUDIT] <Site Name>
- Overall score: <X>/10
- Top issues: <N> (highest priority: <issue>)
- Pages crawled: <N>
- Report: docs/seo-audits/<slug>.md
- Email: <draft URL> (if requested)
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "url": "...",
    "overall_score": 7.5,
    "category_scores": { "title": 8, "description": 7, ... },
    "pages_crawled": 50,
    "top_issues": [...],
    "report_path": "...",
    "duration_ms": 12345
  }
}
```

The dashboard renders the audit card; the chat shows the summary.

## Error Handling

- **`robots.txt` disallows** — halt; the user grants permission
- **The browser MCP is unreachable** — halt; the user checks the MCP container
- **The site is JavaScript-heavy (the browser can't see the content)** — halt; the user uses a SSR-friendly audit tool (the skill notes the limitation)
- **The crawl exceeds the timeout (60s per page)** — the skill reduces `args.max_pages`
- **The site has many 404s** — the report highlights the 404s; the user fixes the broken links
- **The site is behind a paywall** — the skill halts; the user provides auth or picks a different scope
- **The site is in a language other than English** — the skill still scores (the rubric is language-agnostic); the user provides a translator for the recommendations

## Quality Checks

Before declaring the audit complete:

- [ ] `robots.txt` and `sitemap.xml` checked
- [ ] Crawl capped at `args.max_pages`
- [ ] All 6 categories scored for every page
- [ ] Top issues prioritized by impact × pages-affected
- [ ] Per-page table populated
- [ ] Report is 2-3 pages
- [ ] Report saved locally
- [ ] Email drafted (if requested)
- [ ] User notified

An audit that doesn't pass all 9 is a degraded audit. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the report before acting on the recommendations.
