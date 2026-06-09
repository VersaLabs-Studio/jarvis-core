# JARVIS v1.5 — Phase D Dispatch: **D2 Foundation Patch (WP-0) + D3 ∥ D4 ∥ D5**

> **From:** Kidus Abdula (Architect / Opus BRAIN) — re-audit of `feat/d-data-layer` complete; rolling the two residual D2 fixes forward into this handoff per architect direction ("give it a pass, append to next handoff, apply in parallel").
> **To:** Orchestrator → **WP-0 (serial, commit first)** → then fan out **D3 ∥ D4 ∥ D5** → D6.
> **Branch line:** `develop` → `phase/d-mobile` → `feat/d-*`. **Gate per WP:** Code Review 0 blockers + Auditor ≥ 8.5 + color-gate 0 → PR into `phase/d-mobile`. Never `main`.
> **Spec of record:** `docs/PHASE-D-HANDOFF.md` §1–§3, `docs/PART3-CLIENT-APPLICATIONS.md` §3.5. **Date:** June 2026.

---

## 0. Why there's a WP-0 (read first — this is the one correction to "apply in parallel")

D2's data layer is **~90% correct and worth keeping** — SecureStore adapter (D-SEC-1), WS `refreshSession()` (D-WS-1), shared `keys` factory (D-P2-1, PC-DRY-1 closed) all verified green. It is **two files** away from a clean baseline. But those two files are the **foundation D3/D4/D5 stand on**, so they cannot be deferred to "parallel later":

- Every D3/D4/D5 screen calls `api.list/get/create/...`. Mobile's client still builds `/api/${entity}` → **every call 404s**. Feature WPs built on it are dead on arrival.
- `data-states.tsx` (the shared Skeleton/Empty/Error states **every** screen renders) **fails `tsc`** → every parallel WP fails its own typecheck gate on a red baseline.

You can't parallelize *past* a broken foundation — the parallel work sits *on top of* it. **But both fixes are tiny, mechanical, and fully specified below.** So the resolution that honors "roll it forward, run in parallel" is: **WP-0 = a ~5-minute foundation patch the Orchestrator applies and commits FIRST, then immediately fans out D3∥D4∥D5 on the now-green baseline.** D2 effectively becomes the first commit of this handoff. Nothing loops; nothing waits on a separate audit cycle.

What *genuinely* rolls forward as deferred (not blocking fan-out): the **live authenticated smoke call** (needs manual tasks below) — that's verification, run at the phase gate, not a code fix.

---

## 1. WP-0 — D2 Foundation Patch (SERIAL · commit before fan-out · `feat/d-data-layer`)

Four mechanical items. No design decisions. Apply, gate, **commit**, then open D3/D4/D5.

### F1 — mobile `tsc` → 0  (`apps/mobile/components/data-states.tsx`)
The `unknown` dodge made it worse (2 errors). Fix the `Skeleton` types properly:
```ts
import { View, Text, Pressable, PressableProps, GestureResponderEvent } from "react-native";
import type { StyleProp, ViewStyle, DimensionValue } from "react-native";

export function Skeleton({
  className, width, height, style,
}: {
  className?: string;
  width?: DimensionValue;     // was number | string  → RN wants DimensionValue
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>; // was unknown
}) { /* body unchanged */ }
```
`pnpm -F @jarvis/mobile typecheck` → **0**. No `unknown`, no `any`, no `React.CSSProperties`.

### F2 — mobile CRUD path → `/api/cms/`  (`apps/mobile/lib/api.ts`)
Web's `lib/api.ts` was already fixed correctly; **mobile was missed.** Mirror it exactly — prepend `/cms` to the 5 generic verbs only:
```ts
list:   `/api/cms/${entity}${params}`
get:    `/api/cms/${entity}/${id}`
create: `/api/cms/${entity}`
update: `/api/cms/${entity}/${id}`
remove: `/api/cms/${entity}/${id}`
```
Leave `post(path)` / `getRaw(path)` untouched (full paths; bespoke chat/models/analytics/logs routes are already correct in web — verify mobile screens use the same dedicated routes for non-CRUD keys, never `/api/cms/` for `services`/`secrets`/`models`/`analytics_events`/`system_logs`).

