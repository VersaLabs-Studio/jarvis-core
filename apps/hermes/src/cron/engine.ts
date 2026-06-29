// =============================================================================
// Cron engine (Phase E §9 — E4).
//
// BullMQ-based cron engine. Lazy-init: if REDIS_URL is not set, the engine
// is a no-op (chat still works; cron is the casualty). Per the existing
// plan §9.1 + the Orchestrator's ratification in PHASE-E-PLAN-REMAINDER.md.
//
// C2 closure (the critical correctness fix): when the engine fires a
// skill-based job, it does NOT mark the workflow_runs row "success" on
// the 202 `{run_id}` from POST /v1/skill/run. It subscribes to the Hermes
// WS endpoint and awaits the real `skill:result` or `skill:error` message
// for that run_id before writing the terminal status. This is the
// difference between "the skill started" and "the skill finished";
// marking success on the 202 was the §3-prelude bug.
//
// Workflow_runs writes go through the API factory over HTTP loopback
// (P2 — factory over bespoke; P6 — no direct Supabase access in Hermes).
// =============================================================================

import { Queue, Worker, type Job } from "bullmq";
import type { CronJob } from "@jarvis/shared";
import { getEnv } from "../config/env.js";
import { log } from "../lib/logger.js";
import { CRON_REGISTRY } from "./registry.js";
import { invokeSkillViaApi, type SkillCompletion } from "./skill-runner.js";
import { sendMessage } from "../telegram/bot.js";
import { parseAllowList } from "../telegram/poller.js";

const CRON_QUEUE_NAME = "jarvis-cron";
const SKILL_RUN_TIMEOUT_MS = 5 * 60_000; // 5 min cap on a single skill run
const WORKFLOW_RUN_API_TIMEOUT_MS = 10_000;

/** Shape of a finished skill run. Discriminated union so the caller handles each case. */
export type { SkillCompletion };

export class CronEngine {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private initialized = false;
  private disabledReason: string | null = null;

  /** Initialize the engine. Idempotent; safe to call from server.ts on boot. */
  async init(): Promise<void> {
    if (this.initialized) return;
    const env = getEnv();
    if (!env.REDIS_URL) {
      this.disabledReason = "REDIS_URL not set; cron DISABLED. Chat still works.";
      log.warn(this.disabledReason);
      return;
    }
    try {
      this.queue = new Queue(CRON_QUEUE_NAME, { connection: { url: env.REDIS_URL } });
      this.worker = new Worker(CRON_QUEUE_NAME, async (job) => this.runJob(job), {
        connection: { url: env.REDIS_URL },
      });
      await this.scheduleAll();
      this.initialized = true;
      log.info({ jobCount: Object.keys(CRON_REGISTRY).length }, "Cron engine started");
    } catch (err) {
      this.disabledReason = `Failed to connect to Redis: ${err instanceof Error ? err.message : String(err)}`;
      log.error({ err: this.disabledReason }, "Cron engine disabled");
      if (this.queue) {
        await this.queue.close().catch(() => {});
        this.queue = null;
      }
      if (this.worker) {
        await this.worker.close().catch(() => {});
        this.worker = null;
      }
    }
  }

