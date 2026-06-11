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
// =============================================================================

import { getEnv } from "../config/env.js";
import { log } from "./logger.js";

let _baseUrl: string | null = null;
let _enabled = false;

export async function initDockerControl(): Promise<void> {
  const env = getEnv();
  if (!env.DOCKER_HOST) {
    log.warn("DOCKER_HOST not set; docker-control is disabled (services/* will not work)");
    _enabled = false;
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
  // Probe the proxy
  try {
    const response = await fetch(`${_baseUrl}/_ping`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) {
      log.warn({ status: response.status }, "Socket-proxy ping non-2xx; docker-control is degraded");
    } else {
      _enabled = true;
      log.info({ url: _baseUrl }, "Docker control connected to socket-proxy");
    }
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "Socket-proxy unreachable; docker-control disabled");
    _enabled = false;
  }
}

export function isDockerControlEnabled(): boolean {
  return _enabled;
}

interface DockerContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
  Created: number;
}

export async function list(): Promise<DockerContainer[]> {
  assertEnabled();
  const response = await fetch(`${_baseUrl}/containers/json?all=1`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`docker list failed: ${response.status}`);
  return (await response.json()) as DockerContainer[];
}

export async function inspect(name: string): Promise<unknown> {
  assertEnabled();
  assertSafeName(name);
  const response = await fetch(`${_baseUrl}/containers/${encodeURIComponent(name)}/json`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`docker inspect ${name} failed: ${response.status}`);
  return response.json();
}

export async function start(name: string): Promise<void> {
  assertEnabled();
  assertSafeName(name);
  await postAction(name, "start");
}

export async function stop(name: string): Promise<void> {
  assertEnabled();
  assertSafeName(name);
  await postAction(name, "stop");
}

export async function restart(name: string): Promise<void> {
  assertEnabled();
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
  assertEnabled();
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
  assertEnabled();
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

function assertEnabled(): void {
  if (!_enabled) {
    throw new Error("docker-control not enabled (DOCKER_HOST unset or proxy unreachable)");
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
