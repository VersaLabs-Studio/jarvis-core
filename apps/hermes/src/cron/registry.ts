// =============================================================================
// Cron registry (Phase E §9 — E4).
//
// The 3 cron jobs in v1.5:
//   - morning-audit   — 8 AM daily (user's TZ; defaults to America/New_York)
//   - weekly-review  — Mon 9 AM (research-and-report skill with weekly topic)
//   - model-boot-check — @boot (once at Hermes start; C5 close)
//
// Each entry is validated against the @jarvis/shared `cronJobSchema` (in
// packages/shared/src/schemas/cron.schema.ts). Adding a new job: add an entry
// below; the engine picks it up at boot.
// =============================================================================

import type { CronRegistry } from "@jarvis/shared";

export const CRON_REGISTRY: CronRegistry = {
  "morning-audit": {
    id: "morning-audit",
    name: "Morning Audit",
    schedule: "0 8 * * *", // 8:00 AM every day
    skill: "morning-audit",
    args: {},
    notify: ["api", "telegram"],
    enabled: true,
    preferred_model_role: "office",
  },
  "weekly-review": {
    id: "weekly-review",
    name: "Weekly Review",
    schedule: "0 9 * * 1", // 9:00 AM every Monday
    skill: "research-and-report",
    args: { topic: "Weekly progress review" },
    notify: ["api"],
    enabled: true,
    preferred_model_role: "planning",
  },
  "model-boot-check": {
    id: "model-boot-check",
    name: "Model Boot Check",
    schedule: "@boot", // once at Hermes start (C5 closure in the cron surface)
    skill: null, // built-in; not a skill doc
    args: {},
    notify: [],
    enabled: true,
  },
};

/** Ordered list (preserves CRON_REGISTRY's declared order) for the GET /v1/cron route. */
export const CRON_JOB_IDS: ReadonlyArray<string> = Object.keys(CRON_REGISTRY);
