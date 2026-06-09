# JARVIS v1.5 — Phase D / D2 Dispatch: Mobile Shared Data Layer

> **From:** Kidus Abdula (Architect / Opus BRAIN) — D1 **APPROVED 9.0/10** on `feat/d-scaffold-design @ 6278b90` (re-audited green: frozen install EXIT 0, tsc 0, grep oklch 0, color-gate 0 + gate hardened, dark large-title chrome, device-confirmed).
> **To:** Orchestrator → Execute (D2) → Code Review → Auditor.
> **Branch:** `phase/d-mobile` → `feat/d-data-layer`. **Gate:** Code Review 0 blockers + **Auditor ≥ 8.5** + color-gate 0 → PR into `phase/d-mobile`. Never `main`.
> **Spec of record:** `docs/PART3-CLIENT-APPLICATIONS.md` §3.2. **Date:** June 2026.

---

## 0. Why D2 is *the* checkpoint

D1 was structure + look. **D2 is the contract.** The entire thesis of two clients is that mobile reuses web's data layer — **same `@jarvis/shared` types, same `keys` query-key factory, same generic hooks** — and *only* the transport (fetch + SecureStore session) and feedback (native toast/haptic vs web `sonner`) differ. If D2 re-implements keys/CRUD inline, the thesis is broken and every later screen drifts. This is the one to get exactly right; D3/D4/D5 all sit on it. **Strictly serial — do not fan out D3/D4/D5 until D2 merges.**

---

## 1. Deliverables (`apps/mobile/`)

| File | What it is | Contract anchor |
|---|---|---|
| `lib/supabase.ts` | RN Supabase client with a **SecureStore** auth storage adapter (anon key only) | D-SEC-1 |
| `lib/api.ts` | Single typed `request<T>()` wrapper + `api.list/get/create/update/remove/post` — **mirror web's surface exactly** | D-P2-1 |
| `hooks/use-entity.ts` | RN generic hooks `useList/useDoc/useCreate/useUpdate/useDelete` — **import `keys` + `ListOpts` from `@jarvis/shared`**, native toast + Haptics on mutation | D-P2-1 / D-P6-1 |
| `lib/websocket.ts` | B5 handshake client; on `4401` → `refreshSession()` **once** | D-WS-1 |
| `providers` wiring | `QueryClientProvider` (TanStack Query) wrapping the app in `app/_layout.tsx` | — |
| **web** `apps/web/src/hooks/use-entity.ts` | **Retire PC-DRY-1**: move web onto the shared `keys` factory (delete inline tuples) | D-P2-1 |

---

## 2. Mandatory conditions (Auditor verifies on the merged branch)

### D-P2-1 — ONE data layer, shared factory (the whole point) 🔴
- `hooks/use-entity.ts` **imports `keys` and `ListOpts` from `@jarvis/shared`** — zero inline `[entity, "list", opts]` tuples. Grep-checkable: `use-entity.ts` must `import { keys } from "@jarvis/shared"`.
- `lib/api.ts` is the **only** fetch wrapper. No ad-hoc `fetch()` in screens (the legit exceptions are the WS client and any SSE — none expected in D2).
- **Close PC-DRY-1 in web too**: `apps/web/src/hooks/use-entity.ts` switches to the shared `keys` factory in this same WP. One key source, two clients. (If the web change risks scope, isolate it to a `feat/d-data-layer` commit touching only `use-entity.ts` + verify web still `tsc`s + `next build`s.)

### D-P6-1 — generated types only, zero `any` 🔴
All entity types from `@jarvis/shared`. No hand-authored DTOs. `any-gate` = 0.

### D-WS-1 — WS matches B5, with the PC-WS-1 lesson baked in 🔴
On close code `4401`: call **`supabase.auth.refreshSession()` once** (NOT `getSession()` — that returns the cached/expired token and never recovers; it bounced web operators to /login). Reconnect only on a fresh session; else route to login. Exponential backoff, **cap 30s**.

### D-SEC-1 — session at rest in SecureStore ONLY (mobile-critical) 🔴
- Supabase `createClient(url, anonKey, { auth: { storage: <SecureStore adapter>, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`.
- The storage adapter wraps **`expo-secure-store`** (`getItem/setItem/removeItem`). **Never `AsyncStorage`** for the session.
- ⚠️ **SecureStore has a ~2048-byte value limit** and the Supabase session token can exceed it → the adapter must **chunk** large values (split on set, reassemble on get) or it will silently fail to persist the session. Verify a real session round-trips (set → kill app → relaunch → still authed).
- Ship the **anon key + user session only**. **No service-role key on device, ever** (carries C-RLS-1 to mobile). Anon key in `app.config`/env is fine; service-role is a hard fail.

