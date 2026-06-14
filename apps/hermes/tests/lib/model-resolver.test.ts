// =============================================================================
// Tests for the boot-time model resolver (F2 audit fix).
//
// F2 bug: the `chains.ts` comment, `PHASE-E-PLAN.md` §2.2 + §5.6 step 3,
// and the E0 §5.7 acceptance criterion all said "fail boot if all chain
// members are missing from the OpenRouter catalog." But
// `model-resolver.ts:resolveOne` returned the configured ID as-is when
// nothing matched, and `resolveAllChains` never threw — the boot-fail
// claim was not enforced.
//
// F2 fix: `resolveOne` now sets `foundInCatalog: boolean`; `resolveChain`
// builds a `missing[]` and auto-swaps a working fallback into the
// primary slot; `resolveAllChains` throws a composite error when the
// catalog was successfully fetched (non-empty) but a role's chain has
// no resolvable model.
//
// These tests use `vi.resetModules()` + dynamic import so each test gets
// a fresh module-level `_resolved` cache. `fetch` is mocked to return a
// fake OpenRouter catalog.
// =============================================================================

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_API_KEY = "test-openrouter-key-1234567890";

function fakeCatalog(modelIds: string[]): Response {
  return new Response(
    JSON.stringify({ data: modelIds.map((id) => ({ id })) }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = TEST_API_KEY;
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveAllChains (F2 — fails boot on entirely-missing chain)", () => {
  it("throws when the catalog was fetched but no chain member is present for any role", async () => {
    // Catalog contains one model that no role in `chains.ts` references.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fakeCatalog(["some-other/totally-different-model"]));

    const { resolveAllChains } = await import("../../src/lib/model-resolver.js");
    await expect(resolveAllChains()).rejects.toThrow(/entirely missing from OpenRouter catalog/);
  });

  it("does NOT throw when the catalog fetch itself fails (degraded mode)", async () => {
    // Network blip at boot — we can't verify the slugs, so chains use
    // configured IDs as-is and boot continues. (PHASE-E-PLAN.md §2.2:
    // "If the primary is missing but a fallback is present, auto-swap
    // ... keep serving." The degraded-mode analog: if we can't see the
    // catalog at all, serve what we have.)
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ENOTFOUND openrouter.ai"));

    const { resolveAllChains } = await import("../../src/lib/model-resolver.js");
    const resolved = await expect(resolveAllChains()).resolves.toBeDefined();
    expect(resolved).toBeDefined();
  });
});
