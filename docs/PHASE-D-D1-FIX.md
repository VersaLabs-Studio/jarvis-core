# JARVIS v1.5 — Phase D / D1 Gate Audit: **HOLD** (Fix Loop)

> **From:** Kidus Abdula (Architect / Opus BRAIN) — BRAIN checkpoint on `feat/d-scaffold-design` @ `b3ae0f5`.
> **To:** Orchestrator → Debug/Execute → re-gate → **then** D2.
> **Verdict:** ❌ **HOLD.** D1 does not meet the gate: **typecheck actually fails** and the **design system does not render at runtime**. Do **not** start D2 — it is strictly serial behind a working D1 scaffold.
> **Date:** June 2026.

---

## 0. Why this is held

A "design-system scaffold" WP has exactly two jobs: **compile** and **render the tokens**. On the real branch it does neither. The report's `typecheck 0 errors` is incorrect — `tsc` exits 2. And NativeWind v4 is missing its two required config files, so every `className` is inert and the app boots **unstyled** in Expo Go. color-gate/any-gate passing (they do: 0/0) cannot catch either — same "report ≠ reality" gap as PB-LOCK-1 and PC-LOCK-1.

**What's genuinely good (keep it):** SDK 56 + expo-router structure, 4-tab nav, fonts bundled locally as real `.ttf` (not CDN), `useFonts` + splash gate wired correctly, Moti/Reanimated present, the **semantic token names** are right, and components use only semantic classes (color-gate 0).

---

## 1. BLOCKERS — all must be green before D2

### D1-TS-1 — typecheck fails: dead `index.ts` imports missing `./App` 🔴
`apps/mobile/index.ts` does `import App from './App'` (bare-workflow template leftover), but `package.json` `"main": "expo-router/entry"` is the real entry — so `index.ts` is **dead code that also breaks `tsc`** (`TS2307: Cannot find module './App'`).
**Fix:** delete `apps/mobile/index.ts` entirely (expo-router/entry is the entry; nothing should import `./App`). Re-run `tsc --noEmit` → must be 0 errors.

### D1-NW-1 — NativeWind v4 not wired → app renders unstyled 🔴
There is **no `metro.config.js` and no `babel.config.js`.** NativeWind v4 requires both; without them, `import "../global.css"` is never processed and `className` produces no styles. The entire D1 deliverable is non-functional on device.
**Fix:** add both:
- `metro.config.js` — `withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" })`.
- `babel.config.js` — `presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"]` (and `react-native-reanimated/plugin` **last** in plugins).
**Proof of fix:** boot on the **S25 Ultra in Expo Go** and confirm the dark tokens + Outfit/Fira fonts actually render. A scaffold gate is not green until it renders styled on the device.

### D1-OKLCH-1 — `oklch()` is a web color space; React Native can't parse it 🔴
RN's native StyleSheet does **not** support `oklch()`. Two leaks:
- `app/_layout.tsx` → `contentStyle: { backgroundColor: "oklch(0.145 0 0)" }` — a **raw RN style** (bypasses NativeWind); will error/no-op on device.
- `tailwind.config.js` + `global.css` define every token as `oklch(...)`. NativeWind's native target cannot be relied on to resolve oklch.
**Fix:** convert the mobile token values to their **hex/rgb equivalents (already in your `// #1a1a1a` comments)** — keep the **same semantic names**. This is the web↔native reconciliation: web keeps OKLCH (browser-native), mobile resolves to hex. The mobile color-gate then means "components use only semantic class names" (already true) — the *token definitions* are hex on native. Replace the inline `contentStyle` oklch with the `background` hex (or drive it via a className/SystemUI).

### D1-LOCK-2 — stray `package-lock.json` in a pnpm workspace 🔴
`apps/mobile/package-lock.json` (230 KB) is committed. This is an **npm** lockfile inside a **pnpm** monorepo — split-brain that invites `npm install` drift (the lockfile class that has broken every prior phase). Root `pnpm-lock.yaml` is authoritative (frozen install passes).
**Fix:** `git rm apps/mobile/package-lock.json` and add `package-lock.json` to `.gitignore`. Never run `npm install` in this repo — only `pnpm`.

---

## 2. MINOR — fix in the same loop (cheap, prevents later drift)

- **D1-TSVER:** `apps/mobile/package.json` pins `typescript: ~6.0.3` and `@types/react: ~19.2.2`, but the workspace resolves **TS 5.9.3** (your pin is a phantom — typecheck ran on 5.9). TS 6.0 isn't a real stable release. **Pin `typescript` to the workspace version (`^5.7.0`/`5.9.x`)** so all packages share one compiler.
- **D1-CRUFT:** remove bare-template cruft that shipped into `apps/mobile/`: `.claude/settings.json`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`. The nested `CLAUDE.md`/`AGENTS.md` can shadow/confuse harness instruction loading. Keep the app dir to source + config.

---

## 3. Re-gate criteria (BRAIN re-runs on the fixed branch)

```
pnpm install --frozen-lockfile        # EXIT 0  (D1-LOCK-2: no stray npm lock)
pnpm -F @jarvis/mobile typecheck       # 0 errors (D1-TS-1)
npx expo-doctor                        # clean   (config sanity — catches missing metro/babel)
# + MANUAL: boot on the S25 Ultra in Expo Go → dark tokens + fonts render (D1-NW-1, D1-OKLCH-1)
# color-gate / any-gate stay 0
```
The device render check is mandatory for this WP — it's the only thing that proves NativeWind + tokens actually work. All green → D1 PRs into `phase/d-mobile`, **then** D2 opens.

---

## 4. Confirmed for the rest of Phase D (your answers — folded in)

- **Build target:** Expo Go until MVP completion → **no EAS / Apple / Google credentials needed now** (D-handoff §4.A/B closed). The gate uses `expo-doctor` + device render, not `eas build`.
- **Push:** **full Expo Notifications is in scope for D6** (not deferred) — D6 wires the push token + the WS `notification` event end-to-end.
- **Device:** **S25 Ultra + Expo Go ready** → D1 render check, and D4/D6 (chat WS, push, deep link, SecureStore) E2E run on it. (D-handoff §4.C closed.)

---

## 5. Fix-loop relay (paste to Orchestrator)

> **Orchestrator — D1 is HELD; the scaffold doesn't compile and doesn't render.** Apply `docs/PHASE-D-D1-FIX.md` on `feat/d-scaffold-design`. **4 blockers:** D1-TS-1 (delete dead `index.ts` — entry is `expo-router/entry`; `tsc` must hit 0), D1-NW-1 (add `metro.config.js` `withNativeWind` + `babel.config.js` `jsxImportSource: nativewind` + reanimated plugin last — NativeWind v4 is non-functional without them), D1-OKLCH-1 (RN can't parse `oklch()`; convert mobile tokens to the hex equivalents already in the comments, keep semantic names, fix the inline `contentStyle` in `_layout.tsx`), D1-LOCK-2 (`git rm apps/mobile/package-lock.json`, gitignore it — pnpm only). **Minor:** pin TS to the workspace `^5.7` (drop the phantom `6.0.3`), remove `apps/mobile/{.claude,AGENTS.md,CLAUDE.md,LICENSE}` cruft. **Re-gate:** `frozen install` EXIT 0, `tsc` 0, `expo-doctor` clean, **and boot on the S25 Ultra in Expo Go — confirm dark tokens + Outfit/Fira fonts render**. Report back with the device confirmation; I re-audit before D2 opens. Do **not** start D2 yet.

---

*JARVIS v1.5 Phase D / D1 Fix Loop — © 2026 Kidus Abdula / VersaLabs Studio.*
