# JARVIS v1.5 — Mobile Premium Design System (P4)

> **From:** Kidus Abdula (Architect / Opus BRAIN). **To:** Orchestrator → Execute.
> **Status:** Design spec of record for `apps/mobile`. Implemented in **D1 Fix Loop 2** (`docs/PHASE-D-D1-FIX-2.md`), then inherited by D3/D4/D5.
> **Why now:** the D1 scaffold renders, but flat and generic ("hideous" on device) — and the nav chrome is broken (raw `oklch()` rejected by RN → default light theme). Fixing the look *before* three feature screens are built on it is the cheap path. **Date:** June 2026.

---

## 0. Design intent — what "premium" means here

JARVIS mobile is an **operator console for an AI system** — it should feel like a precision instrument, not a CRUD app. Three principles:

1. **Layered near-black, not flat grey.** Depth comes from *surfaces that step up in luminance* + a single luminous hairline border catching light — never from heavy boxes. The current flat `#1a1a1a` everything is the #1 "cheap" tell.
2. **Restraint with the accent.** One electric blue, used only for *the* primary action and live/active state. Everything else is neutral. The current UI floods generic Material-blue (`#4a9eff`) onto every pill and button — that reads cheap. Premium = mostly monochrome, accent as punctuation.
3. **Semantic colour for status, tinted-subtle.** Active/Running/Failed must be *different* colours (emerald/accent/red), rendered as a small dot + a 12–16% tint pill — not three identical solid-blue pills.

This is not scope creep: D1's charter (PHASE-D-HANDOFF §1) is *"the OKLCH dark token system ported to RN, typography, motion primitives."* This doc is that deliverable, done to grade.

---

## 1. The token architecture (P1 — one source, two consumers)

The root cause of the broken chrome is architectural: **React Native has two colour channels and the scaffold only fed one.**

| Channel | Used by | Source |
|---|---|---|
| `className="bg-card"` | View/Text styling | `tailwind.config.js` (NativeWind) |
| `color={...}` prop (Icon, Switch, TextInput, nav `screenOptions`) | RN native components | **plain JS values — NativeWind never touches these** |

The scaffold converted only the tailwind tokens. Every JS colour prop kept a raw `oklch()` string → RN throws. **Fix the architecture, not the 14 call-sites one-by-one:** introduce a single typed colour module that *both* channels derive from.

### Create `apps/mobile/theme/colors.ts` (the one source of truth)

```ts
// Native-safe hex/rgba ONLY. Imported by tailwind.config.js AND every JS color prop.
// No oklch() ever reaches React Native.
export const colors = {
  // — Neutral ramp (cool near-black, layered) —
  background:        "#0B0D10", // app canvas — near-black, slight cool cast
  surface:           "#14171C", // card / sheet base
  surfaceElevated:   "#1B1F26", // cards that float above surface, inputs
  overlay:           "#232830", // pressed / muted fills, inactive chips
  hairline:          "rgba(255,255,255,0.07)", // THE premium border — luminous, not grey
  border:            "#262B33", // solid fallback border where hairline won't read

  // — Text —
  foreground:        "#F4F6F8",
  mutedForeground:   "#9AA3AD",
  subtleForeground:  "#5E6670", // placeholders, disabled, timestamps

  // — Accent (restraint!) —
  accent:            "#5B9DFF", // primary action + active state. ONE blue.
  accentEmphasis:    "#7DB4FF", // hover/pressed/glow
  accentForeground:  "#0B0D10", // text/icon on an accent fill
  accentSubtle:      "#16243B", // accent at ~14% over surface — tinted pill bg

  // — Semantic status —
  success:           "#34D399", successSubtle: "#102A22",
  warning:           "#FBBF24", warningSubtle: "#2A2410",
  danger:            "#F87171", dangerSubtle:  "#2A1518",
} as const;

export type ColorToken = keyof typeof colors;
```

### Rewire `tailwind.config.js` to import from it (no duplicate hex)

```js
const { colors } = require("./theme/colors");
// ... theme.extend.colors:
//   background: colors.background, foreground: colors.foreground,
//   card: colors.surface, "card-foreground": colors.foreground,
//   "card-elevated": colors.surfaceElevated,
//   muted: colors.overlay, "muted-foreground": colors.mutedForeground,
//   subtle: colors.subtleForeground,
//   accent: colors.accent, "accent-foreground": colors.accentForeground,
//   border: colors.border, input: colors.surfaceElevated, ring: colors.accent,
//   success: colors.success, warning: colors.warning, destructive: colors.danger,
```

