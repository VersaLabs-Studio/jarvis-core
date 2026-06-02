# JARVIS v1.5 — Orchestrator Coordination Plan

> **Role:** Master Orchestrator  
> **Scope:** Full v1.5 release (Phases A–F)  
> **Standard:** Architectural DNA v1.0.0 — Six Pillars govern every commit  
> **Source of Truth:** `docs/V1.5-BUILD-HANDOFF.md` + `docs/PART1–5` + `docs/ARCHITECTURE-AUDIT.md`  
> **Date:** June 2026  
> **Status:** Active — Phase A routing begins on human "commence" signal

---

## 1. Phase Sequencing & Dependency Graph

### 1.1 Phase Order (Strict Sequential with Internal Parallelism)

```
Phase A ──gate──▶ Phase B ──gate──▶ Phase C ──gate──▶ Phase D ──gate──▶ Phase E ──gate──▶ Phase F
Foundation        API+Bridge        Web Dashboard      Mobile App        Skills+Workflows   Deploy+Polish
```

**Phases are strictly sequential.** A phase gate must pass before the next phase begins. Within each phase, work packages parallelize per the dependency graph below.

### 1.2 Phase Dependency Matrix

| Phase | Depends On | Blocks | Rationale |
|-------|-----------|--------|-----------|
| **A** | — | B, C, D, E, F | Foundation: monorepo, types, compose, CI. Everything imports from here. |
| **B** | A (types, compose) | C, D, E, F | API + factory + auth. Clients need working endpoints. |
| **C** | B (API, factory, auth) | D | Web dashboard. Mobile shares hooks/data-layer patterns from here. |
| **D** | C (data layer, design patterns) | — | Mobile app. Independent from E/F. |
| **E** | B (Hermes bridge, factory) | F | Skills + workflows. Needs Hermes + API to test end-to-end. |
| **F** | A (compose), B (RLS, auth), E (skills) | — | Deploy. Requires everything functional. |

### 1.3 Work Package Dependency Graph (Internal to Each Phase)

```
PHASE A:
  A1 (monorepo) ──▶ A2 (shared-types) ──▶ A4 (CI)
                 └──▶ A3 (compose)
  A2 ∥ A3 run in parallel after A1
  A4 depends on A2 only

PHASE B:
  B1 (env+response) ──▶ B2 (auth) ────▶ B5 (websocket)
                       │              ├──▶ B6 (services+secrets) ──depends on A3──
                       │              └──▶ B7 (RLS) ──depends on A2──
                       ├──▶ B3 (crud-factory)
                       └──▶ B4 (hermes-bridge)
  B2 ∥ B3 ∥ B4 run in parallel after B1
  B5 ∥ B6 ∥ B7 run in parallel after B2

PHASE C:
  C1 (design-system) ──▶ C2 (data-layer) ──▶ C3..C8 (pages, 6-way fan-out)
  C2 depends on C1 + B3
  C8 (auth-ui) additionally depends on B5

PHASE D:
  D1 (shell) ──▶ D2 (chat)
              ├──▶ D3 (tabs)
              └──▶ D4 (push)
  D2 additionally depends on B5
  D2 ∥ D3 ∥ D4 run in parallel after D1

PHASE E:
  E1 (foundational-skills) ──┐
  E2 (workflow-skills)    ───┼──▶ E4 (cron)
  E3 (mcp-pinned)         ───┘
  E1 ∥ E2 ∥ E3 run in parallel
  E4 depends on all three + B3

PHASE F:
  F1 (tls-nginx) ──▶ F2 (backups)
                  ├──▶ F3 (observability)
                  └──▶ F4 (vps-deploy) ──depends on F1──
  F2 ∥ F3 run in parallel after F1
  F4 runs last
```

---

## 2. Agent Routing Table

### 2.1 Per-Phase Agent Assignment