### F3 — commit the mobile data layer
`apps/mobile/hooks/` and `apps/mobile/lib/` are still **untracked** (HEAD is `6278b90`, the D1 commit — four reports have graded a dirty tree). Stage and commit the whole D2 mobile layer + F1/F2 + web's `/api/cms/` fix in one Conventional Commit, e.g. `fix(d-data-layer): align mobile CRUD to /api/cms, fix data-states typing, commit mobile data layer`.

### F4 — delete stray docs (housekeeping)
Remove the 6 mesh-generated `D2_*` files (`D2_ANALYSIS_API_CONTRACT_MISMATCH.md`, `D2_EXECUTIVE_SUMMARY.md`, `D2_FINAL_GATE_REPORT.md`, `D2_FIX_ANALYSIS_CORRECTED.md`, `D2_FIX_SUMMARY.md`, `D2_IMPLEMENTATION_GUIDE_CORRECT_FIX.md`). They duplicate this doc and assert a "merge ready" state that isn't real. The authoritative D-series docs are `PHASE-D-D2-FIX-2.md` (closed by this patch) and this file.

**WP-0 exit gate (BRAIN re-runs on the COMMITTED tree):**
```
git status                            # clean
git log --oneline -1                   # HEAD is the new commit, not 6278b90
pnpm install --frozen-lockfile         # EXIT 0
pnpm -F @jarvis/mobile typecheck        # 0   (F1)
pnpm -F @jarvis/web typecheck           # 0
git grep -nF "/api/${entity}" apps      # 0   (F2 — proves both clients on /api/cms/)
pnpm color-gate ; pnpm any-gate         # 0 / 0
npx expo-doctor ; npx expo export --platform all
```
Green → D2 baseline is clean → **fan out D3 ∥ D4 ∥ D5.**

---

## 2. D3 ∥ D4 ∥ D5 — parallel feature WPs (per `PHASE-D-HANDOFF.md` §1)

All three branch off `phase/d-mobile` after WP-0 commits. Each carries the mandatory conditions in §3.

| WP | Branch | Scope | Key surfaces it consumes |
|----|--------|-------|--------------------------|
| **D3** | `feat/d-dashboard-settings` | **Dashboard** tab: StatCards 2×2, ServiceHealthList, RecentActivity FlatList, pull-to-refresh. **Settings** tab: server URL, notifications toggle, theme=dark, about/version, logout. | `api.list("workflows" / "workflow_runs")`; bespoke `services` health route via `getRaw`; logout → `supabase.auth.signOut()` + SecureStore clear. |
| **D4** | `feat/d-chat` | **Chat** tab (primary): ChatBubble list, TextInput+Send, QuickCommandChips (h-scroll), SessionPicker, **WS streaming**. **Voice** (Expo Audio → STT → chat) + **Haptics** on send. | `api.list("chat_sessions")`; messages via `getRaw('/api/chat/sessions/${id}/messages')`; `lib/websocket.ts` `chat:*` events. |
| **D5** | `feat/d-workflows` | **Workflows** tab: WorkflowCard list, one-tap trigger, StatusBadge, RunHistory. | `api.list("workflows")`; trigger via `post('/api/workflows/${id}/trigger')` (bespoke, NOT `/api/cms/`); `api.list("workflow_runs")`. |

> **Non-CRUD routing reminder (carries the D2-PATH lesson):** the generic `api.list/get/...` (`/api/cms/`) serves only the 5 registry CRUD entities (`workflows`, `integrations`, `skills`, `chat_sessions`, `workflow_runs`). Workflow **trigger**, chat **messages/stream**, **services** health, **analytics**, **logs**, **models** are bespoke routes — call them via `post`/`getRaw` with their own paths. Any feature WP that pipes a non-CRUD key through `/api/cms/` is a blocker.

**D6 stays last** (push + SecureStore persistence E2E + deep-link `jarvis://chat/session/:id` + haptics) — threads into D4's chat sessions + the WS `notification` event. Do not start before D3/D4/D5 gate.

---

## 3. Mandatory conditions every WP is audited against (from `PHASE-D-HANDOFF.md` §2)

