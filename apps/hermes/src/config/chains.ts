// =============================================================================
// Hermes model routing chains (Phase E §2).
//
// C5 fix: `zhipu/glm-5-turbo` from Part 1 §1.5 is replaced with `z-ai/glm-5`
// (GLM-5 is published under Z.ai). The boot-time resolver verifies every
// chain member against `openrouter.ai/api/v1/models` and auto-corrects
// wrong slugs.
//
// If a chain has a missing primary but a working fallback, the resolver
// promotes the fallback and logs a warning. If an entire chain is
// missing, boot fails (per Phase E §5.6 step 3).
// =============================================================================

import { z } from "zod";
import type { HermesRole } from "@jarvis/shared";

export const RoleSchema = z.enum([
  "planning",
  "coding",
  "office",
  "fast",
  "audit",
]);

export const ChainSchema = z.object({
  primary: z.string().min(1),
  fallback: z.array(z.string().min(1)).default([]),
});
export type Chain = z.infer<typeof ChainSchema>;

/**
 * The 5 model chains, one per role. `audit` has no fallback because audits
 * must be deterministic (Phase E §2.2 — Tech Lead decision).
 */
export const CHAINS: Record<HermesRole, Chain> = {
  planning: {
    primary: "nvidia/nemotron-3-super-120b-a12b:free",
    fallback: ["z-ai/glm-5", "minimax/minimax-m2-5:free"],
  },
  coding: {
    primary: "nvidia/nemotron-3-super-120b-a12b:free",
    fallback: ["z-ai/glm-5", "minimax/minimax-m2-5:free"],
  },
  office: {
    primary: "minimax/minimax-m2-5:free",
    fallback: ["nvidia/nemotron-3-super-120b-a12b:free"],
  },
  fast: {
    primary: "z-ai/glm-5",
    fallback: ["minimax/minimax-m2-5:free"],
  },
  audit: {
    primary: "nvidia/nemotron-3-super-120b-a12b:free",
    fallback: [],
  },
};

/**
 * Slug candidates the resolver tries in order when the configured ID 404s.
 * Order matters: most likely correct first.
 */
export const SLUG_CORRECTIONS: Record<string, string[]> = {
  "zhipu/glm-5-turbo": ["z-ai/glm-5", "z-ai/glm-5-turbo", "zhipu/glm-5", "zhipu/glm-4.5"],
  "minimax/minimax-m2-5:free": ["minimax/minimax-m2-5", "minimax/minimax-m2", "MiniMaxAI/MiniMax-M2"],
};

/**
 * Build the ordered list of model IDs to try for a role. Used by the
 * openrouter.ts chatWithFallback().
 */
export function chainForRole(role: HermesRole): string[] {
  const chain = CHAINS[role];
  return [chain.primary, ...chain.fallback];
}