| Phase Gate | Plan | Tech Lead (Consult) | Execute (Fan-out) | Code Review | Debug (On-call) | Auditor |
|-----------|------|--------------------|--------------------|-------------|-----------------|---------|
| **A → B** | Plan A doc | Turborepo graph + socket-proxy topology | A1 → A2∥A3 → A4 (max 3 parallel) | Per PR | On-call | Phase A score + B1/H1/H7 closure |
| **B → C** | Plan B doc | Auth model + factory abstraction (B5/B2) | B1 → B2∥B3∥B4 → B5∥B6∥B7 (max 4 parallel) | Per PR | On-call | Phase B score + B2/B5 closure |
| **C → D** | Plan C doc | — | C1 → C2 → C3∥C4∥C5∥C6∥C7∥C8 (max 6 parallel) | Per PR | On-call | Phase C score + color-gate |
| **D → E** | Plan D doc | — | D1 → D2∥D3∥D4 (max 3 parallel) | Per PR | On-call | Phase D score |
| **E → F** | Plan E doc | — | E1∥E2∥E3 → E4 (max 3 parallel) | Per PR | On-call | Phase E score + C4/H2 closure |
| **F → tag** | Plan F doc | TLS/domain + rollout strategy | F1 → F2∥F3 → F4 (max 2 parallel) | Per PR | On-call | Phase F score + B3/B4/H5/H6/H8 closure |

### 2.2 Agent Routing Rules (Decision Tree)

```
Incoming request / status update
  │
  ├─ "Build phase X" / "Plan phase X"
  │   └─ Route to PLAN → produce plan doc → return for HUMAN APPROVAL
  │       └─ If cross-cutting decision flagged → TECH LEAD consult FIRST
  │
  ├─ "Plan approved, begin execution"
  │   └─ Route to EXECUTE (fan-out per dependency graph)
  │       └─ Each sub-agent works on its feat/* branch
  │       └─ Each sub-agent self-certifies DoD block (§6)
  │       └─ Each sub-agent opens PR into phase/* when done
  │
  ├─ "PR opened on feat/*"
  │   └─ Route to CODE REVIEW
  │       ├─ Blockers found → route to EXECUTE (fix) → re-review
  │       └─ Clean → approve PR → merge into phase/*
  │
  ├─ "All packages merged into phase/*"
  │   └─ Run Part 5 phase verification checklist (automated)
  │   └─ Route to AUDITOR
  │       ├─ Score ≥ 8.5 + 0 blockers + green checklist → PR phase/* → develop
  │       └─ Score < 8.5 or blockers → route to EXECUTE (fix) → re-audit
  │
  ├─ "Something is broken" / "Test failing" / "Type error"
  │   └─ Route to DEBUG
  │       └─ Root cause → fix → re-enter the pipeline at the appropriate stage
  │
  ├─ "Should we use X?" / "How do we handle Y across modules?"
  │   └─ Route to TECH LEAD
  │       └─ Decision documented → feeds back into Plan or Execute
  │
  └─ "Audit the codebase" / "Check for drift"
      └─ Route to AUDITOR directly
```

### 2.3 Agent Load Balancing