### Every JS colour prop imports `colors`

```tsx
import { colors } from "@/theme/colors";
// nav:    headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground
// icon:   <ChevronRight size={20} color={colors.mutedForeground} />
// switch: trackColor={{ false: colors.overlay, true: colors.accent }} thumbColor={colors.foreground}
// input:  placeholderTextColor={colors.subtleForeground}
```

**Result:** zero `oklch()` in the app, one place to retune the palette, web keeps OKLCH / mobile is hex — the web↔native reconciliation, done correctly.

---

## 2. Elevation (the depth system)

The flat look dies here. Define one reusable card surface:

```
Card =  bg: surface (#14171C)
        border: 1px hairline rgba(255,255,255,0.07)
        radius: 20 (rounded-[20px])
        padding: 16–20
        iOS  shadow: color #000, opacity 0.35, radius 16, offset {0,6}
        Android elevation: 3
```

- **surface** for resting cards; **surfaceElevated** for things that sit *on* a card (inputs, inner chips, the chat input bar).
- The luminous hairline + a soft shadow is what makes a dark card look milled rather than drawn. Apply it consistently to StatCard, WorkflowCard, SettingItem groups, chat input bar.
- Pressed state: drop to `overlay` bg + scale 0.97 (see §6).

---

## 3. Typography scale (Outfit + Fira Code, already loaded)

| Role | Family / weight | Size / line | Tracking | Token use |
|---|---|---|---|---|
| Screen title | Outfit SemiBold | 28 / 34 | −0.5 | `text-foreground` |
| Section label | Outfit SemiBold | 12 / 16 | **+0.8, UPPERCASE** | `text-muted-foreground` |
| Card title | Outfit SemiBold | 16 / 22 | 0 | `text-foreground` |
| Stat value | Outfit Bold | 30 / 34 | −0.5 | `text-foreground` |
| Body | Outfit Regular | 15 / 22 | 0 | `text-foreground` |
| Caption / meta | Outfit Regular | 13 / 18 | 0 | `text-muted-foreground` |
| Numeric / ID / URL | **Fira Code** | 13–15 | 0 | mono — counts, `localhost:4000`, IDs |

Rule: **numbers, IDs, URLs, and counts render in Fira Code** (`font-mono`). It's the operator-console signature and it's already bundled — use it (currently unused). E.g. "24 triggers", "1.5.0", the server URL.

---

## 4. Component anatomy (what each screen should become)

### 4.1 Navigation chrome — *replace the native header*
The default React-Navigation header is the cheapest-looking element on screen. Two fixes, both required:

- **Tab bar:** dark elevated, **safe-area aware** (the label clipping = hardcoded `paddingBottom: 28`; use `useSafeAreaInsets().bottom`). `bg: background` (or a hair darker `#0E1116`), top `hairline` border, height `60 + insets.bottom`. Active = `accent` icon+label; inactive = `subtleForeground`. Add a 2px accent top-indicator on the active tab (or a soft accent glow under the active icon).
- **Header:** set `headerShown:false` on the Tabs and build a custom **`ScreenHeader`** component — large title (28 SemiBold), optional one-line subtitle (muted), optional right action button — on `bg: background` with a bottom `hairline`. This gives the large-title premium feel and full token control. (If time-boxed: at minimum theme the native header dark via `colors` — but custom is the target.)

### 4.2 StatCard (Dashboard 2×2)
```
[ SECTION-LABEL chip-trend? ]   ← label muted, optional ▲ trend in success
   42                            ← stat value, Bold 30, Fira Code if pure number
   ● 3 active                    ← subtitle with a colored status dot
```
Card surface (§2). Left-aligned. The status dot uses `success`/`mutedForeground`. Add a faint accent-tinted icon chip top-right per metric (Server/Cpu/Workflow/Message lucide icon in an `accentSubtle` rounded square).

### 4.3 StatusBadge (Workflows) — semantic + tinted-subtle
Stop using solid `bg-accent` for everything. Pattern = `dot + label` in a tinted pill:

| Status | Dot / text | Pill bg |
|---|---|---|
| Active | `success` | `successSubtle` |
| Running | `accent` (pulsing dot, §6) | `accentSubtle` |
| Inactive | `mutedForeground` | `overlay` |
| Failed | `danger` | `dangerSubtle` |

