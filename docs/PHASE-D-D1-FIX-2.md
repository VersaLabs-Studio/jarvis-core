# JARVIS v1.5 — Phase D / D1 Gate Audit: **HOLD** (Fix Loop 2)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — device audit on `feat/d-scaffold-design` @ `866ef6d`.
> **To:** Orchestrator → Execute → re-gate (incl. **mandatory S25 Ultra render**) → **then** D2.
> **Verdict:** ❌ **HOLD.** The scaffold compiles but is **runtime-broken** (raw `oklch()` rejected by RN → 8 colour errors, default-light nav chrome) **and** does not meet P4 (flat/generic). Two jobs in one loop: kill the oklch leak *correctly* (via a token module), and implement the **Premium Design System** (`docs/PHASE-D-DESIGN-SYSTEM.md`).
> **Date:** June 2026.

---

## 0. Why this is held — the report was false again

Fix-Loop-1 reported *"Converted all oklch() to hex"* and *"color-gate 0."* **Both were misleading.** On the device (screenshots in `apps/mobile/assets/`) the app throws `"oklch(0.65 0 0)" is not a valid color or brush` **×8**, the header + tab bar render in **default light theme**, and icons are missing (empty grey circles).

**Root cause:** only the `tailwind.config.js`/`global.css` token *definitions* were converted. **14 inline `oklch()` literals passed as JS colour props** were missed — these bypass NativeWind entirely and hit RN's native colour parser raw:

| File | Lines | Props |
|---|---|---|
| `app/(tabs)/_layout.tsx` | 34,35,37,38,50,52 | `tabBar*TintColor`, `tabBarStyle.bg`, `borderTopColor`, `headerStyle.bg`, `headerTintColor` → **this is the light-chrome bug** |
| `app/(tabs)/settings.tsx` | 35,46,96,97,99 | Icon `color`, ChevronRight `color`, Switch `trackColor`×2, `thumbColor` |
| `app/(tabs)/chat.tsx` | 127,137 | `placeholderTextColor`, Send icon `color` |
| `app/(tabs)/workflows.tsx` | 26 | StatusBadge icon `color` |

**And the colour-gate is itself defective:** it greps for `hex/rgb`, so `oklch(` literals scored 0. The gate must also forbid `oklch(`.

This is the same "report ≠ reality" gap as PB-LOCK-1 / PC-LOCK-1 — caught only by running it. Per the build-integrity rule, a per-WP "green" is not proof of shippability.

---

## 1. BLOCKERS — all green before D2

### D1-OKLCH-2 — kill every inline `oklch()`, via a token module 🔴
Do **not** hand-patch 14 call-sites with hex. Create the single source of truth and route both colour channels through it (full spec: DESIGN-SYSTEM §1):
1. Create **`apps/mobile/theme/colors.ts`** exporting the hex/rgba `colors` object (values in DESIGN-SYSTEM §1/§8).
2. `tailwind.config.js` → `require("./theme/colors")`; map tokens to `colors.*` (no duplicate hex literals).
3. Replace every JS colour prop (`_layout.tsx`, `settings.tsx`, `chat.tsx`, `workflows.tsx`) with `colors.*` imports.
**Proof:** `grep -rn "oklch(" app components theme` → **0 matches**; runtime toast gone on device.

### D1-CHROME-1 — nav chrome must be dark + safe-area 🔴
Consequence of D1-OKLCH-2 plus the safe-area fix (DESIGN-SYSTEM §4.1):
- `Tabs.screenOptions` colours from `colors`; `tabBarStyle` bottom padding from `useSafeAreaInsets().bottom` (not hardcoded `28`) → labels no longer clipped on the S25's gesture bar.
- `headerShown:false` on the Tabs + a custom **`ScreenHeader`** (large title, hairline divider). Minimum-bar fallback: native header themed dark via `colors`. Custom is the target.
**Proof:** header + tab bar dark on device; labels fully visible.

### D1-GATE-1 — fix the mobile colour-gate 🔴
The gate that scored "0" is blind to `oklch(`. Update the mobile colour-gate to fail on **any** of: raw `#hex`, `rgb(`/`rgba(` **and `oklch(`/`hsl(`** in `app/**` and `components/**` *component* code — the only sanctioned colour source is `colors.ts` (allow-listed) + tailwind tokens via `className`. Re-run → 0.

