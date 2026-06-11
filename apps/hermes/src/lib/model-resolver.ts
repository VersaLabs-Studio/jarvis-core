// =============================================================================
// Model resolver (Phase E §2.2 — C5 fix).
//
// At boot, pings `https://openrouter.ai/api/v1/models` and verifies every
// chain member. Auto-corrects wrong slugs (e.g. `zhipu/glm-5-turbo` → `z-ai/glm-5`).
// Records the result so /health can expose it and the chat path can use the
// resolved IDs.
// =============================================================================

import { getEnv } from "../config/env.js";
import { CHAINS, SLUG_CORRECTIONS, type Chain } from "../config/chains.js";
import { log } from "./logger.js";
import type { ChainResolution, HermesRole, ResolvedModel, ResolvedModels } from "@jarvis/shared";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

let _resolved: ResolvedModels | null = null;

interface OpenRouterModel {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Resolve all 5 chains. Called once at boot. Returns a snapshot used by
 * /health and by the chat path. The chat path uses the *resolved* IDs
 * (never the original configured IDs) when talking to OpenRouter.
 */
export async function resolveAllChains(): Promise<ResolvedModels> {
  if (_resolved) return _resolved;
  const env = getEnv();
  let catalog: OpenRouterModel[] = [];
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      log.warn({ status: response.status }, "Failed to fetch OpenRouter model catalog; chains will use configured IDs as-is");
    } else {
      const data = (await response.json()) as OpenRouterModelsResponse;
      catalog = data.data ?? [];
      log.info({ count: catalog.length }, "Fetched OpenRouter model catalog");
    }
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "OpenRouter catalog fetch failed; continuing with configured IDs");
  }

  const roles: HermesRole[] = ["planning", "coding", "office", "fast", "audit"];
  const resolved: Partial<ResolvedModels> = {};
  for (const role of roles) {
    resolved[role] = resolveChain(CHAINS[role], catalog);
  }
  _resolved = resolved as ResolvedModels;
  return _resolved;
}

export function getResolved(): ResolvedModels {
  if (!_resolved) {
    throw new Error("Model resolver not initialized — call resolveAllChains() at boot");
  }
  return _resolved;
}

function resolveChain(chain: Chain, catalog: OpenRouterModel[]): ChainResolution {
  const primary = resolveOne(chain.primary, catalog);
  const fallback = chain.fallback.map((id) => resolveOne(id, catalog));
  const missing: string[] = [];
  if (primary.autoCorrected && primary.resolved !== primary.configured) {
    // If we corrected, the original is "missing" by definition.
    missing.push(primary.configured);
  }
  for (const f of fallback) {
    if (f.autoCorrected) missing.push(f.configured);
  }
  return { primary, fallback, missing };
}

function resolveOne(configuredId: string, catalog: OpenRouterModel[]): ResolvedModel {
  if (catalog.length === 0) {
    // No catalog — accept the configured ID as-is (best we can do).
    return { configured: configuredId, resolved: configuredId, autoCorrected: false, candidatesTried: [] };
  }
  if (catalogContains(catalog, configuredId)) {
    return { configured: configuredId, resolved: configuredId, autoCorrected: false, candidatesTried: [] };
  }
  // Try the configured-level corrections
  const candidates = SLUG_CORRECTIONS[configuredId] ?? [configuredId];
  for (const candidate of candidates) {
    if (catalogContains(catalog, candidate)) {
      log.warn(
        { configured: configuredId, resolved: candidate },
        `Auto-corrected model slug`,
      );
      return { configured: configuredId, resolved: candidate, autoCorrected: true, candidatesTried: candidates };
    }
  }
  // Last resort — pick a model in the catalog that starts with the same prefix.
  const prefix = configuredId.split("/")[0] ?? "";
  if (prefix) {
    const fallback = catalog.find((m) => m.id.startsWith(`${prefix}/`));
    if (fallback) {
      log.warn(
        { configured: configuredId, resolved: fallback.id },
        `Auto-corrected via same-publisher fallback`,
      );
      return {
        configured: configuredId,
        resolved: fallback.id,
        autoCorrected: true,
        candidatesTried: [fallback.id],
      };
    }
  }
  log.error({ configured: configuredId }, "Model not found in catalog and no candidates worked");
  // Return as-is; the chat call will 404 and the runtime will surface it.
  return { configured: configuredId, resolved: configuredId, autoCorrected: false, candidatesTried: candidates };
}

function catalogContains(catalog: OpenRouterModel[], id: string): boolean {
  return catalog.some((m) => m.id === id);
}
