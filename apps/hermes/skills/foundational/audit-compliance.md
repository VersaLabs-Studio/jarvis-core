---
name: audit-compliance
description: DNA compliance scoring — walk the Six Pillars (P1-P6), score each, produce a gate report with audit IDs (C/H/P) for every gap. The merge floor is 8.5/10; below that is a merge blocker.
trigger:
  - "audit compliance"
  - "DNA score"
  - "compliance check"
  - "pillar check"
tools_required: []
category: foundational
estimated_time: "10-20 minutes"
always_loaded: false
preferred_model_role: audit
---

# Audit Compliance

## Purpose

Encode the discipline of **DNA compliance scoring**. The auditor walks the Six Pillars (P1-P6), scores each against objective signals (lint-gate output, test results, git log, screenshots), and produces a **gate report**. The merge floor is 8.5/10; below that is a merge blocker with specific audit IDs (C-/H-/P-) for every gap. The auditor is the verifier; the auditor is **not** the engineer.

The auditor is invoked by the orchestrator at every WP gate and every phase gate. The auditor is also invoked during periodic codebase reviews (the "audit the whole repo" call). The auditor's output is committed to `docs/PHASE-<X>-GATE-FINDINGS.md`; the architect reviews the report; the merge either proceeds or is blocked.

## Prerequisites

- The PR's diff (or the phase's integrated branch) ready to audit
- The plan doc for the WP or phase
- The `architectural-dna` skill loaded (the Six Pillars are the rubric)
- The `ui-auditor` skill loaded (for UI-specific audits)
- The relevant lint gates runnable locally
- The dev environment (for manual checks; some audits require a running service)

## Steps

### Step 1: Run the standing DNA gates (objective signals)

These are the fastest, most objective signals. A hit on any is an automatic deduction:

```bash
pnpm -r typecheck               # P6 — tsc --noEmit 0
pnpm any-gate                   # P6 — no `any` in production
pnpm color-gate                 # P4 — no hardcoded colors
pnpm factory-check              # P2 — every CRUD through the factory
pnpm import-check               # P3 — no cross-feature imports
pnpm type-drift:check           # P1 — generated types match migrations
```

For each gate, capture the output verbatim. A hit is a **P-violation** with the gate output as the audit ID:

> **P6 violation: `any` in production path** — `apps/api/src/routes/workflows/handler.ts:42`
> Audit ID: `pnpm any-gate` output: `apps/api/src/routes/workflows/handler.ts:42: const data: any = ...`
> Fix: replace `any` with `unknown` + a type guard, or import the right type from `@jarvis/shared`.

The lint-gate deductions are unconditional: a single hit on `any-gate` is a P6 violation, period.

### Step 2: Score each Pillar (P1 through P6)

Each Pillar is scored 0-2 (with 0.5 increments). The max is 12 across the Six Pillars; convert to /10 with `Score = (Total / 12) * 10`.

#### P1 — Schema-First (max 2)

- **2** — every entity has a migration → generated types → Zod → registry → factory hook chain; no hand-written types; no two sources of truth
- **1.5** — the chain is followed but one step (e.g. Zod validation) is loose
- **1** — the migration is correct but a downstream file hand-writes a Row type
- **0.5** — multiple hand-written types; some Zod schemas disagree with the generated types
- **0** — no migration; the data model is hand-written; or two sources of truth

#### P2 — Factory Pattern (max 2)

- **2** — every CRUD goes through `registerCrud`; every client uses the factory hooks; no bespoke `supabase.from(...).insert(...)`
- **1.5** — the API uses the factory but a single client uses a bespoke wrapper
- **1** — the API has one bespoke handler; the client mostly uses the factory
- **0.5** — multiple bespoke CRUD surfaces; the factory is partially used
- **0** — bespoke CRUD is the norm; the factory is bypassed

#### P3 — Extreme Modularization (max 2)

- **2** — every feature has `_components/`, `_hooks/`, `_types/`; no cross-feature imports; the public surface is explicit
- **1.5** — one cross-feature import (caught by `pnpm import-check`); minor violation
- **1** — multiple cross-feature imports; the boundaries are leaky
- **0.5** — features are coupled; a change in one requires a change in another
- **0** — no modularization; everything is in `app/` or a single `components.tsx`

#### P4 — Premium UI (max 2)

- **2** — OKLCH tokens; glassmorphism on floating surfaces; Framer Motion stagger on every page; all four data-view states; a11y; responsive
- **1.5** — one of the above is missing (e.g. no Framer Motion on a single page)
- **1** — multiple of the above are missing; the UI is "functional but not premium"
- **0.5** — the UI is generic AI aesthetic (default Tailwind colors, no animation, no glassmorphism)
- **0** — the UI is broken or inaccessible

#### P5 — Documentation as Architecture (max 2)