### D-COLOR-1 / chrome — keep D1's gates 🔴
color-gate 0 (now forbids `oklch(`/`hsl(`), any-gate 0. Colors only via `theme/colors.ts` (JS props) + tailwind tokens (className).

### D-P4 carry — native feedback
Mutations fire a **native toast + Haptics** (success/error) in place of web's `sonner`. Loading/empty/error states reuse `components/data-states.tsx` from D1 (don't re-implement).

---

## 3. Build-integrity re-gate (merged `phase/d-mobile` — non-negotiable)

```
pnpm install --frozen-lockfile          # EXIT 0  (any new dep → regenerate + commit lockfile SAME WP)
pnpm -F @jarvis/mobile typecheck         # 0 errors
pnpm -F @jarvis/web typecheck            # 0 errors  (PC-DRY-1 web change must not regress)
git grep -nE "oklch\(|hsl\(" apps/mobile/{app,components,lib,hooks,theme}  # 0
pnpm color-gate                          # 0
npx expo-doctor                          # clean
npx expo export --platform all           # bundles (build proxy)
```
New deps expected: `expo-secure-store`, `expo-haptics`, a toast lib (or a Moti toast), TanStack Query if not already present from D1. **Every `package.json` touch regenerates `pnpm-lock.yaml` in the same WP** — lockfile drift has broken every phase; D1 only stayed green because the agent re-committed it.

---

## 4. Architect (Kidus) — manual / config note for D2

| # | Task | Why |
|---|------|-----|
| **A** | **API base URL for a physical device.** Settings shows `http://localhost:4000` — on the S25 over Expo Go, `localhost` resolves to *the phone*, not your dev machine. D2 needs the machine's **LAN IP** (e.g. `http://192.168.x.x:4000`) or the **hosted API URL** to actually fetch. Decide which, and how it's configured (env / Settings field). | Without this, every D2 query fails on-device even though the code is correct. |
| **B** | Provide a real **operator Supabase session** (login creds or a seeded session) | D-SEC-1 round-trip (SecureStore persist) + D-WS-1 (4401 refresh) need a live session to prove on-device, not a mock. |

(Push/EAS still deferred — Expo Go until MVP, full push lands in D6.)

---

## 5. Dispatch relay (paste to Orchestrator — GO for D2)

> **Orchestrator — D1 APPROVED (9.0/10, re-audited green + device-confirmed). Open D2 = Mobile Shared Data Layer** (`phase/d-mobile` → `feat/d-data-layer`), per `docs/PHASE-D-D2-HANDOFF.md` + `PART3 §3.2`. Build: `lib/supabase.ts` (RN client, **SecureStore** auth adapter — chunk values >2KB, anon key only, **never AsyncStorage / never service-role**), `lib/api.ts` (single typed `request<T>()` mirroring web's surface), `hooks/use-entity.ts` (generic `useList/useDoc/useCreate/useUpdate/useDelete` that **import `keys` + `ListOpts` from `@jarvis/shared` — no inline tuples**, native toast + Haptics), `lib/websocket.ts` (B5; on `4401` → `refreshSession()` **once**, not `getSession()` — the PC-WS-1 lesson). **Also close PC-DRY-1:** move web's `use-entity.ts` onto the shared `keys` factory in this WP (verify web still `tsc` + `next build`). Hard gates: one data layer / shared factory imported (grep), generated `@jarvis/shared` types only (zero `any`), color-gate 0, session in SecureStore only / no service-role on device, native feedback via D1's `data-states.tsx`. Re-gate on merged branch: frozen install 0 (regenerate lockfile on any dep add), mobile **and** web tsc 0, grep oklch 0, color-gate 0, expo-doctor clean, expo export bundles. Note for the architect: the device can't hit `localhost:4000` — needs the LAN IP / hosted API URL. **Do not fan out D3/D4/D5 until D2 merges.** Report at the D2 gate — this is the BRAIN checkpoint; I re-audit on the merged branch before D3∥D4∥D5 open.

---

*JARVIS v1.5 Phase D / D2 Dispatch — © 2026 Kidus Abdula / VersaLabs Studio.*
