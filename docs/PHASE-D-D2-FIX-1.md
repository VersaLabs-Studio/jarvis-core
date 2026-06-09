# JARVIS v1.5 — Phase D / D2 Gate Audit: **HOLD** (Fix Loop 1)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — BRAIN checkpoint on the working tree of `feat/d-data-layer` (uncommitted; HEAD still `6278b90`).
> **To:** Orchestrator → Execute → re-gate → **then** D3∥D4∥D5.
> **Verdict:** ❌ **HOLD.** The architecture is right (shared factory, SecureStore adapter, WS refresh — all correct), but **mobile `tsc` fails** and the **client↔server API path contract is mismatched** — every CRUD call 404s against the live API. Do **not** fan out D3/D4/D5.
> **Date:** June 2026.

---

## 0. What's genuinely right (keep it — this is good work)

- **D-P2-1 shared factory:** mobile `hooks/use-entity.ts` imports `keys` + `ListOpts` from `@jarvis/shared`, zero inline tuples. Web's `use-entity.ts` migrated onto the same factory — **PC-DRY-1 is genuinely closed.** One key source, two clients. ✅
- **D-SEC-1 SecureStore:** `lib/supabase.ts` chunking adapter is careful — cleanup-before-set, chunk-count sentinel, corrupt-chunk recovery; anon key only; `detectSessionInUrl:false`. **No service-role anywhere on device** (grep 0). ✅
- **D-WS-1:** `lib/websocket.ts` `4401` → `refreshSession()` **once** (guarded by `refreshed` flag), reconnect on fresh session else error; backoff capped 30s. The PC-WS-1 lesson is correctly baked in. ✅
- **D-P6-1:** any-gate logic intact (the `any-gate.ts` diff is a cosmetic `console.error` string fix, not a weakening). QueryClientProvider wired in `app/_layout.tsx`. ✅
- The singular→plural key rename direction is **correct** — it aligns with the entity registry's `.plural` field (see §2).

This is the closest a loop has come. Two things block it.

---

## 1. BLOCKER — mobile typecheck fails (report said "Pass"; it does not) 🔴

**D2-TS-1** — `components/data-states.tsx:11`:
```
error TS2503: Cannot find namespace 'ReactNative'.
```
The `Skeleton` prop type is `style?: React.CSSProperties | ReactNative.ViewStyle`. Two errors in one line:
- `ReactNative.ViewStyle` — there is no `ReactNative` namespace. Introduced by the "any-fix" in this loop.
- `React.CSSProperties` — a **web/DOM** type; wrong for React Native.

**Fix:** `import type { StyleProp, ViewStyle } from "react-native"` and type it `style?: StyleProp<ViewStyle>`. Drop `React.CSSProperties` entirely. Re-run `pnpm -F @jarvis/mobile typecheck` → must be **0**.

> Process note: the gate report claimed mobile tsc passed. It exits 2. Re-state: **a gate isn't green until BRAIN re-runs it on the committed tree.** Also — **commit the work**: HEAD is still the D1 commit; all D2 files are uncommitted. The report graded a dirty working tree.

---

## 2. BLOCKER — client↔server API path contract mismatch (both clients 404) 🔴

**D2-PATH-1.** This is the high-value catch. The data layer is wired to the wrong paths and **no client has ever hit the live API** to expose it (the live-session manual task has been pending since Phase C — so this has been latent, not introduced by D2).

**Server (source of truth — `apps/api/src/factory/crud.ts`, Phase B, merged):** the CRUD factory registers every entity at
```
/api/cms/${plural}            e.g.  GET /api/cms/workflows ,  /api/cms/chat_sessions ,  /api/cms/workflow_runs
```
**Clients (web AND mobile `lib/api.ts`):** build paths as
```
/api/${entity}                e.g.  GET /api/workflows
```
There is **no Next rewrite** in `apps/web` masking this (verified). So both clients currently 404 on every CRUD call against the live server. Mobile is simply the first client about to be pointed at the live API on-device (your manual task A), so it surfaces now.

**Also mismatched — chat messages:**
- client (`use-chat.ts`): `GET /api/chat_sessions/${id}/messages`
- server (`routes/chat/messages.ts`): `GET /api/chat/sessions/${id}/messages`

