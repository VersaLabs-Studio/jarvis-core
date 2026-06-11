# JARVIS v1.5 — Phase D Dispatch: **WP-0 API Foundation (remaining) + D6 Native Platform**

> **From:** Kidus Abdula (Architect / Opus BRAIN) — D3∥D4∥D5 reported complete (pending BRAIN re-gate on the actual worktree); rolling the remaining API-foundation fixes forward so they don't recirculate.
> **To:** Orchestrator → **WP-0 (apps/api, serial — can run NOW in parallel with the D3/D4/D5 audit)** → then **D6** (after D3/D4/D5 gate + merge).
> **Branch line:** `develop` → `phase/d-mobile` → `feat/d-*`. **Gate per WP:** Code Review 0 blockers + Auditor ≥ 8.5 + color-gate 0 → PR into `phase/d-mobile`. Never `main`.
> **Spec of record:** `docs/PHASE-D-HANDOFF.md` §1 (D6), `docs/PHASE-D-LIVE-GATE-FINDINGS.md` (full root-cause for WP-0). **Date:** June 2026.

---

## 0. Sequencing (read first)

The first live authenticated exercise of the API (closing the `phase/d-mobile → develop` gate) uncovered foundational Phase B defects — full record in `docs/PHASE-D-LIVE-GATE-FINDINGS.md`. **Part is already fixed and committed** (`ce82e1a fix(api): repair boot, env loading, and CMS auth scope`): the server now boots (ESM env import-order), loads `.env` (`--env-file`), and the `/api/cms/*` surface is correctly auth-scoped (unauth → 401, verified). **What remains is the SYSTEMIC half** — every *other* protected route is still broken the same way. That's WP-0 here.

```
WP-0 (apps/api, no mobile deps)  ──can start immediately, in parallel with the D3/D4/D5 audit──┐
D3∥D4∥D5  ──BRAIN re-gates on the worktree (NOT the self-report) → PR → merge to phase/d-mobile─┤
                                                                                                ▼
                                                                          D6 (feat/d-native-platform)
```
D6 threads into D4's chat sessions + the WS event stream, so **D6 does not start until D3/D4/D5 are merged.** WP-0 has no mobile dependency and should start now. Live verification of *everything* (D3–D6) stays blocked on WP-0 **and** the architect's Supabase provisioning (§2).

---

## 1. WP-0 — API Foundation, the systemic fix (SERIAL · `apps/api` · commit before D6 live work)

**Root cause (one bug, many symptoms):** shared plugins are registered **without `fastify-plugin` (fp)**, so everything they `decorate`/`addHook` is trapped in their own encapsulated child scope and never reaches the sibling route modules. Result: `tenantMiddleware` ran on **no** route (every protected route returns 500/502 unauth, never 401), `request.tenantId` is undefined everywhere, and `fastify.supabaseAdmin` is undefined in `bootstrap` (`TypeError: …reading 'auth'`). Proven empirically: `500 /api/auth/me · 500 /api/services · 502 /api/models · 500 /api/secrets`. The CMS factory was already fixed in `ce82e1a`; apply the same correctness everywhere else.

### F1 — make `supabasePlugin` global (fp-wrap)
`apps/api/src/plugins/supabase.ts` — wrap so the `supabaseAdmin` decoration **and** the `request.supabase` onRequest hook propagate to all routes:
```ts
import fp from "fastify-plugin";
export const supabasePlugin = fp(async function supabasePlugin(fastify) { /* body unchanged */ });
```
Add `fastify-plugin` to `apps/api` deps and **regenerate `pnpm-lock.yaml`** (lockfile drift has broken every phase gate). This alone fixes the `bootstrap` 500.

### F2 — make protection actually encapsulate its routes (uniform pattern)
The proven pattern from `register-entities.ts` (`ce82e1a`): the auth hook and the routes must live on the **same** instance. Apply it to **every** protected module — replace `await fastify.register(protectedPlugin); fastify.get(...)` with routes registered inside the guarded scope:
```ts
export async function servicesRoutes(fastify: FastifyInstance) {
  await fastify.register(async (s) => {
    s.addHook("preHandler", tenantMiddleware);
    s.get("/api/services", async (request, reply) => { /* … */ });
    // …all routes in this module move onto `s`
  });
}
```
Modules to fix: `auth/me`, `services`, `secrets`, `models`, `analytics`, `logs`, `admin`, `workflows/trigger`, `integrations/test`, **and `chat/sessions`, `chat/send`, `chat/messages`** (chat registers *no* protection today — same defect). Keep `/health` and `/api/auth/bootstrap` **public** (bootstrap verifies via `fastify.supabaseAdmin`, now propagated by F1). Pick this one pattern; do not leave `protectedPlugin` in the broken register-then-route-on-parent form. Avoid double-guarding the CMS factory (it already owns its scope).

