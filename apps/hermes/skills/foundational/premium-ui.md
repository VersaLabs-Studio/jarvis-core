---
name: premium-ui
description: Premium enterprise UI standards — OKLCH tokens, glassmorphism, Framer Motion stagger entrance, Radix + Tailwind v4. Applied to every UI change in apps/web and apps/mobile.
trigger:
  - "premium ui"
  - "UI design"
  - "OKLCH"
  - "glassmorphism"
tools_required: []
category: foundational
estimated_time: "1 minute"
always_loaded: false
preferred_model_role: coding
---

# Premium UI

## Purpose

Encode the JARVIS premium UI standard so every component, page, and screen ships at $50K+ visual quality. Generic AI aesthetics are the enemy — three gradients, no animation, default Tailwind colors. The premium UI standard is the antidote. It is enforced by the `pnpm color-gate` (zero hardcoded colors), the `pnpm import-check` (no sideways feature imports), and the `ui-auditor` skill (manual scoring).

## Prerequisites

- The OKLCH token table at `apps/web/src/styles/tokens.css` (and the mobile equivalent)
- The animation primitives at `apps/web/src/lib/motion.ts` (variants, transitions, stagger configs)
- Radix UI primitives for accessible interactive elements
- Tailwind v4 with the OKLCH plugin (`@tailwindcss/oklch`)
- Framer Motion 11+ for entrance + interaction animations
- `premium-ui` skill loaded (this doc) for context

## Steps

### Step 1: Use OKLCH tokens, never hardcoded colors

Every color in a `className` or `style` prop must reference an OKLCH token. The token table is at `apps/web/src/styles/tokens.css`:

```css
:root {
  --color-bg: oklch(0.99 0.005 250);
  --color-fg: oklch(0.18 0.02 250);
  --color-accent: oklch(0.62 0.18 250);
  --color-success: oklch(0.72 0.15 145);
  --color-warning: oklch(0.78 0.16 75);
  --color-error: oklch(0.62 0.22 25);
  /* ... etc */
}

[data-theme="dark"] {
  --color-bg: oklch(0.12 0.01 250);
  --color-fg: oklch(0.95 0.005 250);
  /* ... */
}
```

**Never** write `bg-white`, `text-gray-500`, `border-red-400`, `#fff`, `rgb(255,255,255)`. The `pnpm color-gate` lint catches these:

```bash
grep -rn "bg-white\|bg-black\|text-white\|text-black\|text-gray-\|#[0-9a-fA-F]\{3,6\}" \
  apps/web/src apps/mobile --include="*.tsx" --include="*.ts" --include="*.css"
```

Hits: **0**. Violations are an audit blocker.

### Step 2: Apply glassmorphism to surfaces that float

Cards, modals, popovers, sheets, and tooltips get a glassmorphism treatment:

```tsx
<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-xl shadow-2xl">
  {children}
</div>
```

The four ingredients: translucent background (`bg-foo/60`), blur (`backdrop-blur-xl`), border (`border-foo`), and shadow (`shadow-2xl`). The dark-mode version uses a darker translucent base. **No glass** on full-page surfaces (it kills the background); use solid `bg-foo` for those.

### Step 3: Animate entrance with Framer Motion stagger

Every page and every list animates in. The pattern:

```tsx
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";

export function Page() {
  return (
    <motion.main variants={containerVariants} initial="hidden" animate="show">
      {items.map((it) => (
        <motion.div key={it.id} variants={itemVariants}>{it.label}</motion.div>
      ))}
    </motion.main>
  );
}
```

Where `containerVariants` and `itemVariants` are centralized in `apps/web/src/lib/motion.ts`:

```ts
export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};
```

The stagger is 50-100ms between siblings. The duration is 200-400ms. The ease is `[0.22, 1, 0.36, 1]` (a custom cubic-bezier for "settle"). Pages animate on mount; lists animate when their data lands; modals animate on open.

### Step 4: Honor all four data-view states

Every data-bound surface has four states, not three. The "default" is **not** one of them:

| State | Visual | Interaction |
|---|---|---|
| **loading** | Skeleton (pulsing translucent shape) + small spinner if >1s | Disabled inputs, cancel button |
| **empty** | Illustration + 1-line headline + CTA button | CTA focused; one primary action |
| **error** | Inline message + retry button + correlation ID | Retry is the only enabled action; copy correlation ID on click |
| **success** | The data | Normal interactions |

A screen that shows one of the four states 100% of the time, including the brief window between fetch-resolve and render, is the bar. Use `useDoc`/`useList` from the factory; the loading state is automatic.

### Step 5: Mobile + responsive + a11y, by default

- **Mobile-first.** Default styles target 360px; `@media (min-width: 640px)` and up override.
- **Dark mode** is a first-class theme; every OKLCH token has a `[data-theme="dark"]` override.
- **Accessibility** — every interactive element has an `aria-label`; every form field has an associated label; every modal traps focus; the Tab order matches the visual order; focus rings are visible (use `focus-visible:ring-2`).
- **Reduced motion** — wrap Framer Motion variants in a `useReducedMotion()` check; collapse long transitions to a 50ms opacity fade.

## Output

A PR that adds a UI surface must include:

- Screenshot of the surface in light + dark mode (360px and 1280px widths)
- The `pnpm color-gate` lint passing (0 hits)
- A Framer Motion entrance animation on the page + lists
- All four data-view states reachable (loading: refresh; empty: trigger from a fresh DB; error: stub the fetch; success: real data)
- A11y audit: Tab through the surface, Esc closes modals, focus ring visible, screen reader announces the labels

## Error Handling

- **Lint fails (hardcoded color)** — replace with the OKLCH token; re-run the gate; commit the fix in the same PR.
- **Animation jank (choppy 60fps on mid-tier mobile)** — use `will-change: transform` on the animated element, or collapse the animation to opacity-only.
- **A11y regression** — add the missing `aria-*` or label; the auditor will catch it.
- **Two sources of truth for tokens** (a value redefined in a component) — refactor to the token; `pnpm color-gate` may not catch redefinitions inside `:root` blocks, so grep for it manually.

## Quality Checks

```bash
# 1. Color gate — 0 hits
pnpm color-gate

# 2. Animation primitives are imported (no inline framer-motion variants in the component)
grep -rn "variants={" apps/web/src/app apps/web/src/components --include="*.tsx" \
  | grep -v "from \"@/lib/motion\"" | grep -v "node_modules"
# Expected: 0 hits (or only legitimate custom-variant files)

# 3. A11y — every interactive element has a label
grep -rn "<button" apps/web/src --include="*.tsx" \
  | grep -v "aria-label" | grep -v ">"
# Manually review hits

# 4. Dark mode — every new page has a [data-theme="dark"] equivalent
#    Tested in Storybook or a dark-mode toggle in the dev app
```

A premium UI surface that doesn't pass all four is a P4 violation. The merge is blocked.