- **D-P2-1** — one shared data layer; hooks import `keys` + `ListOpts` from `@jarvis/shared`; no second wrapper, no inline key tuples.
- **D-P6-1** — generated `@jarvis/shared` types only; zero `any` (`any-gate`).
- **D-COLOR-1** — color-gate = 0; tokens from `theme/colors.ts` only; **no `oklch(`/`hsl(`** in RN code; no raw hex in components. (Carries the D1 lesson — gate now greps `oklch(`/`hsl(` too.)
- **D-WS-1** — on WS close `4401`, `supabase.auth.refreshSession()` **once**, reconnect on fresh session else login; backoff cap 30s.
- **D-SEC-1** — session at rest in Expo SecureStore only (never plaintext AsyncStorage); anon key + user session only, **no service-role on device**.
- **D-P4-1** — four data-view states on every data screen: Skeleton (not spinner), empty + CTA, error + retry, mount motion; pull-to-refresh on lists.

---

## 4. Architect (Kidus) — manual tasks (now gate the PHASE, not WP fan-out)

Per the WP-0 reframing, these no longer block opening D3/D4/D5 — they block the **phase gate** (merging `phase/d-mobile` → `develop`), where the data layer must be proven live once:

| # | Task | Needed for |
|---|------|-----------|
| **A** | Device-reachable `EXPO_PUBLIC_API_URL` (LAN IP `http://192.168.x.x:4000` or hosted) | The live smoke call + on-device D4/D6 E2E. |
| **B** | Real operator Supabase session + `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` | SecureStore round-trip, 4401→refresh, authenticated CRUD. |
| **C** | Build target: Expo Go (dev) vs EAS; push scope for v1.5 (now vs Phase-F) | D6 push infra (can defer per `PHASE-D-HANDOFF.md` §4). |

**Phase gate adds one decisive step:** authenticated `GET /api/cms/workflows` → **200 + payload**. Two phases of data layer have shipped with zero live calls; this is the proof that ends it.

---

## 5. Relay (paste to Orchestrator)

> **Orchestrator — D2 is rolled forward, not re-looped.** First run **WP-0 (serial, commit before fanning out)** on `feat/d-data-layer`: **(F1)** fix `apps/mobile/components/data-states.tsx` — `import type { StyleProp, ViewStyle, DimensionValue } from "react-native"`, type `width?: DimensionValue; height?: DimensionValue; style?: StyleProp<ViewStyle>`; mobile `tsc` → 0, no `unknown`/`any` (a red `tsc` is NOT a "trade-off"). **(F2)** fix `apps/mobile/lib/api.ts` — web was corrected but **mobile was missed**; prepend `/cms` to the 5 generic verbs (`list/get/create/update/remove` → `/api/cms/${entity}`), leave `post`/`getRaw`. **(F3)** the mobile data layer (`apps/mobile/hooks/`, `apps/mobile/lib/`) is still **untracked** — commit it (HEAD is still the D1 commit; four reports graded a dirty tree). **(F4)** delete the six stray `docs/D2_*.md` files. Re-gate on the **committed** tree: frozen install 0, mobile+web `tsc` 0, `git grep -F '/api/${entity}' apps` → 0, color/any-gate 0, expo-doctor/export clean. **Then fan out D3 ∥ D4 ∥ D5** per `docs/PHASE-D-D3D4D5-HANDOFF.md` §2 (Dashboard+Settings / Chat+Voice / Workflows) under the §3 mandatory conditions — generic CRUD via `/api/cms/`, bespoke routes (workflow trigger, chat messages, services/analytics/logs/models) via `post`/`getRaw`. Per WP: Code Review 0 blockers → Auditor ≥ 8.5 → PR into `phase/d-mobile`. Never `main`. The live `GET /api/cms/workflows → 200` check is the **phase gate** (needs the architect's device URL + session), not a fan-out blocker. Report WP-0 on the committed tree first; I verify before D3/D4/D5 land.

---

*JARVIS v1.5 Phase D — D2 Foundation Patch + D3∥D4∥D5 Dispatch — © 2026 Kidus Abdula / VersaLabs Studio.*
