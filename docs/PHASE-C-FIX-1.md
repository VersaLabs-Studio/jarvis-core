# JARVIS v1.5 — Phase C Gate Audit: **HOLD** (Fix Loop 1)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — BRAIN gate on the **merged** `phase/c-web`.
> **To:** Orchestrator → Debug/Execute → re-gate.
> **Verdict:** ❌ **HOLD — gate RED.** Score **6.5/10**. Excellent architecture, but the merged branch **does not build**. Do **not** merge to `develop` until the re-gate below is green.
> **Branch:** `phase/c-web` @ `716c6c0`. **Date:** June 2026.

---

## 0. Why this is held (one sentence)

Per-WP audits passed, but the **integrated branch fails `pnpm install --frozen-lockfile` and fails `tsc` with 4 errors** — the exact "merge hides integration breaks" pattern that bit Phase B (PB-LOCK-1 / unwired factory). The design is merge-worthy; the build is not.

**What passed (verified on the merged branch — keep it):**
- ✅ **C-P2-1** one data layer — every entity routes through `hooks/use-entity.ts` → `lib/api.ts`. No ad-hoc `fetch` anywhere (only `react-query.refetch()` and the legit SSE `EventSource` in `use-logs.ts`).
- ✅ **C-COLOR-1** color-gate = **0** raw hex/rgb/hsl in `.ts/.tsx`.
- ✅ **C-P6 any-gate** = **0** `any` in committed code.
- ✅ **C-RLS-1** no service-role key in the browser (anon key + session JWT only).
- ✅ **C-P4-1** all four data-view states exist (`Skeleton`/`EmptyState`+CTA/`ErrorState`+retry/`DataView` Framer stagger) and are wired across all 10 pages.

---

## 1. BLOCKERS — must all be green to merge

### PC-LOCK-1 — lockfile drift (frozen install fails) 🔴
`apps/web/package.json` declares three deps absent from `pnpm-lock.yaml`:
`@hookform/resolvers@^5.4.0`, `@radix-ui/react-dialog@^1.1.15`, `react-hook-form@^7.77.0`.
→ `pnpm install --frozen-lockfile` aborts with `ERR_PNPM_OUTDATED_LOCKFILE`.
**Fix:** run `pnpm install` at repo root, commit **only** `pnpm-lock.yaml`. (Same fix shape as PB-LOCK-1 — lockfile-only commit, no source change.)

### PC-TS-2 — `dialog.tsx` missing exports (3 tsc errors) 🔴
`components/ui/dialog.tsx` exports only `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`.
`integrations/page.tsx` (26–28) imports `DialogDescription`, `DialogFooter`, `DialogTrigger` — which don't exist.
**Fix:** add the three missing primitives to `dialog.tsx` so **all** dialog consumers share one API (preferred over editing the page): `DialogTrigger` (calls `onOpenChange(true)`), `DialogFooter` (flex justify-end row), `DialogDescription` (`text-sm text-muted-foreground`). Match existing token styling — color-gate stays 0.

### PC-TS-3 — WS `send` spreads `unknown` (1 tsc error) 🔴
`hooks/use-websocket.ts:125` — `JSON.stringify({ type, ...data })` where `data: unknown` → `TS2698 Spread types may only be created from object types`.
**Fix:** narrow the param — `send(type: string, data?: Record<string, unknown>)` and send `{ type, ...(data ?? {}) }`. Keep the wire shape the B5 server expects (`{ type, ...fields }`).

### PC-TS-1 — chat messages filter not in `ListOpts` (1 tsc error) 🔴
`chat/_hooks/use-chat.ts:19` passes `{ session_id }` to `useList`, but `@jarvis/shared` `ListOpts` only has `page/per_page/search/status/sort_by/sort_order` → `TS2353`.
**Fix (pick ONE, keep it consistent — this is the C2 contract gap):**
- **(preferred)** add `session_id?: string` to `ListOpts` in `packages/shared/src/lib/query-keys.ts` (P6 source of truth; the API client already forwards any `ListOpts` field as a query param, and the B5 messages route filters on `session_id`); **or**
- route messages through a dedicated `api.getRaw(`/api/chat_messages?session_id=${id}`)` call.
Do **not** cast to silence it.

