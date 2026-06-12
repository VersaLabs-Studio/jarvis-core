---
name: plan-feature
description: Produce a plan doc in the DNA P5 format — header, where-we-are, what-already-exists, scope, tech-lead consult, WP map, acceptance criteria, risks, open questions, definition of done, approval block. The plan is the source of truth; the implementation cites it.
trigger:
  - "plan this feature"
  - "design this"
  - "architecture plan"
  - "WP map"
tools_required: []
category: foundational
estimated_time: "10-30 minutes"
always_loaded: false
preferred_model_role: planning
---

# Plan Feature

## Purpose

Encode the discipline of producing a **plan doc before writing any code**. The plan is the BRAIN's contract with the HANDS: it resolves the architectural decisions, lays out the WP map, defines the acceptance criteria, and gets the architect's sign-off. The implementation cites the plan; the auditor scores the implementation against the plan. A code-first culture produces drift; a plan-first culture produces predictability.

The plan doc lives at `docs/PHASE-<X>-PLAN.md` (or `docs/<feature>-PLAN.md` for non-phase work). It is committed before the WP branches. The git log reads as a sequence of plan → implement → audit.

## Prerequisites

- The master architecture doc (`docs/PART<N>-*.md`) for the relevant subsystem
- The phase handoff from the BRAIN (`docs/PHASE-<X>-HANDOFF.md`)
- The carryover ledger from prior phases (don't recircle solved problems)
- A clear sense of the **scope** — what's in, what's out, what stays
- A clear sense of the **risk** — what could go wrong, what the blast radius is

## Steps

### Step 1: Resolve the architectural decisions FIRST

The BRAIN's handoff usually lists "gaps and inconsistencies" that the plan must resolve before fan-out. These are typically:

- **Path inconsistencies** (e.g. `apps/hermes/` vs `services/hermes/`)
- **Contract drift** (e.g. `POST /v1/chat` vs `POST /v1/chat/stream`)
- **Tech-lead questions** (e.g. "which model routing strategy?")
- **Schema ownership** (e.g. "which type is canonical for X?")

Each gets a numbered section in the plan: "§1: Inconsistency Resolutions." The resolution is **specific** (a file path, a wire shape, a chain config), not a "we'll figure it out." The plan-agent's first job is to **lock these down** so the executor doesn't have to guess.

### Step 2: Answer the Tech Lead consult questions

The BRAIN often defers two questions to the Tech Lead:

1. **Cross-cutting decision** (e.g. "model routing + fallback chain")
2. **Trust boundary** (e.g. "code-exec sandbox / socket-proxy")

The plan must answer both with **concrete code, not prose**. The "Resolved design" section includes a code sketch (TypeScript, not pseudocode) that the executor will follow verbatim. If a sketch can't be written, the decision isn't ready.

### Step 3: Lay out the WP map

The plan's §4 is the WP map. Each WP has:

- **ID** (E0, E1, E2; or FEAT-1, FEAT-2; or BUG-123)
- **Branch** (`feat/e-hermes-runtime` off `phase/e-skills`)
- **Scope** — one paragraph; what's in, what's out
- **Depends on** — other WPs that must land first
- **Closes** — the audit IDs this WP retires
- **Golden template** — which existing code to mirror (e.g. "follow `apps/api/src/server.ts` for the Fastify boot pattern")
- **Acceptance criteria** — a checklist of testable assertions

The WP map answers: **who does what, in what order, to close which audit IDs?**

### Step 4: Define the file tree + wire contract

The plan's §5 is the file tree. Every new file is listed with its purpose. The plan's §5.2 is the wire contract — every new endpoint, every new event, every new key, with the exact shape (Zod schema or TS interface).

A plan without a wire contract is a sketch, not a plan.

### Step 5: Spell out the acceptance criteria

The plan's §7 (or wherever the gate is documented) is the **holistic gate** — every line is a testable assertion. The Auditor scores against this list. The acceptance criteria are the merge floor; the auditor is the verifier.

### Step 6: Risk register + open questions

The plan's §8 (risks) and §9 (open questions) are **discipline**, not paperwork:

- **Risks** — "what could go wrong, what's the likelihood, what's the blast radius, how do we mitigate?" A risk without a mitigation is a worry.
- **Open questions** — "what decisions are still pending, who decides, what's the default if no one does?" A question without a default is a blocker.

### Step 7: Definition of done + approval block

The plan's §10 (DoD) is the per-WP checklist the executor runs through. The plan's §11 (Approval Block) is the literal signature line:

```
APPROVED  ☐  REVISE  ☐  REJECT  ☐

Reviewer: __________________________________   Date: ____________
```

The plan is **not** the architect's approval. The plan is the request for the architect's approval. The orchestrator routes the plan to the architect; the architect signs; only then does the executor write code.

## Output

A plan doc lands as 1 markdown file + 1 PR title. The PR body cites the plan doc as the source of truth; the executor's commit messages cite the plan's WP IDs. The plan doc is the **first commit** on the phase branch (or the only commit on a non-phase branch — the implementation commits come after the plan is approved).

## Error Handling

- **The plan is too long (>1000 lines)** — the scope is too big. Split into sub-plans or defer to a later phase. A 2000-line plan is a 6-month project; a 200-line plan is a WP.
- **The plan is too short (<100 lines)** — the executor will guess. Add the wire contract, the acceptance criteria, and the risk register.
- **The plan has unresolved §3 gaps** — go back to Step 1. The executor MUST NOT receive a plan with open questions.
- **The plan cites an audit ID that doesn't exist** — the carryover ledger is the source of truth. Update the ledger or remove the citation.
- **The plan is approved but the executor can't follow it** — the plan was too abstract. The architect should have caught this; the executor must halt and re-route, not improvise.

## Quality Checks

Before routing the plan to the architect, run:

```bash
# 1. The plan has a §3 (inconsistency resolutions) — non-empty
grep -E "^## 3\." docs/PHASE-*-PLAN.md
# Expected: 1+ match (or "no inconsistencies" with rationale)

# 2. The plan has a §4 (WP map) — every WP has a branch + acceptance criteria
grep -E "^\| \*\*E[0-9]+\*\*" docs/PHASE-*-PLAN.md
# Expected: 1+ matches

# 3. The plan has a §6 or §7 (gate criteria) — every line is testable
grep -E "^\[ \]" docs/PHASE-*-PLAN.md
# Expected: 5+ matches

# 4. The plan has an §11 (approval block) — literal "APPROVED" line
grep -E "APPROVED  ☐" docs/PHASE-*-PLAN.md
# Expected: 1 match

# 5. The plan cites at least one Part<N>-*.md as the spec input
grep -E "PART[0-9]" docs/PHASE-*-PLAN.md
# Expected: 1+ matches
```

A plan that doesn't pass all five is a P5 violation (docs as architecture: the plan IS the architecture for this phase). The orchestrator returns the plan to the planner; the executor waits.
