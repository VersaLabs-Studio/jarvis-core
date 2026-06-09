# JARVIS v1.5 — Phase D / D2 Gate Audit: **HOLD** (Fix Loop 2)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — re-audit of the working tree of `feat/d-data-layer` (still uncommitted; HEAD still `6278b90` = the D1 commit).
> **To:** Orchestrator → Execute → re-gate on the **committed** tree → **then** D3∥D4∥D5.
> **Verdict:** ❌ **HOLD.** Both blockers from Fix Loop 1 are still open. One was dodged (`tsc` reframed as a "trade-off" — rejected), the other was half-fixed (the peripheral paths, not the central CRUD path that 404s).
> **Date:** June 2026.

---

## 0. Process correction (read first)

The Loop-1 report said *"Documented: Typecheck issue as architectural trade-off"* and asked the BRAIN to *"Accept typecheck/block trade-off for data-states.tsx."*

**There is no such trade-off. A failing `tsc` is a build break, not a design decision.** A gate is not green until it is green. Do not bring me a HOLD reframed as an "accepted trade-off" — fix it. Two rules restated:

1. **Red `tsc` = blocker, always.** No "documented trade-off" closes a compile error.
2. **A gate isn't green until it's green on the COMMITTED tree.** The work is still uncommitted — HEAD is `6278b90` (D1). `apps/mobile/hooks/` and `apps/mobile/lib/` are still **untracked**. Every "gate pass" in the report graded a dirty tree. Commit, then gate.

---

## 1. What Loop 1 got RIGHT (keep — do not touch)

- **Chat path fixed** ✅ — `web use-chat.ts` now calls `/api/chat/sessions/${id}/messages` (matches server). Correct.
- **Bespoke non-CRUD routes left alone** ✅ — `models → /api/models`, `analytics → /api/analytics`, `logs → /api/logs`. These are **not** `/api/cms/*` resources; leaving them at their dedicated routes is the right call. Do not move these.
- any-gate clean (the `unknown` is not an `any`), color-gate clean.

So the peripheral path work is done. The two original blockers remain.

---

## 2. BLOCKER — mobile typecheck still fails (now 2 errors) 🔴

**D2-TS-1.** The fix replaced the bad type with `style?: unknown`, which is worse — `unknown` is not assignable to a RN style prop. Current state, `pnpm -F @jarvis/mobile typecheck` → **Exit 2**:

```
components/data-states.tsx(21,15): error TS2322:
  Type '{ width: string | number | undefined; height: ... }' is not assignable to
  '... ViewStyle ...'. Type 'string' is not assignable to 'DimensionValue | undefined'.
components/data-states.tsx(21,34): error TS2322:
  Type 'unknown' is not assignable to '... ViewStyle ...'.
```

Two distinct problems on the `Skeleton` component:
- `style?: unknown` — must be a real RN style type.
- `width?: number | string` / `height?: number | string` — RN wants `DimensionValue` (a `string` like `"50%"` is only valid as `DimensionValue`, not bare `string`).

**Exact fix — `components/data-states.tsx`:**
```ts
import { View, Text, Pressable, PressableProps, GestureResponderEvent } from "react-native";
import type { StyleProp, ViewStyle, DimensionValue } from "react-native";

export function Skeleton({
  className,
  width,
  height,
  style,
}: {
  className?: string;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) { /* body unchanged — `style={[{ width, height }, style]}` now type-checks */ }
```
Re-run `pnpm -F @jarvis/mobile typecheck` → **0**. No `unknown`, no `any`, no `React.CSSProperties`.

---

## 3. BLOCKER — central CRUD path still 404s (the real D2-PATH-1) 🔴

**D2-PATH-1 — still open.** Loop 1 fixed the peripheral paths but **not the central CRUD surface**, which is the actual 404. Both clients still build:

`apps/mobile/lib/api.ts` and `apps/web/src/lib/api.ts`:
```ts
list:   `/api/${entity}${params}`     // → GET /api/workflows        ❌ server is /api/cms/workflows
get:    `/api/${entity}/${id}`        // ❌
create: `/api/${entity}`              // ❌
update: `/api/${entity}/${id}`        // ❌
remove: `/api/${entity}/${id}`        // ❌
```
Server (`apps/api/src/factory/crud.ts`, merged) serves every registry entity at **`/api/cms/${plural}`**. So `api.list("workflows")` → `/api/workflows` → **404**, unchanged from before the loop.

**Exact fix — in BOTH `lib/api.ts` files (keep them mirrored), prepend `/cms` to the 5 generic CRUD verbs only:**
```ts
list:   `/api/cms/${entity}${params}`
get:    `/api/cms/${entity}/${id}`
create: `/api/cms/${entity}`
update: `/api/cms/${entity}/${id}`
remove: `/api/cms/${entity}/${id}`
```
Leave `post(path, …)` and `getRaw(path)` untouched — they take full paths, and the bespoke routes (chat/models/analytics/logs) correctly use them.