Pill: `rounded-full px-2.5 py-1`, 8px dot + 12px label. No icon needed (the dot is enough; if kept, colour it with the status token, never a literal).

### 4.4 WorkflowCard
Card surface. Title (16 SemiBold) + StatusBadge top-right. Meta row: `24 triggers` (Fira Code) · `Last run 08 Jun` (muted). Primary action **outline-accent** button (`border accent`, `text accent`, transparent bg) — reserve *solid* accent fill for the single most important action per screen, not every row. Press scale 0.97.

### 4.5 Chat
- **Empty state:** centered icon (MessageSquare/Sparkles) inside a concentric accent halo (`accentSubtle` ring), title 16 SemiBold, subtitle muted. Lift it off the dead-center void with `mt-[30%]`.
- **Bubbles:** user = `accent` fill + `accentForeground` text, tail `rounded-br-md`. Assistant = `surface` + `hairline` border + `foreground`, tail `rounded-bl-md`. Timestamp 12 muted.
- **Quick chips:** `surfaceElevated` + `hairline` outline (not flat `bg-muted`), `accent` text on press.
- **Input bar:** `surface` bar with top `hairline`; input field `surfaceElevated rounded-2xl`; send button `accent` square, icon colour from `colors.accentForeground`. Haptic on send lands in D4.

### 4.6 SettingItem
Per-section icon in a **tinted chip** (not flat grey): Connection→accent, Preferences→accent, About→muted, Logout→danger chip. Icon colour from the matching token. Group rows in a card surface with `hairline` dividers between rows (not full `border-b border-border` grey lines).

---

## 5. The four data-view states (D-P4-1 — applies to every list screen)

1. **Skeleton** (not spinners): shimmer blocks on `surfaceElevated`, matching the card silhouette. Moti loop opacity 0.5↔1.
2. **Empty + CTA**: icon-in-halo + title + subtitle + (where actionable) a button.
3. **Error + retry**: `danger` icon, message, outline retry button.
4. **Mount motion**: list items stagger in (§6).

Build these as shared components in `components/data-states.tsx` (mirrors web's `data-states.tsx`) so D3/D4/D5 reuse them — don't re-implement per screen.

---

## 6. Motion (Moti / Reanimated — already installed)

- **Screen mount:** container fade `opacity 0→1` + `translateY 8→0`, 320ms.
- **List stagger:** each item `delay: index * 45`, same translate. (Workflows/activity/chat.)
- **Press feedback:** wrap interactive surfaces so press → `scale 0.97`, spring back. Standardize as a `<Pressable>` wrapper component.
- **Live pulse:** Running status dot loops `opacity 1↔0.4` / subtle `scale`, 1s. The only ambient motion — signals "live."
- Keep it *subtle*. Premium motion is felt, not watched.

---

## 7. Acceptance criteria (what makes this "signed off" on device)

On the S25 Ultra in Expo Go:
- [ ] **No colour error toast.** Zero `oklch()` anywhere (grep + runtime).
- [ ] Header + tab bar are **dark**, tab labels not clipped (safe-area).
- [ ] Cards show depth — visible hairline border + shadow, layered surfaces (not one flat grey).
- [ ] Accent appears on **only** primary actions + active/live state; status badges are emerald/accent/red/grey, not all blue.
- [ ] Icons render (no empty circles), in tinted chips.
- [ ] Numbers/URLs/IDs render in Fira Code.
- [ ] List items stagger in; primary buttons depress.

---

## 8. Token quick-reference (paste into implementation)

```
bg canvas      #0B0D10   text hi      #F4F6F8
surface        #14171C   text muted   #9AA3AD
surface-elev   #1B1F26   text subtle  #5E6670
overlay        #232830   hairline     rgba(255,255,255,0.07)
accent         #5B9DFF   accent-emph  #7DB4FF   accent-fg #0B0D10  accent-subtle #16243B
success #34D399 / #102A22    warning #FBBF24 / #2A2410    danger #F87171 / #2A1518
radius card 20 · pill full · input/btn 14    screen pad-x 20 · card pad 16–20
type: title 28/600 · section 12/600 +0.8 UPPER · card 16/600 · stat 30/700 · body 15/400 · caption 13/400 · mono Fira
```

---

*JARVIS v1.5 Mobile Design System — © 2026 Kidus Abdula / VersaLabs Studio.*