### D1-LOCK-3 — re-commit the lockfile 🔴
`pnpm-lock.yaml` is currently **modified-uncommitted** in the working tree (from `866ef6d` react-native-css-interop). Adding `theme/colors.ts` changes nothing in deps, but **any** `package.json` touch (none expected here) must regenerate + commit the lockfile in the same WP. Re-gate `frozen install` must be EXIT 0 on a clean tree — lockfile drift has broken **every** prior phase. Commit the pending `pnpm-lock.yaml` now.

---

## 2. PREMIUM UI — implement the design system (P4, in this loop)

Implement `docs/PHASE-D-DESIGN-SYSTEM.md` across the four scaffolded screens. This is in-scope for D1 (its charter is the RN design system). Required:

- **§2 Elevation** — card surface (surface bg + hairline border + shadow/elevation, radius 20) applied to StatCard, WorkflowCard, SettingItem groups, chat input bar. Kill the flat look.
- **§3 Typography** — the scale; **numbers/URLs/IDs in Fira Code** (`font-mono`, currently unused).
- **§4 Anatomy** — StatCard (label/value/dot + accent icon chip), **StatusBadge semantic + tinted-subtle** (emerald/accent/red/grey dots — not all blue), WorkflowCard outline-accent action, Chat empty-halo + bubbles + elevated input, SettingItem tinted icon chips.
- **§5 Data-states** — build shared `components/data-states.tsx` (Skeleton/Empty+CTA/Error+retry/mount-motion) for D3/D4/D5 reuse.
- **§6 Motion** — screen fade+rise, list stagger (`index*45`), press scale 0.97, Running-dot pulse.
- **Accent restraint** — accent only on primary action + active/live; everything else neutral.

---

## 3. MINOR — same loop

- **D1-MONO-1:** wire `font-mono` (Fira Code) where the design calls for it — it's loaded but never used. (Folded into §3 above.)
- Confirm `react-native-safe-area-context` is installed (needed for `useSafeAreaInsets`); it ships with Expo Router but verify it's in `package.json` — if added, regenerate the lockfile (D1-LOCK-3).

---

## 4. Re-gate criteria (BRAIN re-runs on the fixed branch)

```
pnpm install --frozen-lockfile          # EXIT 0   (D1-LOCK-3, clean tree)
pnpm -F @jarvis/mobile typecheck         # 0 errors
grep -rn "oklch(\|hsl(" apps/mobile/app apps/mobile/components apps/mobile/theme  # 0 (token file is hex/rgba only)
<mobile color-gate>                      # 0  (now also forbids oklch/hsl — D1-GATE-1)
npx expo-doctor                          # clean
# + MANDATORY device pass on S25 Ultra (DESIGN-SYSTEM §7 checklist):
#   no colour-error toast · dark chrome · layered cards w/ depth ·
#   semantic status badges · accent restraint · icons render · Fira Code numbers · motion
```
**The device render is the gate** — it's the only thing that proved Loop 1 false. Report back with **fresh screenshots** of all four tabs. All green → D1 PRs into `phase/d-mobile`, **then** D2 opens.

---

## 5. Fix-loop relay (paste to Orchestrator)

> **Orchestrator — D1 is HELD (Fix Loop 2): the scaffold is runtime-broken and not premium.** The Loop-1 "oklch→hex" fix missed 14 inline `oklch()` JS colour props (nav `screenOptions`, Icon/Switch/TextInput `color` props) — RN rejects them → 8 runtime colour errors + default **light** header/tab bar + missing icons; the colour-gate scored 0 only because it greps hex, not `oklch(`. **Apply `docs/PHASE-D-D1-FIX-2.md` + implement `docs/PHASE-D-DESIGN-SYSTEM.md` on `feat/d-scaffold-design`.** Blockers: **D1-OKLCH-2** (create `theme/colors.ts` single source; `tailwind.config.js` + all JS colour props import it; grep `oklch(` → 0), **D1-CHROME-1** (dark nav chrome via `colors` + safe-area tab padding; custom `ScreenHeader`), **D1-GATE-1** (colour-gate must also fail on `oklch(`/`hsl(`), **D1-LOCK-3** (commit the pending `pnpm-lock.yaml`; frozen install EXIT 0). Then implement the **Premium Design System** (elevation/hairline cards, type scale + Fira Code numbers, semantic tinted-subtle status badges, accent restraint, shared data-states, Moti motion) across all four tabs. Re-gate: frozen install 0, tsc 0, grep oklch 0, colour-gate 0, expo-doctor clean, **and boot on the S25 Ultra — send fresh screenshots of all 4 tabs**. I re-audit before D2. Do **not** start D2 yet.

---

*JARVIS v1.5 Phase D / D1 Fix Loop 2 — © 2026 Kidus Abdula / VersaLabs Studio.*