### F3 — fix the misleading 401
`apps/api/src/middleware/tenant.ts` — "No tenant associated" is currently relabeled by the catch-all as 401 "Invalid token". Give it a distinct code (`NO_TENANT`) / message so a missing `tenant_id` claim is diagnosable at a glance.

**WP-0 exit gate (re-run on the COMMITTED tree):**
```
pnpm install --frozen-lockfile                 # 0  (F1 lockfile)
pnpm -F @jarvis/api typecheck                  # 0
# boot the API, then unauthenticated probes — ALL must be 401, none 500/502:
#   /api/auth/me  /api/services  /api/secrets  /api/models  /api/analytics  /api/logs
#   /api/chat/sessions  /api/cms/workflows
# /health → 200 (public),  bootstrap reachable (no TypeError)
pnpm -F @jarvis/mobile typecheck ; pnpm -F @jarvis/web typecheck   # 0 / 0
```
Green → commit `fix(api): fp-wrap shared plugins + uniform tenant guard across all routes`.

---

## 2. Architect (Kidus) — Supabase provisioning (Blocker B, gates the LIVE smoke only)

Not a code task and not a fan-out blocker — it gates the live `GET /api/cms/workflows → 200`. Run `docs/PHASE-D-LIVE-GATE-FINDINGS.md` §3 in the Supabase SQL editor: **(1)** grant `service_role` (and confirm `authenticated`) privileges on `public.*` — currently denied on `tenants`/`profiles`; **(2)** enable the **Customize Access Token (JWT) Claims** hook → `public.custom_access_token` (without it no token carries `tenant_id`); **(3)** bootstrap the operator (`SELECT public.bootstrap_user('b129c48c-6226-4bc8-86f3-7ee0220c2fe2'::uuid,'kidus489@gmail.com','Kidus Abdula');`). Then re-mint the token and the smoke call returns 200 → live gate closes.

---

## 3. D6 — Native Platform (`feat/d-native-platform` · after D3/D4/D5 merge · per `PHASE-D-HANDOFF.md` §1)

| Surface | Scope |
|---|---|
| **Push** | Expo Notifications wired to the WS `notification` event: register the Expo push token on login, handle foreground + tapped-notification routing. **Build-target option (architect §4-D):** stub against Expo's push service in **Expo Go now**, defer real APNs/FCM (EAS) to **Phase F** — ship the rest of D6 without blocking on push infra. **No service-role/secret on device.** |
| **SecureStore persistence (E2E)** | Cold-start restores the Supabase session from SecureStore; sign-out clears it. Proves D-SEC-1 end-to-end on device (the chunked adapter already exists from D2). |
| **Deep linking** | `jarvis://chat/session/:id` resolves to the D4 chat session screen (expo-router linking config). |
| **Haptics** | Consistent haptic feedback on primary actions (send already partially wired in D4) — centralize a small `lib/haptics.ts`. |

---

## 4. Mandatory conditions (Auditor verifies — from `PHASE-D-HANDOFF.md` §2)

- **D-SEC-1** — session at rest in Expo SecureStore only; **no service-role key on device**; push token registration sends no secret.
- **D-WS-1** — push consumes the same `lib/websocket.ts` (`refreshSession()` once on 4401); no second socket.
- **D-P4-1 / D-P6-1 / D-COLOR-1** — four data-view states where applicable; zero `any`; tokens from `theme/colors.ts`, color-gate 0 (no `oklch(`/`hsl(`).
- **Mobile build-integrity gate:** `pnpm install --frozen-lockfile` 0 · `pnpm -F @jarvis/mobile typecheck` 0 · `npx expo-doctor` clean · `npx expo export --platform all` bundles · color/any-gate 0.

---

## 5. Relay (paste to Orchestrator)

