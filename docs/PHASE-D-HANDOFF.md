# JARVIS v1.5 — Phase D Dispatch (Expo Mobile App)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — Phase C audited & merged.
> **To:** Orchestrator → Execute (D1 → D2 → D3∥D4∥D5 → D6) → Code Review → Auditor
> **Branch line:** `develop` → `phase/d-mobile` → `feat/d-*`
> **Gate per WP:** Code Review 0 blockers + **Auditor ≥ 8.5** + **color-gate = 0** → PR into `phase/d-mobile`. Never `main`.
> **Spec of record:** `docs/PART3-CLIENT-APPLICATIONS.md` §3.2 (factory data layer) + §3.5 (mobile screens). **Date:** June 2026.

---

## 0. PRECONDITION — Phase C ✅ CLEARED, merged to `develop`

**Phase C passed the gate (re-audited GREEN on the merged branch) and is merged to `develop`** (merge `7a80ded`, pushed). Fix Loop 1 closed all 4 blockers + the WS high-sev + a build-fix; BRAIN re-verified: `frozen install` EXIT 0, `tsc` 0 errors, `next build` 14/14 static, color-gate 0, any-gate 0, no service-role in browser. **Auditor 9.0/10.** `main` already carries A+B via your PR #1; `develop → main` for C is your manual call when you choose. **Phase D is GO** — branch off `develop`.

---

## 1. Phase D scope & dependencies

Phase D is the **Expo mobile app** (`apps/mobile`, currently empty — fresh build). It is the **second client on the same contract**: it reuses `@jarvis/shared` types + the **same** query-key factory and generic hooks as web — **only the transport (fetch+SecureStore) and storage adapters differ** (PART3 §3.2 final note, §3.5). Four tabs.

| WP | Branch | Scope | Dep |
|----|--------|-------|-----|
| **D1** | `feat/d-scaffold-design` | Expo (SDK 52+, expo-router) app scaffold + nav shell (4 tabs) + the OKLCH **dark** token system ported to RN (token constants / NativeWind), typography, motion primitives (Reanimated/Moti). **color-gate: zero raw hex in components.** | — |
| **D2** | `feat/d-data-layer` | The mobile data layer reusing **`@jarvis/shared`'s `keys` factory + `ListOpts`** (P2/P6): `lib/api.ts` (Bearer from the SecureStore-backed Supabase session), `hooks/use-entity.ts` (RN variant — same `useList/useDoc/useCreate/useUpdate/useDelete`, native toast/haptic instead of web `sonner`), `lib/websocket.ts` (B5 handshake). **Imports the shared factory — no inline re-implementation (closes PC-DRY-1).** | D1 + B-API ✅ |
| **D3** | `feat/d-dashboard-settings` | **Dashboard** tab (StatCards 2×2, ServiceHealthList, RecentActivity FlatList, pull-to-refresh) + **Settings** tab (server URL, notifications toggle, theme=dark, about/version, logout) | D2 |
| **D4** | `feat/d-chat` | **Chat** tab (primary): ChatBubble list, TextInput+Send, QuickCommandChips (h-scroll), SessionPicker, **WS streaming**; **Voice** (Expo Audio → STT → chat) + **Haptics** on send | D2 + B5 ✅ |
| **D5** | `feat/d-workflows` | **Workflows** tab: WorkflowCard list, one-tap trigger, StatusBadge, RunHistory | D2 |
| **D6** | `feat/d-native-platform` | Cross-cutting native: **Push** (Expo Notifications wired to the WS `notification` event), **SecureStore** session persistence, **deep linking** `jarvis://chat/session/:id`, Haptics integration | D2 + D4 |

**Sequence:** `D1 → D2 → (D3 ∥ D4 ∥ D5) → D6`. D1/D2 strictly serial and gate everything — do not fan out before D2 merges. D6 lands last (it threads into chat sessions + the WS event stream).

---

## 2. Mandatory conditions (Auditor must verify)

