// =============================================================================
// Docker control via socket-proxy (Phase E §3 — H1).
//
// Hermes reaches Docker ONLY through `docker-socket-proxy` (set in
// `DOCKER_HOST`). The proxy is configured (compose env) with
// CONTAINERS=1 + POST=1 + INFO=1, and EXEC=0 / IMAGES=0 / VOLUMES=0 /
// NETWORKS=0 / BUILD=0 / TASKS=0 / SERVICES=0. This module wraps the
// allowed calls; it does NOT expose any other Docker Engine surface.
//
// Hardened call list (Part 4 §4.5 + Plan §3.2):
//  - list()       — GET /containers/json
//  - inspect(name) — GET /containers/{name}/json
//  - start(name)  — POST /containers/{name}/start
//  - stop(name)   — POST /containers/{name}/stop
//  - restart(name) — POST /containers/{name}/restart
//  - stats(name)  — GET /containers/{name}/stats?stream=false
//  - logs(name, tail) — GET /containers/{name}/logs?stdout=1&stderr=1&tail=N
//
// Anything not in this list is rejected at the module level.
//
// #11 FIX (Phase F Stage-2): boot-time probe-or-latch removed. The socket-proxy
// DNS may not resolve at boot even though it's healthy moments later. Instead,
// the connection is established lazily on the FIRST actual docker-control USE,
// and cached on success. If the proxy is genuinely down at call time, the call
// degrades gracefully (log + throw) without permanently latching docker-control
// OFF. A subsequent call will retry.
// =============================================================================

import { getEnv } from "../config/env.js";
import { log } from "./logger.js";

let _baseUrl: string | null = null;
let _connected = false;

export async function initDockerControl(): Promise<void> {
  const env = getEnv();
  if (!env.DOCKER_HOST) {
    log.warn("DOCKER_HOST not set; docker-control is disabled (services/* will not work)");
    _connected = false;
    return;
  }
  if (!env.DOCKER_HOST.startsWith("tcp://")) {
    log.error(
      { DOCKER_HOST: env.DOCKER_HOST },
      "DOCKER_HOST must be a tcp:// URL pointing at the socket-proxy. Refusing to start (H1 — no raw socket allowed).",
    );
    process.exit(1);
  }
  _baseUrl = env.DOCKER_HOST.replace(/\/+$/, "");
  // #11 FIX: No boot-time probe. Connection is established lazily on first use.
  // This avoids false negatives when DNS/networking isn't warm at boot.
  log.info({ url: _baseUrl }, "Docker control configured (lazy-connect; probe deferred to first use)");
}

export function isDockerControlEnabled(): boolean {
  return _connected;
}

interface DockerContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
  Created: number;
}

// ---------------------------------------------------------------------------
// Lazy-connect: establish on first use, cache on success, retry on failure.
// Non-fatal: if the proxy is genuinely down at call time, log + throw. The
// next call will retry (no permanent latch).
// ---------------------------------------------------------------------------
async function ensureConnected(): Promise<void> {
  if (_connected) return;
  if (!_baseUrl) {
    throw new Error("docker-control not configured (DOCKER_HOST unset)");
  }

  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${_baseUrl}/_ping`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) {
        log.warn({ status: response.status, attempt }, "Socket-proxy ping non-2xx");
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
          continue;
        }
        throw new Error(`Socket-proxy ping returned ${response.status} after ${MAX_ATTEMPTS} attempts`);
      }
      _connected = true;
      log.info({ url: _baseUrl, attempt }, "Docker control connected to socket-proxy");
      return;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * attempt;
        log.info({ attempt, maxAttempts: MAX_ATTEMPTS, delayMs: delay }, "Socket-proxy probe failed; retrying…");
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      // Non-fatal: log + throw (caller handles). Next call will retry.
      log.warn({ err: msg, attempts: MAX_ATTEMPTS }, "Socket-proxy unreachable; docker-control degraded");
      throw new Error(`docker-control not available: ${msg}`);
    }
  }
}

export async function list(): Promise<DockerContainer[]> {
  await ensureConnected();
  const response = await fetch(`${_baseUrl}/containers/json?all=1`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`docker list failed: ${response.status}`);
  return (await response.json()) as DockerContainer[];
}

export async function inspect(name: string): Promise<unknown> {
  await ensureConnected();
  assertSafeName(name);
  const response = await fetch(`${_baseUrl}/containers/${encodeURIComponent(name)}/json`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`docker inspect ${name} failed: ${response.status}`);
  return response.json();
}

export async function start(name: string): Promise<void> {
  await ensureConnected();
  assertSafeName(name);
  await postAction(name, "start");
}

export async function stop(name: string): Promise<void> {
  await ensureConnected();
  assertSafeName(name);
  await postAction(name, "stop");
}

export async function restart(name: string): Promise<void> {
  await ensureConnected();
  assertSafeName(name);
  await postAction(name, "restart");
}

export interface ContainerStats {
  name: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
}

export async function stats(name: string): Promise<ContainerStats> {
  await ensureConnected();
  assertSafeName(name);
  const response = await fetch(`${_baseUrl}/containers/${encodeURIComponent(name)}/stats?stream=false`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`docker stats ${name} failed: ${response.status}`);
  const raw = (await response.json()) as {
    cpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number };
    memory_stats?: { usage?: number; limit?: number };
  };
  const cpuDelta = (raw.cpu_stats?.cpu_usage?.total_usage ?? 0) - 0; // single sample → approx
  const sysDelta = (raw.cpu_stats?.system_cpu_usage ?? 0) - 0;
  const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * 100 : 0;
  return {
    name,
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memUsage: raw.memory_stats?.usage ?? 0,
    memLimit: raw.memory_stats?.limit ?? 0,
  };
}

export async function logs(name: string, tail = 100): Promise<string> {
  await ensureConnected();
  assertSafeName(name);
  const response = await fetch(
    `${_baseUrl}/containers/${encodeURIComponent(name)}/logs?stdout=1&stderr=1&tail=${tail}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`docker logs ${name} failed: ${response.status}`);
  return response.text();
}

async function postAction(name: string, action: "start" | "stop" | "restart"): Promise<void> {
  const response = await fetch(`${_baseUrl}/containers/${encodeURIComponent(name)}/${action}`, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    throw new Error(`docker ${action} ${name} failed: ${response.status} ${text.slice(0, 200)}`);
  }
}

/**
 * Container names are user-facing strings. Reject anything that could
 * path-traverse out of the proxy's intended namespace.
 */
function assertSafeName(name: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(name)) {
    throw new Error(`Invalid container name: ${name}`);
  }
}