**Build gate:** all four above → `tsc` 0 errors → `next build` succeeds. The build will not even reach `next build` until the tsc errors clear.

---

## 2. HIGH — fix in this same loop

### PC-WS-1 — "refresh once" never actually refreshes the token 🟠
`use-websocket.ts:83` — on a `4401` close the handler calls `supabase.auth.getSession()`, which returns the **same cached (expired) token**, then reconnects with it → the server `4401`s again immediately → second close routes to `/login`. The B5 **C-WS-1** contract is *refresh the session once, then retry*. `getSession()` doesn't refresh.
**Fix:** replace line 83's `getSession()` with `await supabase.auth.refreshSession()`; reconnect only if it returns a fresh session, else `/login`. This is the difference between a silent reconnect on token expiry and bouncing every operator to the login page mid-session.

---

## 3. MINOR — note, not gating (address opportunistically)

- **PC-DRY-1:** `@jarvis/shared` exports a `keys` query-key factory, but `use-entity.ts` re-implements the same tuples inline (`[entity, "list", opts]`). Two sources for one key shape → cache-invalidation drift risk. Import `keys` from `@jarvis/shared` in `use-entity.ts` (or delete the unused factory). One source.
- **C7 provenance (no action):** `feat/c-logs-analytics` tip `812f56e` is not an ancestor of `phase/c-web`, but its files (logs SSE viewer, analytics) are present — re-applied through the C3–C8 conflict-resolution merge. Content intact; flagged only so the history is understood.

---

## 4. Re-gate criteria (BRAIN will re-run these on the merged branch)

```
pnpm install --frozen-lockfile      # EXIT 0  (PC-LOCK-1)
pnpm -F @jarvis/web typecheck        # 0 errors (PC-TS-1/2/3)
pnpm -F @jarvis/web build            # succeeds
# color-gate / any-gate already 0 — keep them 0
```
All green → BRAIN re-audits and merges `phase/c-web → develop`. Until then `phase/c-web` stays put. **Never `main`.**

---

## 5. Architect (Kidus) — still outstanding (unchanged by this gate)

| # | Task | Note |
|---|------|------|
| A | Open `develop → main` PR on GitHub | Phase B promotion — your manual call, carried from last round. |
| C | Provide a real operator Supabase session for C6/C8 WS + auth E2E | Needed to prove PC-WS-1's fix end-to-end against the live project once the build is green. |

---

## 6. Fix-loop relay (paste to Orchestrator)

> **Orchestrator — Phase C gate is HELD (6.5/10). Architecture passed; the merged branch does not build.** Apply `docs/PHASE-C-FIX-1.md` on `phase/c-web` (a dedicated `feat/c-fix-1` is fine, PR into `phase/c-web`). **4 blockers:** PC-LOCK-1 (regenerate `pnpm-lock.yaml`, lockfile-only commit), PC-TS-2 (add `DialogDescription`/`DialogFooter`/`DialogTrigger` to `dialog.tsx`), PC-TS-3 (type the WS `send` payload as `Record<string,unknown>`), PC-TS-1 (add `session_id?` to `ListOpts` in `@jarvis/shared`, or use a dedicated messages call — keep one pattern). **1 high:** PC-WS-1 (4401 handler must call `supabase.auth.refreshSession()`, not `getSession()`). Optional: PC-DRY-1 (use the shared `keys` factory in `use-entity.ts`). Re-gate must pass: `frozen install` EXIT 0, `tsc` 0 errors, `next build` succeeds, color-gate & any-gate stay 0. Report back and I re-audit before the `develop` merge. Do **not** merge to `develop` yourself.

---

*JARVIS v1.5 Phase C Fix Loop 1 — © 2026 Kidus Abdula / VersaLabs Studio.*