**Resolution (server is the contract — it's merged and deliberate; `/api/cms/*` is a namespaced CRUD surface separate from `/api/auth`, `/api/admin`, `/api/secrets`):**
1. Align **both** `lib/api.ts` clients (mobile + web) to `/api/cms/${entity}` for the generic CRUD verbs. Keep the two clients **mirrored** — same change, both files, same WP.
2. Fix the chat-messages path in `use-chat.ts` to `/api/chat/sessions/${id}/messages`.
3. The non-CRUD entities in the `keys` factory (`services`, `secrets`, `models`, `analytics_events`, `system_logs`) are **not** `/api/cms/*` resources — they have bespoke routes (`/api/secrets`, `/api/analytics`, …). They must **not** be routed through `api.list(entity)`’s `/api/cms/` path. Either give them dedicated `getRaw` calls or document that the generic hooks serve only the 5 registry entities. Flag which screens consume them so D3/D5 wire them correctly.

**Verification — this is why your manual tasks now matter (see §4):** apply the fix, then run **one authenticated smoke call** against the live API (`GET /api/cms/workflows` with a real Bearer) and confirm `200` + payload shape. We have shipped two phases of data layer with **zero** live calls; this contract bug is the direct result. A 30-second curl settles it definitively rather than us reasoning about prefixes.

---

## 3. MINOR — note, not gating

- **D2-FEEDBACK-1:** `use-entity.ts` `notify.success` is haptic-only (silent), errors use `Alert` + haptic; the toast lib was deferred to D6. Acceptable for D2 — but make sure D6 actually lands a real toast; silent success is fine on mobile, a blocking `Alert` on every error is not (swap to toast in D6).
- **D2-DEL-1:** `useDelete` is non-generic (`useDelete(entity)`) — matches web, fine; noted only for symmetry.

---

## 4. Architect (Kidus) — now blocking, not optional

These were "pending" through D1; **D2 cannot be proven without them**, and D2-PATH-1 is the proof they were always needed:

| # | Task | Why it's now required |
|---|------|------|
| **A** | Provide the **device-reachable API URL** (`EXPO_PUBLIC_API_URL` = your machine's LAN IP `http://192.168.x.x:4000`, or a hosted URL) | Without it the S25 can't reach the API at all; with it we can run the §2 smoke test that settles D2-PATH-1. |
| **B** | Provide a **real operator Supabase session** (login creds or seeded session) + `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` | Needed to: prove the SecureStore round-trip (set → kill app → relaunch → still authed), the 4401→refresh path, and the authenticated CRUD smoke call. |

Until A+B exist, D2 can pass *static* gates but cannot be **proven live** — and "passes static, breaks live" is the exact failure mode this loop caught.

---

## 5. Re-gate criteria (BRAIN re-runs on the COMMITTED tree)

```
git status                              # clean — D2 work committed (not a dirty tree)
pnpm install --frozen-lockfile          # EXIT 0
pnpm -F @jarvis/mobile typecheck         # 0 errors (D2-TS-1)
pnpm -F @jarvis/web typecheck            # 0 errors (path change must not regress web)
pnpm -F @jarvis/web build                # succeeds
git grep -nE "oklch\(|hsl\(" apps/mobile/{app,components,lib,hooks,theme}  # 0
pnpm color-gate ; pnpm any-gate          # 0 / 0
npx expo-doctor                          # clean
npx expo export --platform all           # bundles
# + LIVE (needs A+B): one authenticated GET /api/cms/workflows → 200 + payload  (D2-PATH-1 proof)
```
All static green **and** the live smoke call confirmed → D2 PRs into `phase/d-mobile`, **then** D3∥D4∥D5 open.

---

## 6. Fix-loop relay (paste to Orchestrator)

> **Orchestrator — D2 is HELD. Architecture is right (shared factory, SecureStore adapter, WS refresh — all correct, PC-DRY-1 closed), but two blockers.** **(1) D2-TS-1:** mobile `tsc` fails — `components/data-states.tsx:11` uses a non-existent `ReactNative.ViewStyle` namespace + web-only `React.CSSProperties`; fix to `import type { StyleProp, ViewStyle } from "react-native"` → `style?: StyleProp<ViewStyle>`; tsc must hit 0. The "mobile typecheck pass" in the report was false, and the work is **uncommitted** (HEAD is still D1) — commit it. **(2) D2-PATH-1 (contract bug, both clients):** server CRUD routes are `/api/cms/${plural}` (e.g. `/api/cms/workflows`, `/api/cms/chat_sessions`) but both `lib/api.ts` clients call `/api/${entity}` — no Next rewrite masks it, so every CRUD call 404s live. Align **both** mobile + web `lib/api.ts` to `/api/cms/${entity}` (keep them mirrored), and fix the chat path in web `use-chat.ts` to `/api/chat/sessions/${id}/messages`. Non-CRUD keys (`services/secrets/models/analytics_events/system_logs`) are NOT `/api/cms` resources — route them via dedicated `getRaw` calls, not the generic hook. Re-gate on the **committed** tree: frozen install 0, mobile+web tsc 0, web build, grep oklch 0, color/any-gate 0, expo-doctor clean, expo export bundles — **and** (once the architect supplies the device API URL + a real session) one authenticated `GET /api/cms/workflows` → 200. Report back; I re-audit before D3/D4/D5. **Do not fan out the feature WPs yet.**

---

*JARVIS v1.5 Phase D / D2 Fix Loop 1 — © 2026 Kidus Abdula / VersaLabs Studio.*