  /** Graceful shutdown. Called from server.ts on SIGTERM/SIGINT. */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => {});
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close().catch(() => {});
      this.queue = null;
    }
    this.initialized = false;
  }

  isDisabled(): boolean {
    return this.disabledReason !== null;
  }

  getDisabledReason(): string | null {
    return this.disabledReason;
  }

  private async scheduleAll(): Promise<void> {
    if (!this.queue) return;
    for (const [id, job] of Object.entries(CRON_REGISTRY)) {
      if (!job.enabled) continue;
      if (job.schedule === "@boot") {
        await this.queue.add(id, job, { attempts: 1 });
      } else {
        await this.queue.add(id, job, {
          repeat: { pattern: job.schedule },
          attempts: 3,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        });
      }
    }
  }

  /**
   * Worker callback. Called by BullMQ when a job fires. Routes the job:
   *   - model-boot-check (built-in) → runModelBootCheck()
   *   - skill-based jobs           → create workflow_runs row, invoke via API,
   *                                  await WS completion, update row
   */
  private async runJob(job: Job<CronJob>): Promise<void> {
    const cronJob = job.data;
    log.info({ jobId: job.id, cronJobId: cronJob.id, schedule: cronJob.schedule }, "Cron job firing");

    if (cronJob.id === "model-boot-check") {
      await this.runModelBootCheck();
      return;
    }

    if (!cronJob.skill) {
      log.warn({ cronJobId: cronJob.id }, "Cron job has no skill and no built-in handler; skipping");
      return;
    }

    // Skill-based job: create the workflow_runs row, invoke the skill via API,
    // await the real WS completion, then update the row.
    const env = getEnv();
    const runId = await this.createWorkflowRun(cronJob);
    if (!runId) {
      log.error({ cronJobId: cronJob.id }, "Failed to create workflow_runs row; skipping skill run");
      return;
    }

    let completion: SkillCompletion;
    try {
      // C2 binding: do NOT mark "success" on the 202; await the real
      // WS skill:result / skill:error for this run_id.
      completion = await invokeSkillViaApi({
        baseUrl: `http://localhost:${env.PORT}`,
        wsUrl: `ws://localhost:${env.PORT}/ws`,
        skill: cronJob.skill,
        args: cronJob.args,
        runId,
        timeoutMs: SKILL_RUN_TIMEOUT_MS,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error({ err: errorMessage, cronJobId: cronJob.id, runId }, "Skill invocation threw");
      await this.completeWorkflowRun(runId, "failed", { error: errorMessage });
      return;
    }

    if (completion.kind === "result") {
      await this.completeWorkflowRun(runId, "success", { output: completion.output });
      if (cronJob.notify.includes("telegram")) {
        await this.notifyTelegram(cronJob, completion);
      }
    } else {
      await this.completeWorkflowRun(runId, "failed", { error: completion.error });
      if (cronJob.notify.includes("telegram")) {
        await this.notifyTelegram(cronJob, { kind: "error", runId, error: completion.error });
      }
    }
  }

  /**
   * Built-in: model-boot-check. The boot-check at server.ts already runs
   * once at process start; the cron version is a no-op for v1.5. A future
   * enhancement: schedule it for `@every 5m` to catch model flapping.
   */
  private async runModelBootCheck(): Promise<void> {
    log.info("Cron model-boot-check fired (no-op; server.ts runBootCheck covers it)");
  }

  /**
   * Create a workflow_runs row via the API factory (over HTTP loopback).
   * P2 — factory over bespoke; P6 — no direct Supabase access in Hermes.
   * Returns the row id; null on failure (caller skips the run).
   */
  private async createWorkflowRun(cronJob: CronJob): Promise<string | null> {
    const env = getEnv();
    const apiUrl = env.API_URL ?? "http://api:3000";
    const token = env.HERMES_SERVICE_TOKEN ?? "";
    if (!token) {
      log.warn("HERMES_SERVICE_TOKEN not set; cannot create workflow_runs row");
      return null;
    }
    try {
      const response = await fetch(`${apiUrl}/api/cms/workflow_runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Service-Token": token },
        body: JSON.stringify({
          trigger: "cron",
          skill_name: cronJob.skill,
          status: "running",
          args: cronJob.args,
          started_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(WORKFLOW_RUN_API_TIMEOUT_MS),
      });
      if (!response.ok) {
        log.error({ status: response.status, cronJobId: cronJob.id }, "createWorkflowRun failed");
        return null;
      }
      const json = (await response.json()) as { ok: true; data: { id: string } };
      return json.data.id;
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err) }, "createWorkflowRun threw");
      return null;
    }
  }

  /**
   * Update the workflow_runs row to terminal status (success | failed).
   * Same API-factory-via-HTTP-loopback pattern as createWorkflowRun.
   */
  private async completeWorkflowRun(
    runId: string,
    status: "success" | "failed",
    payload: { output?: unknown; error?: string },
  ): Promise<void> {
    const env = getEnv();
    const apiUrl = env.API_URL ?? "http://api:3000";
    const token = env.HERMES_SERVICE_TOKEN ?? "";
    if (!token) {
      log.warn({ runId }, "HERMES_SERVICE_TOKEN not set; cannot update workflow_runs row");
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/cms/workflow_runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Service-Token": token },
        body: JSON.stringify({
          status,
          output: payload.output ?? null,
          error: payload.error ?? null,
          completed_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(WORKFLOW_RUN_API_TIMEOUT_MS),
      });
      if (!response.ok) {
        log.error({ runId, status, code: response.status }, "completeWorkflowRun failed");
      }
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err), runId, status }, "completeWorkflowRun threw");
    }
  }

  /**
   * Telegram notification — F: structured log + system_logs audit row via the
   * API factory, PLUS real bot.sendMessage to each allow-list chat id.
   * Non-fatal on failure (current try/catch stays).
   */
  private async notifyTelegram(cronJob: CronJob, completion: SkillCompletion): Promise<void> {
    const env = getEnv();
    const apiUrl = env.API_URL ?? "http://api:3000";
    const token = env.HERMES_SERVICE_TOKEN ?? "";
    const message = completion.kind === "result"
      ? `Cron ${cronJob.id} succeeded: ${typeof completion.output === "string" ? completion.output.slice(0, 280) : JSON.stringify(completion.output).slice(0, 280)}`
      : `Cron ${cronJob.id} failed: ${completion.error}`;

    // 1. System_logs audit row (existing; drop the "F wires real bot" wording)
    if (token) {
      try {
        await fetch(`${apiUrl}/api/cms/system_logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Service-Token": token },
          body: JSON.stringify({
            level: completion.kind === "result" ? "info" : "error",
            source: `cron/${cronJob.id}`,
            message: `TELEGRAM_NOTIFY: ${message}`,
            payload: { cronJobId: cronJob.id, ...(completion.kind === "result" ? { output: completion.output } : { error: completion.error }) },
          }),
          signal: AbortSignal.timeout(WORKFLOW_RUN_API_TIMEOUT_MS),
        });
      } catch (err) {
        log.warn({ err: err instanceof Error ? err.message : String(err), cronJobId: cronJob.id }, "notifyTelegram system_logs threw (non-fatal)");
      }
    }

    // 2. Real Telegram message to each allow-list chat id
    const allowList = parseAllowList(env.TELEGRAM_ALLOW_FROM);
    if (allowList.size === 0) {
      log.info({ cronJobId: cronJob.id }, "notifyTelegram: no allow-list; skipping bot message");
      return;
    }
    for (const chatId of allowList) {
      const sent = await sendMessage(chatId, message);
      if (!sent) {
        log.warn({ chatId, cronJobId: cronJob.id }, "notifyTelegram: bot.sendMessage failed (non-fatal)");
      }
    }
  }
}

