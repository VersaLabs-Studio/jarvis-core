// =============================================================================
// Model resolver (Phase E §2.2 — C5 fix + F2 audit fix).
//
// At boot, pings `https://openrouter.ai/api/v1/models` and verifies every
// chain member. Auto-corrects wrong slugs (e.g. `zhipu/glm-5-turbo` → `z-ai/glm-5`).
// Records the result so /health can expose it and the chat path can use the
// resolved IDs.
//
// F2 fix: when the catalog IS fetched (non-empty) but no model in a role's
// chain [primary, ...fallback] is found, `resolveAllChains` throws a
// composite error so `server.ts` fails boot loudly. When the catalog
// fetch itself fails (network blip / no internet at boot), the resolver
// enters "degraded mode" — chains use the configured IDs as-is and boot
// continues (logged at warn). This matches the chain claim in
// `chains.ts` and `PHASE-E-PLAN.md` §2.2 + §5.6 step 3.
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
 *
 * Throws if the catalog was fetched but any role's chain is entirely
 * missing (primary not found AND no fallback found). In that case, the
 * chain has no resolvable model to send a request to, so serving traffic
 * is worse than refusing to boot.
 */
export async function resolveAllChains(): Promise<ResolvedModels> {
  if (_resolved) return _resolved;
  const env = getEnv();
  const catalog = await fetchCatalog(env.OPENROUTER_API_KEY);

  const roles: HermesRole[] = ["planning", "coding", "office", "fast", "audit"];
  const resolved: Partial<ResolvedModels> = {};
  for (const role of roles) {
    resolved[role] = resolveChain(role, CHAINS[role], catalog);
  }
  _resolved = resolved as ResolvedModels;

  // Boot-fail check (F2). Only fires when we have a non-empty catalog —
  // an empty catalog means the fetch itself failed, and we operate in
  // degraded mode (chains use configured IDs as-is, boot continues).
  if (catalog.length > 0) {
    const missingRoles: HermesRole[] = roles.filter(
      (r) => !_resolved![r].primary.foundInCatalog,
    );
    if (missingRoles.length > 0) {
      const detail = missingRoles
        .map((r) => {
          const chain = _resolved![r];
          const ids = [chain.primary.configured, ...chain.fallback.map((f) => f.configured)].join(", ");
          return `${r} (tried: ${ids})`;
        })
        .join("; ");
      throw new Error(
        `Boot aborted: chain entirely missing from OpenRouter catalog for role(s): ${missingRoles.join(", ")} — ${detail}`,
      );
    }
  } else {
    log.warn(
      "OpenRouter catalog unavailable at boot; chains operating in DEGRADED mode (configured IDs used as-is; runtime will 404 on bad slugs)",
    );
  }

  return _resolved;
}

export function getResolved(): ResolvedModels {
  if (!_resolved) {
    throw new Error("Model resolver not initialized — call resolveAllChains() at boot");
  }
  return _resolved;
}

/**
 * Test-only helper. Clears the module-level `_resolved` cache so the next
 * `resolveAllChains()` call re-fetches and re-resolves. Not for production
 * use — the resolver is meant to run once at boot.
 */
export function resetResolverForTest(): void {
  _resolved = null;
}

async function fetchCatalog(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      log.warn({ status: response.status }, "Failed to fetch OpenRouter model catalog; chains will use configured IDs as-is");
      return [];
    }
    const data = (await response.json()) as OpenRouterModelsResponse;
    const count = data.data?.length ?? 0;
    log.info({ count }, "Fetched OpenRouter model catalog");
    return data.data ?? [];
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "OpenRouter catalog fetch failed; continuing with configured IDs (degraded mode)",
    );
    return [];
  }
}

/**
 * Resolve a single role's chain. Auto-swaps the first found fallback
 * into the primary slot when the configured primary is not in the catalog
 * (Phase E §2.2 — Tech Lead decision: "promote the fallback and log a
 * warning"). The original missing primary is recorded in `missing[]`.
 */
function resolveChain(role: HermesRole, chain: Chain, catalog: OpenRouterModel[]): ChainResolution {
  const resolvedPrimary = resolveOne(chain.primary, catalog);
  const resolvedFallbacks = chain.fallback.map((id) => resolveOne(id, catalog));

  // Build `missing[]` from ALL originally-configured IDs (primary + fallbacks)
  // that were not found in the catalog.
  const missing: string[] = [];
  if (!resolvedPrimary.foundInCatalog) missing.push(resolvedPrimary.configured);
  for (const f of resolvedFallbacks) {
    if (!f.foundInCatalog) missing.push(f.configured);
  }

  // Auto-swap: if the primary is missing, promote the first found fallback
  // into the primary slot. The promoted fallback becomes the new primary;
  // the original primary stays in `missing[]` (we don't re-insert it into
  // the chain — the runtime would just 404 again).
  let primary = resolvedPrimary;
  let fallback = resolvedFallbacks;
  if (!primary.foundInCatalog) {
    const swapIdx = fallback.findIndex((f) => f.foundInCatalog);
    if (swapIdx >= 0) {
      const swapped = fallback[swapIdx]!;
      log.warn(
        { role, original: chain.primary, promoted: swapped.resolved },
        "Primary model missing from catalog; auto-swapped fallback into primary slot",
      );
      primary = swapped;
      fallback = fallback.filter((_, i) => i !== swapIdx);
    }
  }

  return { primary, fallback, missing };
}

function resolveOne(configuredId: string, catalog: OpenRouterModel[]): ResolvedModel {
  if (catalog.length === 0) {
    // No catalog — accept the configured ID as-is. `foundInCatalog: false`
    // is the honest signal; the boot-fail check in `resolveAllChains`
    // is gated on `catalog.length > 0` so this doesn't fail boot.
    return {
      configured: configuredId,
      resolved: configuredId,
      autoCorrected: false,
      candidatesTried: [],
      foundInCatalog: false,
    };
  }
  if (catalogContains(catalog, configuredId)) {
    return {
      configured: configuredId,
      resolved: configuredId,
      autoCorrected: false,
      candidatesTried: [],
      foundInCatalog: true,
    };
  }
  // Try the configured-level corrections
  const candidates = SLUG_CORRECTIONS[configuredId] ?? [configuredId];
  for (const candidate of candidates) {
    if (catalogContains(catalog, candidate)) {
      log.warn(
        { configured: configuredId, resolved: candidate },
        "Auto-corrected model slug",
      );
      return {
        configured: configuredId,
        resolved: candidate,
        autoCorrected: true,
        candidatesTried: candidates,
        foundInCatalog: true,
      };
    }
  }
  // Last resort — pick a model in the catalog that starts with the same prefix.
  const prefix = configuredId.split("/")[0] ?? "";
  if (prefix) {
    const fb = catalog.find((m) => m.id.startsWith(`${prefix}/`));
    if (fb) {
      log.warn(
        { configured: configuredId, resolved: fb.id },
        "Auto-corrected via same-publisher fallback",
      );
      return {
        configured: configuredId,
        resolved: fb.id,
        autoCorrected: true,
        candidatesTried: [fb.id],
        foundInCatalog: true,
      };
    }
  }
  log.error({ configured: configuredId }, "Model not found in catalog and no candidates worked");
  // Return as-is; the chat call will 404 and the runtime will surface it.
  return {
    configured: configuredId,
    resolved: configuredId,
    autoCorrected: false,
    candidatesTried: candidates,
    foundInCatalog: false,
  };
}

function catalogContains(catalog: OpenRouterModel[], id: string): boolean {
  return catalog.some((m) => m.id === id);
}
