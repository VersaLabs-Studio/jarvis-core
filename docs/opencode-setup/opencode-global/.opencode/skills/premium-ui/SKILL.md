---
name: Premium UI Design
description: >
  Enforce Kidus Abdula's premium enterprise UI standards. Use whenever building
  or reviewing any component, page, or visual element. Fights generic AI aesthetics
  and enforces the OKLCH theming system, glassmorphism, and Framer Motion standards.
version: 1.0.0
---

# Premium UI Design Skill

You are a world-class UI/UX Engineer operating under Kidus Abdula's Architectural DNA.

**Directive:** Every interface must look like a $50,000+ enterprise product. Visual excellence is not optional — it is a business strategy that closes deals and commands premium pricing.

---

## Pre-Build Checklist (Run Before Any UI Work)

Before writing a single line of UI code, answer these:

1. Which **tier** is this? (Public / Dashboard / Admin) — each has different visual density and interaction patterns.
2. What is the **primary surface type**? (Card, panel, modal, table, form, landing section)
3. What **motion** should accompany this? (Entrance, hover, transition, loading state)
4. Is **dual theme** handled? (Both light and dark must work before calling it done)

---

## The OKLCH Theming System

**Always use semantic tokens. Never hardcode.**

```css
/* Surfaces */
bg-background   /* page base */
bg-card         /* elevated card */
bg-popover      /* popovers, tooltips */
bg-muted        /* subtle backgrounds, empty states */

/* Text */
text-foreground         /* primary text */
text-muted-foreground   /* secondary/helper text */
text-card-foreground    /* text on cards */

/* Borders & Inputs */
border-border   /* standard borders */
border-input    /* form input borders */
ring-ring       /* focus rings */

/* Brand */
bg-primary      text-primary-foreground   /* main CTA */
bg-secondary    text-secondary-foreground /* secondary actions */
bg-accent       text-accent-foreground    /* highlights */
bg-destructive  text-destructive-foreground /* danger/delete */
```

---

## Glassmorphism Standards

Apply to: modals, sidebars, floating panels, cards over media, header bars.

```tsx
// Correct glassmorphism implementation:
<div className="
  backdrop-blur-xl
  bg-card/80               // semi-transparent card surface
  border border-border/50  // subtle border
  shadow-xl shadow-black/5 // very gentle shadow
  rounded-2xl
">
```

Never: heavy `shadow-2xl`, `bg-white`, opaque overlays that kill the glass effect.

---

## Framer Motion Standards

**Duration constants (always use these, never magic numbers):**

```ts
export const MOTION = {
  fast:    { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  normal:  { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  slow:    { duration: 0.4,  ease: [0.4, 0, 0.2, 1] },
  spring:  { type: "spring", stiffness: 300, damping: 30 },
  springGentle: { type: "spring", stiffness: 150, damping: 20 },
}

// Page/module entrance — always stagger children:
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: MOTION.normal }
}
```

**Required animations:**
- Page/module mount → staggered fade-up entrance
- CTA buttons → subtle scale on hover (scale: 1.02)
- Destructive actions → shake or red pulse confirmation
- Loading states → skeleton with shimmer, not spinners
- Table rows → hover highlight with `transition-colors`
- Modals → scale in from 0.95 to 1.0 with fade

---

## Typography System

```tsx
// Hierarchy (never deviate):
<h1 className="text-4xl font-bold tracking-tight text-foreground">    // Page title
<h2 className="text-2xl font-semibold tracking-tight text-foreground"> // Section title
<h3 className="text-lg font-semibold text-foreground">                 // Card title
<p  className="text-sm text-muted-foreground leading-relaxed">         // Body text
<span className="text-xs text-muted-foreground uppercase tracking-wider font-medium"> // Label/caption
```

Font priority: Geist → Inter → Outfit. Never: Arial, system-ui as primary, Roboto.

---

## Layout & Composition

**Dashboard pages:**
```tsx
// Standard dashboard page anatomy:
<div className="space-y-6 p-6">
  {/* 1. Page header with title, description, primary action */}
  <PageHeader title="..." description="..." action={<Button>...</Button>} />

  {/* 2. Stats row (if applicable) */}
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <StatCard ... />
  </div>

  {/* 3. Main content area */}
  <Card className="...">
    {/* Data table, form, or content */}
  </Card>
</div>
```

**Public pages:**
- Hero: full viewport, atmospheric background (gradient mesh or subtle pattern)
- Sections: generous whitespace (py-24 or more), centered content at max-w-6xl
- CTAs: prominent, single-focus per section

---

## Component Patterns

**Data Tables:**
- Sticky header, hover row highlight, sortable columns
- Batch selection with floating action bar
- Empty state with illustration + action (never just "No data")
- Loading: skeleton rows, not spinners

**Forms:**
- Inline validation with Zod + React Hook Form
- Field labels above inputs (never inside as placeholder-only)
- Error states: red border + icon + message below field
- Success: toast (Sonner) + optimistic UI update

**Modals/Dialogs (Radix):**
- Max width: `max-w-lg` for forms, `max-w-2xl` for complex content
- Always: title, description, action buttons (Cancel + Primary)
- Destructive confirmations: separate confirmation dialog, red primary button

---

## Anti-Slop Rules (Hard Stops)

| Never | Instead |
|-------|---------|
| `bg-white` or `bg-black` | `bg-background` or `bg-card` |
| Purple/blue gradients as primary accent | Brand-consistent OKLCH tokens |
| `text-gray-500` | `text-muted-foreground` |
| Heavy `shadow-2xl` | `shadow-sm shadow-black/5` |
| Generic spinner for loading | Skeleton with shimmer |
| Empty state with just text | Illustration + contextual CTA |
| Flat, borderless cards | Subtle border + glass surface |
| No motion at all | Purposeful stagger entrance |
| All caps body text | Reserve ALL CAPS for labels/captions only |
| Cramped spacing | Breathe: gap-4 minimum, gap-6 preferred |

---

## Dual Theme Verification

Before completing any UI work, verify both themes manually:

```
Light mode check:
- [ ] Surfaces are clearly elevated (bg-background → bg-card → bg-popover)
- [ ] Text contrast passes WCAG AA (4.5:1 minimum)
- [ ] Borders are visible but subtle
- [ ] Glass effects render correctly over light backgrounds

Dark mode check:
- [ ] No pure black surfaces (use oklch(0.15 ...) not #000000)
- [ ] Text remains readable (near-white, not pure white)
- [ ] Glass blur still visible against dark backgrounds
- [ ] Borders elevated enough to distinguish surfaces
```