- **2** — the plan doc is written before the code; the doc is the source of truth; the implementation cites the doc
- **1.5** — the plan doc exists but the implementation has minor deviations; the deviations are documented
- **1** — the plan doc is missing or the implementation significantly deviates
- **0.5** — no plan doc; the implementation is the only artifact
- **0** — no docs at all

#### P6 — End-to-End Type Safety (max 2)

- **2** — strict mode; no `any`; Zod at every boundary; generated types only; all four `tsconfig` strict flags enabled
- **1.5** — one `any` (e.g. in a single legacy file); no Zod at one boundary
- **1** — multiple `any`; Zod is partial
- **0.5** — `any` is the norm; Zod is missing
- **0** — no TypeScript; or `any` is the default

### Step 3: Compile the gate report

Sum the Pillar scores (max 12). Convert to /10. Add the lint-gate deductions as separate P-violations.

```
DNA Compliance Audit — <WP id or phase>
======================================

Lint gates (0 = pass; 1 hit = automatic P-violation):
  - typecheck:       <PASS | <N errors>>
  - any-gate:        <PASS | <N hits>>
  - color-gate:      <PASS | <N hits>>
  - factory-check:   <PASS | <N hits>>
  - import-check:    <PASS | <N hits>>
  - type-drift:check <PASS | DRIFT>

Pillar scores (max 12):
  - P1 Schema-First:        /2
  - P2 Factory Pattern:     /2
  - P3 Modularization:      /2
  - P4 Premium UI:          /2
  - P5 Docs as Architecture: /2
  - P6 Type Safety:         /2

P-violations (deductions):
  - P6-ANY-1: <description> (lint gate hit; -1)
  - P4-COLOR-1: <description> (lint gate hit; -1)
  - ...

Total:  /12
Score:  /10 (Total / 12 * 10)

Floor: 8.5/10 (DNA merge gate)

Verdict: <PASS | BLOCKED | CONDITIONAL>

Audit IDs closed by this WP/phase: <C-/H-/P- list>
Audit IDs opened by this WP/phase: <C-/H-/P- list>
```

The verdict:
- **PASS** (≥ 8.5) — proceed with merge
- **CONDITIONAL** (7.0-8.4) — proceed with merge IF the P-violations are scheduled in a follow-up WP (the carryover ledger is updated)
- **BLOCKED** (< 7.0) — refuse the merge; the engineer addresses the P-violations in this PR

### Step 4: Walk the carryover ledger

The carryover ledger (`docs/PHASE-<X>-HANDOFF.md` §7) tracks known P0/P1/P2 violations deferred to a later phase. The auditor checks:

- **Is the violation being closed in this WP?** — if yes, confirm the fix lands
- **Is the violation still open?** — if yes, confirm the carryover is still in the ledger
- **Has a new violation appeared that isn't in the ledger?** — flag it; the auditor opens a new audit ID

A new violation that's not in the ledger is a **discovery**; the auditor opens a new audit ID and adds it to the ledger. The orchestrator routes the discovery to the next phase's plan.

## Output

A gate report is appended to `docs/PHASE-<X>-GATE-FINDINGS.md`. The report is a single markdown section with:

- The lint-gate output
- The Pillar scores
- The P-violations (with audit IDs)
- The verdict (PASS / CONDITIONAL / BLOCKED)
- The carryover ledger delta (closed vs. opened)

The report is committed in the same PR as the WP (or, for a phase gate, in a separate commit on the phase branch).

## Error Handling

- **A lint gate fails for an unrelated reason** (e.g. a broken base) — the auditor halts; the gate is invalid. The orchestrator routes the base-fix WP first; the gate retries.
- **The engineer disagrees with the Pillar score** — the auditor walks the engineer through the scoring. If the disagreement persists, escalate to the architect. The auditor's score is the merge decision; the architect can override.
- **A new violation is discovered that's a P0 (security, data loss)** — the gate is BLOCKED regardless of the Pillar score. The P0 fix is a follow-up WP that lands in the same phase (not deferred to F).
- **The Pillar scores are inconsistent (P5 = 2 but P6 = 0.5)** — the auditor checks the cross-cutting consistency. A P5 = 2 ("plan doc is the source of truth") but P6 = 0.5 ("`any` is the norm") is incoherent; the plan doc can't be the source of truth if the code is `any`-ridden. The auditor re-scores or escalates.

## Quality Checks

The auditor's own output is audited:

- **Every P-violation has a concrete file:line or lint-gate output** — no "feels off" or "could be better"
- **The Pillar scores are reproducible** — running the audit a second time yields the same scores
- **The carryover ledger is updated** — the audit IDs are tracked, not lost
- **The verdict is a function of the scores + the carryover** — no override of the math

A DNA compliance audit that doesn't pass these is itself a P5 violation (docs as architecture: the audit is a doc).