> **Orchestrator — two tracks.** **(A · start now, apps/api only, parallel to the D3/D4/D5 audit) WP-0 API Foundation:** the boot/env/CMS-auth fixes are already committed (`ce82e1a`); finish the **systemic** half — every *other* protected route is still broken by Fastify encapsulation. **F1:** fp-wrap `plugins/supabase.ts` with `fastify-plugin` (so `supabaseAdmin` + the `request.supabase` hook propagate; fixes the bootstrap 500) and add `fastify-plugin` + regen the lockfile. **F2:** apply the proven `register-entities.ts` pattern uniformly — register each protected module's routes **inside** a scope that owns `tenantMiddleware`: `auth/me`, `services`, `secrets`, `models`, `analytics`, `logs`, `admin`, `workflows/trigger`, `integrations/test`, **and chat/sessions, chat/send, chat/messages (which have NO guard today)**; keep `/health` + `/api/auth/bootstrap` public; don't double-guard the CMS factory. **F3:** in `middleware/tenant.ts`, give "No tenant associated" a distinct `NO_TENANT` 401 (it's currently mislabeled "Invalid token"). Exit gate: every protected route unauth → **401** (not 500/502), `/health` 200, bootstrap no TypeError, frozen install 0, api+mobile+web typecheck 0. Commit `fix(api): fp-wrap shared plugins + uniform tenant guard`. **(B · after D3/D4/D5 are gated by BRAIN on the actual worktree and merged) D6 `feat/d-native-platform`:** Push (Expo Notifications ↔ WS `notification`; may stub on Expo Go and defer APNs/FCM to Phase F), SecureStore session persistence E2E, deep-link `jarvis://chat/session/:id`, haptics — under D-SEC-1/D-WS-1/D-P4-1/D-P6-1/D-COLOR-1, no service-role on device. Per WP: Code Review 0 → Auditor ≥ 8.5 → PR into `phase/d-mobile`. Never `main`. The live `GET /api/cms/workflows → 200` (needs the architect's Supabase provisioning in `PHASE-D-LIVE-GATE-FINDINGS.md` §3) is the phase gate, not a WP blocker. Report WP-0 on the committed tree first.

---

## 6. D3∥D4∥D5 gate result + carryover (added after the BRAIN gate, June 11)

**D3∥D4∥D5 GATED GREEN (8.7/10) and merged to `phase/d-mobile` (`be33434`).** Merged-tree gate: frozen install 0, mobile+web `tsc` 0, color/any 0, **no service-role on device**, no `/api/${entity}` or `/api/cms` misuse; D-P4-1 (four states on dashboard/workflows/chat), D-WS-1 (shared `lib/websocket`), D-SEC-1 (logout clears SecureStore), D-P6-1, D-COLOR-1 all satisfied. The live `GET /api/cms/workflows → 200` is **WAIVED for the phase by architect approval** (deferred to production-readiness; still needs Blocker B / §2 to be *truly* closed — it was not executed).

**Carryover cleanups (non-blocking — fold into D6 or a tiny cleanup pass, NOT their own loop):**
1. **D-P2-1 (P1) — dashboard inline query keys.** `apps/mobile/app/(tabs)/index.tsx` (lines 35, 174–176) uses raw tuples `["workflows"]`, `["chat_sessions"]`, `["services","health"]` for `useServiceHealth` + `onRefresh` invalidation instead of the shared `keys` factory. Swap the workflows/chat_sessions invalidations to `keys.workflows.all()` / `keys.chat_sessions.all()`; add a small key for service-health so it's not a bare tuple. (Functionally works today via prefix-match — hence non-blocking.)
2. **Port-trap (P2) — settings server-URL.** `settings.tsx getServerUrl()` falls back to `http://localhost:4000` (stale port; API is 3001). Display-only; align it with `lib/api`'s `getApiUrl()` so there's one source of truth.
3. **N+1 (P2) — workflow runs.** `workflows.tsx WorkflowCardWithData` calls `useWorkflowRuns` per card → N parallel requests. Consider one batched runs query keyed by the visible workflow ids.

Plus the two API-foundation carryovers from §1 (redundant global `request.supabase` hook now that `tenantMiddleware` sets a verified client; a `protectedScope()` helper to de-boilerplate per-module registration).

---

*JARVIS v1.5 Phase D — WP-0 API Foundation + D6 Native Platform Dispatch — © 2026 Kidus Abdula / VersaLabs Studio.*
