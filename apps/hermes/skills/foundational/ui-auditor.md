---
name: ui-auditor
description: The UI auditor's role — score an implementation against the DNA P4 standard. Produces a DNA-compliant report with audit IDs (C/H/P) for every gap. Used before any UI PR is merged.
trigger:
  - "audit UI"
  - "UI score"
  - "compliance check"
  - "DNA report"
tools_required: []
category: foundational
estimated_time: "5 minutes"
always_loaded: false
preferred_model_role: audit
---

# UI Auditor

## Purpose

The UI auditor scores a UI surface against the JARVIS DNA P4 (Premium UI) standard and the related P2/P3/P6 gates. The auditor's output is a **DNA-compliant report** that the merge-gate consumes. A score below 8.5/10 is a merge blocker; the report lists the audit IDs (C-* / H-* / P-*) for every gap, plus the concrete fix.

The auditor is invoked by the orchestrator before any UI PR is merged and during periodic codebase reviews. The auditor is **not** a vibe-checker; every claim is grounded in a measurable signal (lint-gate output, screenshot, DOM inspection).

## Prerequisites

- The PR's diff + a fresh dev build (`pnpm -F web dev` or `pnpm -F mobile start`)
- The `premium-ui` and `frontend-craft` skills loaded for context
- The `apps/auditor-framework/` scoring rubric (see `docs/AUDITOR-FRAMEWORK-V1.5.md`)
- A tool for capturing screenshots: light mode + dark mode, 1280px and 360px widths (web); iOS + Android (mobile)
- A tool for inspecting the DOM: Chrome DevTools, React DevTools, Expo Inspector

## Steps

### Step 1: Run the four lint gates first (objective signals)

These are the fastest, most objective signals. A hit on any is an automatic deduction:

```bash
pnpm color-gate        # P4 — 0 hits required
pnpm any-gate          # P6 — 0 hits required
pnpm import-check      # P3 — 0 hits required
pnpm factory-check     # P2 — every CRUD goes through the factory
```

For each gate, capture the output verbatim in the report. A hit is a **P-violation** with the gate output as the audit ID. Example:

> **P4 violation: hardcoded color in `apps/web/src/components/UserCard.tsx:42`**
> Audit ID: `pnpm color-gate` output: `bg-white #fff ...`
> Fix: replace with `bg-[var(--color-surface)]`.

### Step 2: Score the four data-view states (P4)

Visit the new screen on a fresh DB:

- **Loading** — refresh; the screen shows a skeleton + (if >1s) a small spinner. Inputs are disabled.
- **Empty** — trigger the empty state (delete all data, or stub the fetch). The screen shows an illustration + headline + CTA.
- **Error** — stub the fetch to 500. The screen shows an inline message + retry button + correlation ID.
- **Success** — real data. The screen shows the data + the four-state skeleton stops.

For each state, score 0-2.5:

- **0** — state is missing (the screen shows a "default" or crashes)
- **1** — state is present but inconsistent (e.g. loading shows the data shape but not a skeleton)
- **2** — state is present and matches the design system (animation, color, a11y)
- **2.5** — state is present, matches, and goes beyond (e.g. error state includes a "report this issue" link with the correlation ID)

Total data-view score: `/10` (4 states × 2.5 each).

### Step 3: Score the entrance animation (P4)

Refresh the page; record the entrance:

- **0** — no animation; the page paints instantly
- **1** — animation present but janky (60fps drops on mid-tier mobile)
- **2** — animation present, smooth, but no stagger between siblings
- **2.5** — animation present, smooth, with a stagger of 50-100ms between siblings, using the shared `containerVariants` from `apps/web/src/lib/motion.ts`

A bespoke Framer Motion variant in the component (not imported from `motion.ts`) is a **P3 violation** in addition to the P4 score (modularization: motion primitives are shared).

### Step 4: Score the color discipline (P4)

For every color in the new component/page, check:

- Is it an OKLCH token from `apps/web/src/styles/tokens.css`? (Yes = +0.25 per surface; No = -1 per surface)
- Is the dark-mode equivalent defined? (Yes = +0.25; No = -1)
- Are translucent surfaces using `bg-foo/60`? (Yes = +0.25; No = -0.5)
- Is there a `backdrop-blur-xl` on floating surfaces? (Yes = +0.25; No = -0.5)

Total color discipline: `/1` (sum of +0.25s, capped at 1).

### Step 5: Score the accessibility (P4 + general a11y)

Tab through the new surface:

- Every interactive element reachable? (Yes = +0.5; No = -1 per unreachable)
- Focus ring visible on every focus? (Yes = +0.5; No = -1)
- Esc closes modals/popovers? (Yes = +0.5; No = -1)
- Screen reader announces the labels? (Use VoiceOver / NVDA / TalkBack. Yes = +0.5; No = -1)
- Color contrast ≥ 4.5:1 (body text) and ≥ 3:1 (large text)? (Yes = +0.5; No = -1)

Total a11y: `/2.5`.

### Step 6: Score the responsive + mobile (P4)

- **Web:** check the surface at 1280px, 768px, 640px, 360px. Does the layout reflow? Are touch targets ≥ 44×44? (Yes = +1; partial = +0.5; No = 0)
- **Mobile:** iOS + Android. Does the surface respect safe-area insets? Does the keyboard cover input fields? (Yes = +1; partial = +0.5; No = 0)

Total responsive + mobile: `/2`.

### Step 7: Compile the report

Sum the scores; the maximum is 22.5. Convert to /10:

```
DNA UI Audit Report — <surface name>
=====================================

Lint gates (max 4 deductions, 0 = pass):
  - color-gate:  <PASS | <N hits>>
  - any-gate:    <PASS | <N hits>>
  - import-check:<PASS | <N hits>>
  - factory-check:<PASS | <N hits>>

Sub-scores (max 22.5):
  - Data-view states:  /10
  - Entrance animation: /2.5
  - Color discipline:   /1
  - Accessibility:      /2.5
  - Responsive + mobile: /2

Total:  /22.5
Score:  /10 (Total / 22.5 * 10)

Floor: 8.5/10 (DNA merge gate)

Audit IDs:
  - P4-COLOR-1: <description> (if any)
  - P4-LOAD-2: <description> (if any)
  - ...
```

The score is the merge decision. ≥ 8.5 = pass; 7.0-8.4 = acceptable, conditional; < 7.0 = blocked.

## Output

The report is appended to the PR description (or pasted into the gate-finding doc). The report cites the audit IDs, the lint-gate output, and the fix for each violation. The auditor also leaves inline comments on the diff for the engineer to address.

## Error Handling

- **Lint gate fails on a file outside the diff** — that's a pre-existing violation; the auditor reports it but doesn't block the PR. The existing violation is filed in the F carryover ledger.
- **The auditor disagrees with the engineer's claim of "tested in dark mode"** — the auditor captures the screenshot; the screenshot is the truth. A missing dark-mode screenshot is treated as "not tested."
- **A 60fps animation jitters on the auditor's machine** — the auditor captures the recording; the recording is the evidence. A janky animation is a P4 deduction regardless of the engineer's claim.
- **The auditor can't run the dev build** — the auditor skips Steps 2-6 and reports **score: UNKNOWN**. The PR is blocked until the dev build is healthy.

## Quality Checks

The auditor's own output is audited:

- **Every audit ID maps to a concrete file:line or lint-gate output** — no "feels off" or "could be better"
- **Every screenshot is taken at the spec widths** (1280, 768, 640, 360; iOS, Android)
- **The score is reproducible** — running the audit a second time yields the same score
- **The fix for every violation is one PR's worth of work** — no "rewrite the design system" recommendations

A UI audit that doesn't pass these is itself a P5 violation (docs as architecture: the audit is a doc).
