# AGENTS.md — Kidus Abdula Engineering Workflow
> Orchestrated under Architectural DNA v1.0.0

This file governs how all AI agents in this OpenCode setup coordinate. Every agent operates under the Six Pillars of the Architectural DNA. No exceptions.

---

## Agent Roster & Responsibilities

| Agent File | Role | Trigger |
|-----------|------|---------|
| `orchestrator.md` | Routes all requests to the correct agent | **Primary entry point — always start here** |
| `plan.md` | Architectural planner, schema designer | Any new feature, module, or project |
| `execute.md` | Full-stack implementer | After approved plan document exists |
| `debug.md` | Root cause analyst, bug fixer | Bugs, type errors, cache issues |
| `tech-lead.md` | Principal engineer, strategic decisions | Complex cross-cutting features, library decisions |
| `auditor.md` | Compliance scorer (0–10 report) | Post-implementation, pre-merge |
| `code-review.md` | PR reviewer | Every merge request |

---

## Active Skills (Loaded Contextually)

| Skill | Purpose | Load When |
|-------|---------|-----------|
| `architectural-dna` | Master reference for all Six Pillars | Always — every agent loads this |
| `premium-ui` | OKLCH, glassmorphism, Framer Motion standards | Any UI/component work |
| `schema-first` | SQL → Types → Zod → Config → Factory flow | Any new entity or schema change |
| `frontend-craft` | Factory hooks, TanStack Query, page patterns | Any implementation work |
| `ui-auditor` | Scoring rubric, audit checklists | Any review or compliance check |

---

## The Standard Feature Workflow

```
1. Human → Orchestrator        (classify request)
2. Orchestrator → Plan         (produce plan document)
3. Plan → Execute              (approved plan handed off)
4. Execute → Code Review       (implementation reviewed)
5. Code Review → Auditor       (scored compliance report)
6. Auditor: ≥8.5 → Merge      (<8.5 → required fixes → re-audit)
```

Use **Tech Lead** before Plan for:
- Cross-cutting features (touching multiple tiers or modules)
- New library or major dependency additions
- Parallel module development strategy
- Major refactors

Use **Debug** at any point when something breaks.

---

## The Six Pillars (Every Agent Enforces These)

| # | Pillar | Short Rule |
|---|--------|-----------|
| P1 | Schema-First | Schema → Types → Zod → Config → Factory → UI (always this order) |
| P2 | Factory Pattern | No bespoke CRUD. Use generic factories. |
| P3 | Extreme Modularization | Features have hard boundaries. No cross-feature imports. |
| P4 | Premium UI | OKLCH tokens, dual theme, glassmorphism, Framer Motion. Always. |
| P5 | Documentation First | Plan docs are written before code. AGENTS.md is always current. |
| P6 | End-to-End Type Safety | TypeScript strict. Zod at all boundaries. No `any`. |

---

## Global Anti-Patterns (Any Agent Blocks These)

```
❌ Starting implementation before plan is approved
❌ Handwriting types that should be generated
❌ Using `any` anywhere in production code
❌ Hardcoding colors instead of semantic tokens
❌ Writing custom CRUD hooks when factory exists
❌ Importing across feature module boundaries
❌ Skipping Zod validation in API routes
❌ Missing cache invalidation after mutations
❌ Merging with an Auditor score below 8.5
❌ "We'll polish the UI later" — premium is the baseline, not a phase
```

---

## Merge Requirements Checklist

Before any feature is merged:

```
[ ] Plan document approved
[ ] Execute implementation complete (all files per plan)
[ ] Code Review: no blockers remaining
[ ] Auditor score: 8.5 / 10 or higher
[ ] Dual theme (light + dark) verified manually
[ ] TypeScript compiles with zero errors (strict mode)
[ ] No `any` in production paths
[ ] Loading states present (skeleton-based)
[ ] Empty states present (with action)
[ ] Mobile layout verified at 375px
```

---

## Updating This File

Update AGENTS.md when:
- A new agent is added to the roster
- A new skill is created
- The standard workflow changes
- A new global anti-pattern is identified
- The merge requirements evolve

This file is a living document. It reflects the current state of the workflow, not its history.