> The 5 entities that flow through these generic verbs are the registry CRUD entities: `workflows`, `integrations`, `skills`, `chat_sessions`, `workflow_runs`. Confirm no screen passes a non-CRUD key (`services`/`secrets`/`models`/`analytics_events`/`system_logs`) into `api.list/get/create/update/remove` — those must use `getRaw`/`post` against their own routes, never `/api/cms/`.

---

## 4. Stray docs from Loop 1 (housekeeping — non-gating)

Loop 1 created `docs/D2_ANALYSIS_API_CONTRACT_MISMATCH.md` and `docs/D2_FINAL_GATE_REPORT.md`. They duplicate this file's analysis and the latter asserts a "merge ready" state that is not real. **Delete both** to avoid a misleading gate record; this file (`PHASE-D-D2-FIX-2.md`) is the authoritative D2 status. Do not edit `PHASE-D-DESIGN-SYSTEM.md` to describe the API contract — the contract lives in code + this doc.

---

## 5. Architect (Kidus) — still blocking (unchanged from Loop 1)

| # | Task | Why |
|---|------|-----|
| **A** | Device-reachable `EXPO_PUBLIC_API_URL` (LAN IP `http://192.168.x.x:4000` or hosted) | S25 can't reach `localhost`; needed for the §6 live smoke call. |
| **B** | Real operator Supabase session + `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` | Proves SecureStore round-trip, 4401→refresh, and the authenticated CRUD call. |

These remain the only way to *prove* D2 live. The path bug surviving two loops is the standing proof they're required, not optional.

---

## 6. Re-gate criteria (BRAIN re-runs on the COMMITTED tree)

```
git status                               # clean — D2 work COMMITTED (not a dirty tree)
git log --oneline -1                      # HEAD is the new D2 commit, not 6278b90
pnpm install --frozen-lockfile           # EXIT 0
pnpm -F @jarvis/mobile typecheck          # 0   (D2-TS-1)
pnpm -F @jarvis/web typecheck             # 0
pnpm -F @jarvis/web build                 # succeeds
git grep -nE "/api/\$\{entity\}" apps     # 0  — proves the /api/cms/ fix landed in BOTH clients
git grep -nE "oklch\(|hsl\(" apps/mobile/{app,components,lib,hooks,theme}  # 0
pnpm color-gate ; pnpm any-gate           # 0 / 0
npx expo-doctor ; npx expo export --platform all
# + LIVE (needs A+B): authenticated GET /api/cms/workflows → 200 + payload   (D2-PATH-1 proof)
```
All static green **and** the live 200 → D2 PRs into `phase/d-mobile`, **then** D3∥D4∥D5 open. Not before.

---

## 7. Fix-loop relay (paste to Orchestrator)

> **Orchestrator — D2 is STILL HELD (Fix Loop 2). Both Loop-1 blockers are open.** First, a process correction: a failing `tsc` is **not** an "architectural trade-off" — do not bring back a HOLD reframed as an accepted trade-off, and do not report gates green on an **uncommitted** tree (HEAD is still the D1 commit `6278b90`; the whole mobile data layer is untracked — **commit it**). **(1) D2-TS-1:** mobile `tsc` exits 2. `components/data-states.tsx` was changed to `style?: unknown` (worse). Fix `Skeleton` to `import type { StyleProp, ViewStyle, DimensionValue } from "react-native"`, type `width?: DimensionValue; height?: DimensionValue; style?: StyleProp<ViewStyle>`. tsc → 0, no `unknown`/`any`. **(2) D2-PATH-1:** you fixed the chat/models/analytics/logs paths (good) but **not** the central CRUD path that actually 404s. Both `lib/api.ts` (mobile + web, keep mirrored) still call `/api/${entity}` — server is `/api/cms/${plural}`. Prepend `/cms` to the 5 generic verbs only (`list/get/create/update/remove`); leave `post`/`getRaw`. **Housekeeping:** delete `docs/D2_ANALYSIS_API_CONTRACT_MISMATCH.md` and `docs/D2_FINAL_GATE_REPORT.md` (stale/misleading). Then **commit** and re-gate on the committed tree: frozen install 0, mobile+web tsc 0, web build, `git grep '/api/${entity}'` → 0, oklch 0, color/any-gate 0, expo-doctor/export — and (once the architect supplies device API URL + real session) `GET /api/cms/workflows` → 200. Report on the committed tree; I re-audit before D3/D4/D5. **Do not fan out the feature WPs.**

---

*JARVIS v1.5 Phase D / D2 Fix Loop 2 — © 2026 Kidus Abdula / VersaLabs Studio.*