- **D-P2-1 (Required) — one data layer, shared factory.** Mobile hooks import `keys` + `ListOpts` from `@jarvis/shared`. No second fetch/CRUD wrapper, no inline re-implementation of the query-key tuples. **This is also the moment to retire PC-DRY-1:** web's `use-entity.ts` should move onto the same shared `keys` factory (fold it in as a small `phase/c`-style addendum or within D2's shared-package touch). One key source, two clients.
- **D-P6-1 (Required) — generated types only.** All entity types from `@jarvis/shared`. Zero hand-authored DTOs, zero `any` (`any-gate`).
- **D-COLOR-1 (Required) — color-gate = 0.** OKLCH semantic tokens only; no raw hex/rgb in RN component code. Hard grep gate.
- **D-WS-1 (Required) — WS matches the B5 contract, with the Phase-C lesson baked in.** On close `4401`, call **`supabase.auth.refreshSession()` once** (NOT `getSession()` — that was PC-WS-1: `getSession()` returns the cached/expired token and never recovers), reconnect on a fresh session, else route to login. Exponential backoff, cap 30s.
- **D-SEC-1 (Required — mobile-critical) — session at rest in SecureStore only.** The Supabase session/refresh token is persisted in **Expo SecureStore** (OS keystore), **never plaintext AsyncStorage**. App ships the **anon key + user session only** — no service-role key, ever. (Carries the C-RLS-1 discipline to device.)
- **D-P4-1 (Required) — four data-view states.** Skeleton (not spinners), empty + CTA, error + retry, mount motion (Reanimated/Moti). Pull-to-refresh on list screens.
- **D-AUTH-1 (Note) — server is source of truth.** Any role-gated UI mirrors the server's 403s; client guard is UX only.

---

## 3. Mobile build-integrity gate (replaces `next build`)

Expo has no `next build`. The re-gate on the **merged** `phase/d-mobile` is:

```
pnpm install --frozen-lockfile          # EXIT 0   (lockfile drift = HOLD — this has bitten A, B, and C)
pnpm -F @jarvis/mobile typecheck         # tsc --noEmit, 0 errors
npx expo-doctor                          # 0 issues  (config/deps sanity)
npx expo export --platform all           # bundles without error (build proxy)
# color-gate / any-gate stay 0
```

Lockfile drift has broken the gate in **every prior phase** — regenerate and commit `pnpm-lock.yaml` whenever `apps/mobile/package.json` changes, in the same WP.

---

## 4. Architect (Kidus) — manual tasks for Phase D

| # | Task | Why |
|---|------|-----|
| **A** | Decide the build target: **Expo Go (dev only)** vs **EAS Build (iOS/Android)** for this phase | Gates whether D6 push needs real APNs/FCM credentials now or can stub against Expo's push service. |
| **B** | If EAS: provide Expo account + (Apple Developer / Google Play) credentials | Needed for `eas build`; can be deferred if Phase D stays Expo Go. |
| **C** | Provide a real operator Supabase session + a test device/simulator | D4/D6 (WS streaming, push, deep link, SecureStore) need on-device E2E, not a mock. |
| **D** | Confirm push scope for v1.5: full Expo Notifications now, or **defer push to a Phase-F polish loop** | Lets D6 ship SecureStore + deep-linking + haptics without blocking on push infra if you'd rather defer it. |

---

## 5. Promotion status

- ✅ **Phase C → `develop`** — done by BRAIN. Merge `7a80ded` (`--no-ff`), pushed to `origin/develop`.
- ✅ **`main`** carries A+B (your PR #1, `ff6c40a`). **`develop → main` for C is your manual call** whenever you want C in production.
- `main` not touched by BRAIN this phase.

---

## 6. Dispatch relay (paste to Orchestrator — GO)

> **Orchestrator — Phase C merged to `develop` (re-audited 9.0/10, all gates green). Open Phase D = Expo Mobile App** (`develop → phase/d-mobile`), per `docs/PHASE-D-HANDOFF.md` and `docs/PART3-CLIENT-APPLICATIONS.md` §3.5. Sequence **D1 (scaffold + RN OKLCH design system) → D2 (mobile data layer reusing `@jarvis/shared` `keys` factory + generic hooks; closes PC-DRY-1) → D3∥D4∥D5 (Dashboard+Settings, Chat+Voice, Workflows) → D6 (push + SecureStore + deep-link + haptics)** — do **not** fan out before D2 merges. Hard gates: **one** shared data layer (no second wrapper, no inline keys), generated `@jarvis/shared` types only (zero `any`), **color-gate = 0**, WS client uses **`refreshSession()`** once on `4401` (the PC-WS-1 lesson — not `getSession()`), **session at rest in Expo SecureStore only / no service-role key on device**, four data-view states. Re-gate on the merged branch: `frozen install` EXIT 0, `tsc` 0 errors, `expo-doctor` clean, `expo export` bundles, gates 0. Per WP: Code Review 0 blockers → Auditor ≥ 8.5 → PR into `phase/d-mobile`. Never `main`. Report at each WP gate — first BRAIN checkpoint is **D2** (the shared-contract adapter), then the phase gate on the merged branch.

---

*JARVIS v1.5 Phase D Dispatch — © 2026 Kidus Abdula / VersaLabs Studio.*
