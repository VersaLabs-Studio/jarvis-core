---
name: Architectural DNA
description: >
  Master reference for Kidus Abdula's engineering methodology. Load this skill
  whenever working on any new feature, module, refactor, or architectural decision.
  It governs ALL other agents and skills in this setup.
version: 1.0.0
author: Kidus Abdula
---

# Architectural DNA — Active Reference

You are operating under **Kidus Abdula's Architectural DNA v1.0.0**. This is not optional guidance — it is the law of this codebase. Every decision you make must trace back to one of the Six Pillars below.

---

## The Three Absolutes (Non-Negotiable)

1. **Enterprise-Grade First** — Every decision prioritizes production-readiness. A demo must be deployable.
2. **Zero Compromise on Design** — Visual excellence is mandatory. Premium aesthetics drive user trust.
3. **Schema Before Code** — No implementation starts until the data model is complete and types are generated.

---

## The Six Pillars

| # | Pillar | Rule |
|---|--------|------|
| P1 | **Schema-First** | Database schema → generated types → Zod schemas → config → hooks → UI. Never reverse this. |
| P2 | **Factory Pattern** | Generic factories handle all CRUD. No module writes its own fetch/create/update/delete logic. |
| P3 | **Extreme Modularization** | Every feature = its own directory with hooks, components, and API routes. Nothing bleeds across boundaries. |
| P4 | **Premium UI** | OKLCH theming, glassmorphism, Framer Motion, Radix + Tailwind v4. Every screen looks like a $50K+ product. |
| P5 | **Documentation as Architecture** | Master documents are written before development. They are the source of truth — not the code. |
| P6 | **End-to-End Type Safety** | TypeScript strict mode everywhere. Zod at all runtime boundaries. No `any`, no guessing. |

---

## Three-Tier Architecture (Always)

```
TIER 1: PUBLIC       — Read-only, no auth, SEO-optimized
TIER 2: DASHBOARD    — Full CRUD, role-protected, operator workspace
TIER 3: ADMIN        — System-wide oversight, super admin only
```

Each tier has its own: route group, component dir, hook library, API namespace, layout shell.

---

## Dual API Namespace

| Namespace | Auth | Operations |
|-----------|------|------------|
| `/api/public/*` | None | GET only |
| `/api/cms/*` or `/api/protected/*` | Required | Full CRUD |

Security auditing is trivial: everything under `/api/public/` is guaranteed read-only.

---

## Query Key Factory (Required Pattern)

```ts
// Every entity follows this structure:
const EventKeys = {
  all:  () => ["Event"],
  list: (opts) => ["Event", "list", opts],
  doc:  (id)  => ["Event", "doc", id],
}
```

---

## Factory Pattern (Required)

```
API Layer:  createListHandler / createGetHandler / createCreateHandler / createUpdateHandler / createDeleteHandler
Hook Layer: useList<T> / useDoc<T> / useCreate<T> / useUpdate<T> / useDelete
```

New entity = 5 min schema + 2 min config + 2 min query keys + 5 min API routes + 30 min pages = **< 45 min full CRUD module**.

---

## The Golden Template Rule

The **first module built** on any project becomes the canonical reference. Every subsequent module copies its pattern exactly. Never deviate from the golden template without a documented reason.

---

## Import Direction Rule

```
ui/ (primitives) ← shared/ (smart components) ← feature/ (domain components)
```

Feature components import from `ui/` and `shared/`. `ui/` components NEVER import from features. No exceptions.

---

## Premium UI Standards

| Element | Standard |
|---------|----------|
| Color | OKLCH color space, semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`) |
| Typography | Geist, Inter, or Outfit — never browser defaults |
| Animations | Framer Motion with defined easing/duration constants |
| Components | Radix UI primitives, custom styled |
| Theming | Dual light/dark from day one, 200ms transitions |
| Responsiveness | Mobile-first, 44px touch targets |
| Glassmorphism | `backdrop-blur` + semi-transparent surfaces for elevated panels |

**Absolute Rule:** Never use hardcoded colors (`bg-white`, `text-black`). Always use semantic tokens.

---

## Anti-Patterns (Never Do These)

- Writing custom CRUD hooks when a factory exists
- Hardcoding colors instead of using semantic tokens
- Starting implementation before the schema is defined
- Importing across feature boundaries sideways
- Using `any` in TypeScript
- Building UI without considering all three tiers
- Skipping documentation before a module

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| Language | TypeScript (Strict Mode) |
| Styling | Tailwind CSS v4 |
| State | TanStack Query |
| Forms | React Hook Form + Zod |
| UI Primitives | Radix UI |
| Animations | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner |
| Backend | Supabase (MVP) / Frappe (ERP) / FastAPI (ML) |
