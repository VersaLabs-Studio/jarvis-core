---
name: tech-lead-review
description: Strategic technical decisions, library evaluation, trade-off analysis. The Tech Lead produces a written recommendation with at least 2 options, the trade-off matrix, the recommended pick, and the rollback path. Used when the planner flags a Tech Lead consult.
trigger:
  - "evaluate this library"
  - "should we use X or Y"
  - "trade-off analysis"
  - "tech lead consult"
tools_required: []
category: foundational
estimated_time: "10-20 minutes"
always_loaded: false
preferred_model_role: planning
---

# Tech Lead Review

## Purpose

Encode the discipline of **strategic technical decisions**. The Tech Lead (the planner agent, or the architect) is consulted when a decision is cross-cutting (touches multiple WPs), irreversible (changing the decision later is expensive), or risky (the wrong pick costs a re-architecture). The Tech Lead's output is a written recommendation that the executor follows verbatim — not a sketch, not a vibe, but a concrete pick with the trade-off matrix and the rollback path.

The Tech Lead is **not** the executor. The Tech Lead is the consultant; the executor implements the recommendation. The Tech Lead is also not the auditor; the auditor scores the implementation against the DNA. The Tech Lead is the **decision-maker** for the "should we use X or Y" question.

## Prerequisites

- The question framed as a **decision**, not a "what do you think" — the Tech Lead produces a pick, not a discussion
- At least 2 viable options (if there's only 1, no decision is needed)
- The relevant context: scale, team familiarity, timeline, budget, existing code
- The DNA Pillars loaded (P1-P6) for the standards the decision must honor

## Steps

### Step 1: Frame the decision

The Tech Lead's report starts with the **decision being made** in one paragraph. The format is:

> "The decision: when X happens, do we do Y, or do we do Z?"

Example: "When the OpenRouter primary model returns a 404, do we (A) auto-swap the first working fallback into the primary slot, or (B) keep retrying the primary with a corrected slug, or (C) fail the request and return CHAIN_EXHAUSTED to the client?"

The decision statement is **specific** (not "how should we handle model failures?") and **answerable** (there's a concrete pick, not a "we'll see").

### Step 2: List the options

At least 2 options, ideally 3. Each option is one paragraph:

- **What it is** — the concrete behavior or component
- **What it costs** — code complexity, runtime overhead, operational burden
- **What it gains** — correctness, simplicity, performance, observability

Avoid "magic" options ("we could use a sophisticated ensemble with Bayesian optimization") — the executor can't implement magic. The options must be **specific enough to be coded**.

### Step 3: Build the trade-off matrix

A table with the options as rows and the criteria as columns. The criteria are at minimum:

| Criterion | What it measures |
|---|---|
| **Correctness** | Does the option produce the right answer in the documented cases? |
| **Simplicity** | How much code / config does it add? |
| **Observability** | How easy is it to debug when something goes wrong? |
| **Reversibility** | How easy is it to switch to a different option later? |
| **DNA Pillars satisfied** | Which of P1-P6 does it honor? (P1 always; P2 if it's CRUD; P3 if it adds a feature; P4 if it's UI; P5 always; P6 always.) |

Score each option 0-3 on each criterion:

- **0** — fails the criterion (e.g. observability is zero — no logs)
- **1** — partial (logs are at INFO only; not at DEBUG for triage)
- **2** — solid (logs at INFO + structured for grep)
- **3** — exceeds (logs at INFO + structured + includes a correlation ID)

The total is the option's score. The option with the highest total is the recommendation — but the Tech Lead also has to defend the pick in prose. A trade-off matrix alone is not a recommendation.

### Step 4: Recommend + justify

The recommended option is the highest-scored, with a paragraph explaining **why**. The paragraph addresses:

- The decisive trade-off (the one criterion that tipped the balance)
- The DNA Pillars that are better served by this option
- The risk if the recommendation is wrong
- The blast radius (what's affected if we have to change later)

The recommendation is **a pick**, not a "let's go with option A but keep option B in mind." The executor needs a pick.

### Step 5: Specify the implementation

The Tech Lead's report includes a **code sketch** for the recommended option. The sketch is not pseudocode; it's the actual TS (or SQL, or YAML) the executor will write. The sketch is short (10-30 lines); long sketches are a sign the decision isn't fully resolved.

The sketch goes in the report's "Resolved design" section. The executor copies it (with type annotations and proper imports) into the actual file.

### Step 6: Specify the rollback path

A decision is reversible if the **rollback path is documented**. The path is:

- **What change reverts the decision?** (e.g. "revert the env var; delete the new file; the previous behavior takes over")
- **What's the migration cost?** (e.g. "no DB migration; pure code change")
- **What data is at risk?** (e.g. "in-flight requests may fail mid-rollback; no data loss")

A decision without a rollback path is a one-way door. The Tech Lead should flag it; the architect should approve or override.

### Step 7: Identify the open questions

The report ends with a numbered list of **open questions** — things that are still pending, with a default for each. The executor uses the default unless the architect overrides.

A Tech Lead review that doesn't have open questions (with defaults) is a sketch, not a decision. The defaults are what the executor uses; the open questions are what the architect ratifies or overrides.

## Output

A Tech Lead consult report is a section in the plan doc (e.g. "§2: Tech Lead Consult (1) — Model Routing + Fallback Chain"). The report:

- Is **specific** (concrete options, not "various approaches")
- **Scores** the options (a trade-off matrix, not a vibe)
- **Recommends** with justification (a pick, not a "we'll figure it out")
- **Sketches the code** (10-30 lines, copy-paste-able)
- **Documents the rollback** (what change reverts the decision)
- **Lists open questions** (with defaults)

The plan-agent integrates the report into the plan doc; the orchestrator routes the plan doc to the architect; the architect signs.

## Error Handling

- **The question is too broad ("how should we architect the system?")** — narrow the question. The Tech Lead's job is to answer a specific decision, not design the system. If the question is too broad, route to the planner for a sub-plan.
- **The recommended option's score is only marginally higher than the runner-up** — that's a sign the decision is reversible. Document the rollback path prominently; the architect may want to take the lower-risk option.
- **The code sketch can't be written** — the decision isn't ready. The Tech Lead is reaching; the question needs more research. Re-route to the planner.
- **The open questions have no sensible defaults** — the decision is blocked on more information. The Tech Lead's report should explicitly call this out and halt; the architect is the one who unblocks (either by answering the questions or by deferring the decision).
- **The architect overrides the recommendation** — the architect's override is final. The Tech Lead's report is the input; the architect's signature is the decision.

## Quality Checks

Before submitting the report, the Tech Lead checks:

```bash
# 1. The decision is framed in one sentence
grep -E "^[Dd]ecision: " docs/PHASE-*-PLAN.md | head -3
# Expected: at least 1 match

# 2. At least 2 options are listed
grep -E "^- \*\*Option [A-Z]\*\*" docs/PHASE-*-PLAN.md | wc -l
# Expected: 2+

# 3. The trade-off matrix scores each option
grep -E "^\| \*\*(Correctness|Simplicity|Observability|Reversibility|DNA)" docs/PHASE-*-PLAN.md
# Expected: 1+ matches

# 4. The recommended option is named (not "we'll go with X")
grep -E "^\*\*Recommendation:\*\*" docs/PHASE-*-PLAN.md
# Expected: 1 match

# 5. The code sketch is short (10-30 lines)
grep -A 30 "Resolved design" docs/PHASE-*-PLAN.md | wc -l
# Expected: < 50 (the sketch is one block; if it's longer, the decision is too big)

# 6. The rollback path is documented
grep -E "^\*\*Rollback" docs/PHASE-*-PLAN.md
# Expected: 1 match

# 7. The open questions have defaults
grep -E "^\*\*Default" docs/PHASE-*-PLAN.md
# Expected: 1+ matches
```

A Tech Lead report that doesn't pass all seven is a sketch, not a decision. The plan-agent returns it; the architect is not asked to sign.