| Agent | Max Concurrent Engagements | Queuing Rule |
|-------|---------------------------|--------------|
| **Plan** | 1 (one phase at a time) | Next phase plan starts only after current phase gate passes |
| **Execute** | Up to 6 (one per work package) | Limited by dependency graph; never more than max parallel for the phase |
| **Code Review** | 1 (sequential reviews) | Reviews PRs in order of merge priority (foundations first) |
| **Auditor** | 1 (one phase at a time) | Runs only after all packages merged into phase/* |
| **Tech Lead** | 1 (consultation) | Engaged before Plan for flagged phases; on-call for Execute questions |
| **Debug** | On-call | Engages only when a gate check fails or error is reported |

---

## 3. Parallelization Strategy

### 3.1 P3 Boundary Rules

**P3 (Extreme Modularization)** is the governing constraint for parallelization. Two work packages can run in parallel **if and only if:**

1. They operate on **separate directories** with no shared mutable state
2. They import from **common foundations** (types, factory, design tokens) that are already built
3. They do not modify the **same files** in `packages/shared`, `apps/api`, or config directories
4. Their **types/interfaces** are already defined in the shared package

### 3.2 Parallelization Map (Per Phase)

```
PHASE A:  A1 ──────────────────────────────────┐
                                               ├─▶ A2 ∥ A3 ──▶ A4
          Serial: A1 first (monorepo scaffold)
          Parallel: A2 (types) ∥ A3 (compose) — independent directories
          Serial: A4 (CI) needs A2 types to verify drift guard

PHASE B:  B1 ──────────────────────────────────┐
                                               ├─▶ B2 ∥ B3 ∥ B4 ──┐
                                                                    ├─▶ B5 ∥ B6 ∥ B7
          Serial: B1 first (env + response contract)
          Parallel: B2 (auth) ∥ B3 (factory) ∥ B4 (hermes) — different dirs
          Parallel: B5 (ws) ∥ B6 (services) ∥ B7 (RLS) — different dirs, all need B2

PHASE C:  C1 ──▶ C2 ───────────────────────────┐
                                               ├─▶ C3 ∥ C4 ∥ C5 ∥ C6 ∥ C7 ∥ C8
          Serial: C1 (design system) → C2 (data layer + hooks)
          Parallel: C3–C8 (6 page groups) — each is its own feature dir under apps/web
          Max fan-out: 6 concurrent Execute sub-agents

PHASE D:  D1 ──────────────────────────────────┐
                                               ├─▶ D2 ∥ D3 ∥ D4
          Serial: D1 (Expo shell + theme + session)
          Parallel: D2 (chat) ∥ D3 (tabs) ∥ D4 (push) — separate tab dirs

PHASE E:  E1 ∥ E2 ∥ E3 ──────────────────────▶ E4
          Parallel: E1 (foundational docs) ∥ E2 (workflow docs) ∥ E3 (MCP pinned)
          Serial: E4 (cron) needs all three complete + B3 factory

PHASE F:  F1 ──────────────────────────────────┐
                                               ├─▶ F2 ∥ F3 ──▶ F4
          Serial: F1 (TLS/nginx) — infra foundation
          Parallel: F2 (backups) ∥ F3 (observability) — independent scripts/configs
          Serial: F4 (VPS deploy) — needs TLS + everything else
```

### 3.3 Sub-Agent Assignment Protocol

When fanning out Execute sub-agents:

1. **Orchestrator creates the feat/* branch** from the phase/* branch
2. **Orchestrator dispatches Execute** with:
   - Work package ID (e.g., A2)
   - Branch name (e.g., `feat/a-shared-types`)
   - Scope description from §5
   - Dependencies (what must be merged before this WP can start)
   - Audit IDs this package closes
   - Relevant Part sections to implement
   - Skills to load (e.g., `schema-first`, `frontend-craft`, `premium-ui`)
3. **Execute sub-agent works autonomously** on its branch
4. **Execute sub-agent self-certifies DoD** and opens PR into phase/*
5. **Orchestrator tracks completion** in the status tracker (§8)

### 3.4 Conflict Prevention

| Rule | Enforcement |
|------|-------------|
| No two sub-agents modify the same file | Orchestrator validates file scope overlap before dispatch |
| Shared types are read-only during fan-out | A2 must be complete and merged before any B/C/D package starts |
| Design tokens are read-only during fan-out | C1 must be complete and merged before any C3–C8 page starts |
| Factory is read-only during fan-out | B3 must be complete and merged before C2 or E4 starts |
| Config files (docker-compose, nginx) are owned by one WP | A3 owns compose; F1 owns nginx; no overlap |

---

## 4. Gate Enforcement

### 4.1 Phase Gate Checklist (Non-Skippable)

Every phase must pass **all three layers** before the `phase/* → develop` PR can merge:

```
LAYER 1: TEST (Execute owns)
  [ ] All unit tests pass (Vitest)
  [ ] All integration tests pass (supertest) — Phases B+
  [ ] Part 5 phase verification checklist — ALL items green
  [ ] tsc --noEmit clean (zero errors)
  [ ] Color-gate grep returns ZERO (Phase C+)
  [ ] Type-drift guard green (generated types match migrations)

LAYER 2: CODE REVIEW (Code Review agent owns)
  [ ] Every feat/* PR reviewed and approved
  [ ] Zero blockers remaining
  [ ] All DoD blocks signed by sub-agents
  [ ] No `any` in production paths
  [ ] No cross-boundary imports (P3)
  [ ] Factory pattern used for all CRUD (P2)
  [ ] Semantic tokens only, no hardcoded colors (P4)

LAYER 3: AUDIT (Auditor agent owns)
  [ ] DNA compliance score ≥ 8.5 / 10
  [ ] All audit IDs for this phase confirmed closed
  [ ] No new blockers introduced
  [ ] Hardening findings addressed or explicitly deferred
```

### 4.2 Score Enforcement

| Auditor Score | Action |
|--------------|--------|
| **≥ 9.0** | ✅ Immediate merge approval. Green light. |
| **8.5 – 8.9** | ✅ Merge approved. Note minor findings for next phase. |
| **8.0 – 8.4** | ⚠️ Required fixes. Auditor lists specific items. Execute fixes → re-audit. |
| **7.0 – 7.9** | ⚠️ Significant gaps. Tech Lead reviews. Re-plan affected packages. |
| **< 7.0** | 🛑 Phase rejected. Full re-planning required. Human notified. |

### 4.3 Type-Drift Guard (CI Enforcement)

The type-drift guard runs on **every PR** and **blocks merge regardless of auditor score:**

```bash
# CI step: regenerate types from latest migrations
supabase gen types typescript --local > packages/shared/src/types/database.types.ts
# Check for diff
git diff --exit-code packages/shared/src/types/database.types.ts
# If diff exists → FAIL (types drifted from migrations)
```

This is the P1/P6 enforcement mechanism. It cannot be overridden by any agent.

### 4.4 Zero-Blocker Enforcement

Code Review blockers are **binary**: any blocker = phase cannot advance. The Code Review agent:

1. Reviews every `feat/*` PR individually
2. Classifies findings as **blocker** or **suggestion**
3. Blockers must be resolved before the PR can merge into `phase/*`
4. Suggestions are noted but do not block
5. After all PRs merged, a final sweep confirms zero blockers in the integrated phase

---

## 5. Audit ID Tracking System

### 5.1 Audit ID Registry

| ID | Description | Closes In | Required By |
|----|-------------|-----------|-------------|
| **B1** | Dual source of truth for data model | A2 | Phase A gate |
| **B2** | Factory layer missing (P2 violation) | B3 (API) + C2 (client) | Phase B + C gates |
| **B3** | Invalid nginx rate-limit config | F1 | Phase F gate |
| **B4** | No TLS in compose topology | F1 | Phase F gate |
| **B5** | Auth model ambiguity | B2 | Phase B gate |
| **H1** | docker.sock mounted in app containers | A3 + B6 | Phase A + B gates |
| **H2** | MCP servers unpinned at runtime | E3 | Phase E gate |
| **H3** | Integration secrets no encryption mechanism | B6 | Phase B gate |
| **H4** | RLS uses correlated subquery (O(n)) | B7 | Phase B gate |
| **H5** | No backup/restore/migration versioning | F2 | Phase F gate |
| **H6** | No observability or error tracking | F3 | Phase F gate |
| **H7** | Missing healthchecks + resource limits | A3 | Phase A gate |
| **H8** | Single VPS = SPOF (documented trade-off) | F4 | Phase F gate |
| **C4** | MCP package names incorrect | E3 | Phase E gate |

### 5.2 Tracking Table (Updated After Each Phase Gate)

```
┌─────────┬──────────────────────────────┬────────────┬──────────┬─────────────┐
│ Audit ID│ Description                  │ Closed By  │ Phase    │ Status      │
├─────────┼──────────────────────────────┼────────────┼──────────┼─────────────┤
│ B1      │ Dual source of truth         │ A2         │ A        │ ⬜ OPEN     │
│ B2      │ Factory layer missing        │ B3 + C2    │ B + C    │ ⬜ OPEN     │
│ B3      │ nginx rate-limit config      │ F1         │ F        │ ⬜ OPEN     │
│ B4      │ No TLS                       │ F1         │ F        │ ⬜ OPEN     │
│ B5      │ Auth model ambiguity         │ B2         │ B        │ ⬜ OPEN     │
│ H1      │ docker.sock mounted          │ A3 + B6    │ A + B    │ ⬜ OPEN     │
│ H2      │ MCP unpinned                 │ E3         │ E        │ ⬜ OPEN     │
│ H3      │ No secret encryption         │ B6         │ B        │ ⬜ OPEN     │
│ H4      │ RLS correlated subquery      │ B7         │ B        │ ⬜ OPEN     │
│ H5      │ No backups                   │ F2         │ F        │ ⬜ OPEN     │
│ H6      │ No observability             │ F3         │ F        │ ⬜ OPEN     │
│ H7      │ No healthchecks              │ A3         │ A        │ ⬜ OPEN     │
│ H8      │ Single VPS SPOF              │ F4         │ F        │ ⬜ OPEN     │
│ C4      │ MCP package names wrong      │ E3         │ E        │ ⬜ OPEN     │
└─────────┴──────────────────────────────┴────────────┴──────────┴─────────────┘
```

### 5.3 Audit ID Closure Protocol

1. **Execute sub-agent** declares which audit IDs its work package closes in the PR body
2. **Code Review agent** verifies the claim: does the code actually fix the issue?
3. **Auditor agent** confirms closure during phase audit: inspects the implementation, marks ID as closed
4. **Orchestrator** updates the tracking table
5. **No audit ID is considered closed** until the Auditor confirms it — sub-agent self-declaration is necessary but not sufficient

### 5.4 Multi-Phase Audit IDs

Some audit IDs span multiple phases:

- **B2** (Factory): B3 closes the API side in Phase B; C2 closes the client side in Phase C. Both must be confirmed before B2 is fully closed.
- **H1** (docker.sock): A3 adds the socket-proxy to compose; B6 ensures the API uses it for container control. Both must be confirmed.

**Rule:** An audit ID is marked `PARTIAL` until all contributing work packages are complete and confirmed. Only the Auditor can mark it `CLOSED`.

---

## 6. Rollback Protocol

### 6.1 Phase-Level Rollback

If a phase gate fails (score < 8.5, blockers remain, or Part 5 checklist has red items):

```
STEP 1: PAUSE
  - Do NOT merge phase/* into develop
  - Do NOT begin the next phase
  - Notify human: "Phase X gate failed. Score: X.X. Initiating rollback analysis."

STEP 2: DIAGNOSE
  - Route to DEBUG for root cause analysis
  - Auditor provides specific failing items
  - Code Review identifies remaining blockers

STEP 3: FIX
  - Route to EXECUTE with fix scope
  - Fixes go on new feat/* branches off the phase/* branch
  - Standard PR → Code Review → merge into phase/*

STEP 4: RE-AUDIT
  - Route to AUDITOR for re-scoring
  - Same gate criteria apply (≥ 8.5, 0 blockers, green checklist)
  - If passes → proceed to next phase
  - If fails again → escalate to TECH LEAD for architectural review

STEP 5: ESCALATE (if 3 consecutive failures)
  - Tech Lead reviews the phase architecture
  - Human approval required to continue
  - May require re-planning (route back to PLAN)
```

### 6.2 Work Package-Level Rollback

If a single `feat/*` PR fails Code Review:

```
STEP 1: Code Review agent provides specific blocker list
STEP 2: Execute sub-agent fixes on the same feat/* branch
STEP 3: Re-review (Code Review agent)
STEP 4: If 3 re-reviews fail → escalate to Tech Lead
```

### 6.3 Integration Rollback

If merging `feat/*` into `phase/*` causes conflicts or breaks the phase:

```
STEP 1: Revert the merge commit on phase/*
STEP 2: Route to DEBUG to diagnose the conflict
STEP 3: Execute sub-agent rebases feat/* onto latest phase/*
STEP 4: Re-merge after fix
```

### 6.4 Nuclear Rollback (Phase Abandonment)

If a phase is fundamentally flawed and cannot reach 8.5 after architectural review:

```
STEP 1: Human decision required — abandon or re-architect?
STEP 2: If re-architect:
  - Delete phase/* branch
  - Route to PLAN with "re-plan phase X" + Auditor's findings
  - New plan requires human approval
  - Restart phase from scratch
STEP 3: If abandon:
  - Document why in the phase plan
  - Assess impact on dependent phases
  - Human decides: continue with reduced scope or halt release
```

### 6.5 Git Rollback Commands

```bash
# Revert a phase merge on develop
git revert -m 1 <merge-commit-hash>

# Reset a phase branch to before a bad merge
git checkout phase/x-name
git reset --hard <last-good-commit>
git push --force-with-lease origin phase/x-name

# Nuclear: delete phase branch and restart
git branch -D phase/x-name
git push origin --delete phase/x-name
git checkout -b phase/x-name origin/develop
```

**Safety:** Force-push is NEVER allowed on `main` or `develop`. Phase branches may be force-pushed only by the Orchestrator after human approval.

---

## 7. Human Approval Checkpoints

### 7.1 Mandatory Human Approval Points

| Checkpoint | When | What Human Reviews | Approval Method |
|-----------|------|-------------------|----------------|
| **Phase Plan Approval** | Before each phase begins | Plan document scope, work packages, audit IDs, timeline | Explicit "approved" or feedback |
| **Phase Gate Sign-off** | After Auditor passes a phase | Score report, Part 5 checklist, audit ID status | Explicit "merge approved" |
| **Rollback Decision** | After 2 consecutive gate failures | Root cause analysis, Tech Lead recommendation | Decision: fix / re-plan / abandon |
| **Release Sign-off** | After Phase F gate passes | Full release DoD checklist, all audit IDs closed | Explicit "tag v1.5.0" |
| **Scope Change** | Any deviation from the plan | What changed, why, impact on timeline/audit IDs | Explicit approval of deviation |

### 7.2 Approval Flow

```
Orchestrator produces deliverable (plan doc / score report / rollback analysis)
  │
  ▼
Orchestrator presents to human with clear summary:
  - What was produced
  - What it means (pass/fail, score, blockers)
  - What the next step is
  - What decision is needed
  │
  ▼
Human responds:
  ├─ "Approved" / "LGTM" / "Proceed" → Orchestrator advances to next step
  ├─ "Fix X, Y, Z" → Orchestrator routes to appropriate agent with fix scope
  └─ "Reconsider" / Questions → Orchestrator provides context, waits for decision
```

### 7.3 Non-Blocking vs Blocking Approvals

| Type | Blocks Pipeline? | Examples |
|------|-----------------|----------|
| **Blocking** | Yes — pipeline halts until approved | Phase plan, phase gate, release tag, rollback decision |
| **Non-blocking** | No — agents continue, human informed | Status updates, minor findings, audit ID partial closures |

---

## 8. Communication Flow & Status Reporting

### 8.1 Phase Gate Report Template

After each phase gate, the Orchestrator presents:

```markdown
## Phase [X] Gate Report

**Status:** ✅ PASSED / ❌ FAILED / ⚠️ CONDITIONAL
**Auditor Score:** X.X / 10
**Code Review Blockers:** 0
**Part 5 Checklist:** [X/Y items green]

### Work Packages Completed
| WP | Branch | Sub-agent | Status | Audit IDs Closed |
|----|--------|-----------|--------|-----------------|
| X1 | feat/x-name | Execute-X1 | ✅ Merged | — |
| X2 | feat/x-name | Execute-X2 | ✅ Merged | B1 |

### Audit IDs
| ID | Status | Evidence |
|----|--------|----------|
| B1 | ✅ CLOSED | supabase gen types produces database.types.ts from migrations |
| H1 | ⏳ PARTIAL | Socket-proxy in compose (A3); API integration pending (B6) |

### Findings (if any)
- [Finding 1]: [description] → [action taken]
- [Finding 2]: [description] → [deferred to Phase Y]

### Next Phase
**Phase [Y] ready to begin.** [Tech Lead consult needed: yes/no]
**Human approval required:** [yes/no]
```

### 8.2 Status Tracker (Maintained by Orchestrator)

```markdown
## JARVIS v1.5 — Build Status

| Phase | Plan | Execute | Code Review | Auditor | Score | Merged |
|-------|------|---------|-------------|---------|-------|--------|
| A — Foundation | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| B — API+Bridge | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| C — Web | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| D — Mobile | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| E — Skills | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| F — Deploy | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |

Legend: ⬜ pending | 🔄 in-progress | ✅ done | ❌ failed

### Audit ID Closure
[See §5.2 tracking table — updated after each phase gate]

### Active Work Packages
| WP | Branch | Sub-agent | Status | Dependencies Met |
|----|--------|-----------|--------|-----------------|
| — | — | — | — | — |
```

### 8.3 Escalation Communication

| Severity | Communication | Who Gets Notified |
|----------|--------------|-------------------|
| **Info** | Status update in tracker | Human (non-blocking) |
| **Warning** | Gate approaching, minor findings | Human (non-blocking) |
| **Blocker** | PR blocked, fix needed | Human + Execute sub-agent |
| **Critical** | Phase gate failed | Human (blocking) — requires decision |
| **Emergency** | 3+ consecutive failures, architectural issue | Human + Tech Lead — requires strategy session |

---

## 9. Skills Loading Protocol

### 9.1 Per-Agent Skill Matrix

| Agent | Always Loaded | Conditionally Loaded |
|-------|--------------|---------------------|
| **Orchestrator** | `architectural-dna`, `git-flow` | — |
| **Plan** | `architectural-dna` | `schema-first` (any entity work), `security-patterns` (auth/secrets) |
| **Execute** | `architectural-dna` | `schema-first` (types/migrations), `frontend-craft` (UI work), `premium-ui` (any visual), `security-patterns` (auth/secrets), `testing-standards` (test writing) |
| **Code Review** | `architectural-dna` | All skills loaded for comprehensive review |
| **Auditor** | `architectural-dna`, `ui-auditor` | `security-patterns` (auth review), `testing-standards` (test review) |
| **Tech Lead** | `architectural-dna` | All skills as needed for cross-cutting decisions |
| **Debug** | `architectural-dna` | Domain-specific skills based on the failure |

### 9.2 Per-Phase Skill Requirements

| Phase | Mandatory Skills for Execute |
|-------|------------------------------|
| A | `schema-first` (A2), `testing-standards` (A4) |
| B | `schema-first` (B1, B7), `security-patterns` (B2, B6), `testing-standards` |
| C | `frontend-craft` (all), `premium-ui` (all), `testing-standards` |
| D | `frontend-craft` (all), `premium-ui` (all) |
| E | `architectural-dna` only (doc-heavy phase) |
| F | `security-patterns` (F1), `testing-standards` (F4) |

---

## 10. Execution Kickoff Protocol

### 10.1 How to Begin

When the human signals "commence JARVIS v1.5" (per §0 of the handoff doc):

```
STEP 1: Orchestrator loads architectural-dna + git-flow skills
STEP 2: Orchestrator initializes the status tracker (§8.2)
STEP 3: Orchestrator initializes the audit ID tracking table (§5.2)
STEP 4: Orchestrator verifies develop branch exists and is clean
STEP 5: Orchestrator creates phase/a-foundation branch from develop
STEP 6: Orchestrator routes to PLAN with Phase A scope
STEP 7: Plan agent produces Phase A plan document
STEP 8: Orchestrator presents plan to human for approval
STEP 9: Human approves → Orchestrator begins Execute fan-out
```

### 10.2 Pre-Flight Checklist

Before any code is written:

```
[ ] develop branch exists and is up to date
[ ] All source-of-truth docs (PART1-5, ARCHITECTURE-AUDIT) are present
[ ] Orchestrator coordination plan (this doc) is loaded
[ ] Status tracker initialized
[ ] Audit ID tracker initialized
[ ] Phase A branch created from develop
[ ] Phase A plan approved by human
[ ] Tech Lead consulted on Turborepo + socket-proxy topology (Phase A flagged)
```

---

## 11. Quick Reference Card

### The Cardinal Rules (from AGENTS.md + Handoff)

1. **Plan before code** — no Execute sub-agent writes code before phase plan is approved
2. **Generated types, not hand-written** — `supabase gen types` is the only source
3. **No `any`** — TypeScript strict mode everywhere, Zod at boundaries
4. **Semantic tokens only** — OKLCH, no hardcoded colors
5. **Factory CRUD only** — no bespoke fetch/create/update/delete
6. **No cross-boundary imports** — P3 modularization enforced
7. **Zod at boundaries** — every API input/output validated
8. **Never merge below 8.5** — auditor floor is non-negotiable
9. **Premium UI is the baseline** — not a phase, not optional
10. **Never push to main directly** — tagged releases only

### Agent Routing Cheat Sheet

```
"Plan phase X"          → PLAN (with TECH LEAD consult if flagged)
"Approved, execute"     → EXECUTE (fan-out per dependency graph)
"PR ready for review"   → CODE REVIEW
"All packages merged"   → AUDITOR (after Part 5 checklist passes)
"Something's broken"    → DEBUG
"Should we use X?"      → TECH LEAD
"Audit the codebase"    → AUDITOR
```

### Gate Criteria (Memorize)

```
Phase Gate = Part 5 checklist ALL green
           + Code Review 0 blockers
           + Auditor ≥ 8.5 / 10
           + Type-drift guard green
           + All audit IDs for the phase confirmed closed
           + Human sign-off
```

---

*Orchestrator Coordination Plan — JARVIS v1.5 — © 2026 Kidus Abdula / VersaLabs Studio*
*This document is the Orchestrator's source of truth for coordinating the v1.5 build.*
