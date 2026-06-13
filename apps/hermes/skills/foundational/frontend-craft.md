---
name: frontend-craft
description: High-craft React/Next.js + TypeScript implementation patterns — factory hooks, TanStack Query keys, Zustand stores, OKLCH tokens, Framer Motion, Radix primitives. Applied to every component, page, hook, or API route.
trigger:
  - "react"
  - "next.js"
  - "typescript"
  - "component"
  - "frontend"
tools_required: []
category: foundational
estimated_time: "1 minute"
always_loaded: false
preferred_model_role: coding
---

# Frontend Craft

## Purpose

Encode the JARVIS frontend standard so every React/Next.js + Expo component, page, hook, and route ships with high-craft patterns. Generic AI frontend (useState soup, inline fetch, no loading states) is the enemy. The frontend craft standard is the antidote. It is enforced by the `pnpm any-gate` (no `any` in production), the `pnpm import-check` (no cross-feature imports), the `pnpm color-gate` (no hardcoded colors), and the `frontend-craft` skill (this doc) for context.

## Prerequisites

- Familiarity with the `apps/web` (Next.js 15+ App Router) and `apps/mobile` (Expo 56+) layout
- `@jarvis/shared` consumed for types, schemas, query-key factories, and the `CrudEntityKey` constraint
- TanStack Query v5 (`@tanstack/react-query`) for server state
- Zustand for client state
- React Hook Form + Zod for forms
- Radix UI primitives for accessible interactive elements
- Framer Motion for animations
- The `premium-ui` and `schema-first` skills loaded for the visual + data layer

## Steps

### Step 1: Use the factory hooks, never bespoke fetch

Every server-state hook is a thin wrapper over the factory. The factory lives at `apps/web/src/hooks/use-entity.ts` (web) and `apps/mobile/hooks/use-entity.ts` (mobile):

```ts
// apps/web/src/hooks/use-entity.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@jarvis/shared";
import type { CrudEntityKey, EntityInsert, EntityUpdate, EntityRow } from "@jarvis/shared";

export function useList<K extends CrudEntityKey>(entity: K, queryKey: readonly unknown[]) {
  return useQuery({
    queryKey,
    queryFn: () => api.get<{ data: EntityRow<K>[]; total: number }>(`/api/cms/${entity}`).then((r) => r.data),
  });
}
// ... useDoc, useCreate, useUpdate, useDelete (all keyed by CrudEntityKey)
```

The `CrudEntityKey = Exclude<keyof typeof keys, "service_health">` constraint ensures the factory is the only path. `service_health` is its own bespoke hook (it's not CRUD).

**Never** write `useEffect(() => fetch(...), [])`. **Never** write `const [data, setData] = useState()` for server data. The factory is the only path.

### Step 2: Invalidate via the shared `keys` factory

Every mutation invalidates the relevant key. The pattern:

```ts
export function useCreate<K extends CrudEntityKey>(entity: K, invalidateKey: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => api.post(`/api/cms/${entity}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });
}
```

The `invalidateKey` is always `keys.<entity>.all()` (or a more specific subkey). Two consumers of the same `keys` factory get consistent invalidation across web + mobile + the dashboard.

### Step 3: Zod at every form boundary

React Hook Form + Zod resolver is the only form pattern:

```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { entityInsertSchema, type EntityInsert } from "@jarvis/shared";

const form = useForm<EntityInsert>({
  resolver: zodResolver(entityInsertSchema),
  defaultValues: { name: "", description: "" },
});
```

The Zod schema is the same instance used by the API. The form's `onSubmit` calls the factory mutation; the server's Zod re-validates; the round-trip is honest.

### Step 4: Four data-view states on every screen

The factory hooks return `{ data, isLoading, error }`. The component renders the right state:

```tsx
function EntityList() {
  const { data, isLoading, error } = useEntityList();

  if (isLoading) return <EntityListSkeleton />;  // pulsing translucent shapes
  if (error) return <ErrorState error={error} onRetry={refetch} />;  // retry + correlation id
  if (!data || data.length === 0) return <EmptyState onCreate={openDialog} />;  // illustration + CTA
  return <EntityTable data={data} />;  // the data, with stagger entrance
}
```

The four states are **always** reachable from a fresh visit: loading on first render, empty on a fresh DB, error on a stubbed fetch, success on real data. Never show a "default" state.

### Step 5: Optimize before adding complexity

Performance is a craft concern. Three patterns:

- **`useMemo` only when the dep array is stable** — `useMemo(() => filter(data), [data, filter])` is fine; `useMemo(() => ({ a: 1 }), [])` is premature.
- **Lazy load heavy components** — `const Chart = dynamic(() => import("./Chart"), { ssr: false })` for any chart > 50KB gzipped.
- **TanStack Query `staleTime` is a contract** — set it to the freshness your UX needs, not 0. The dashboard's data doesn't change every 200ms; a 30s `staleTime` is honest.

Profile before optimizing. `pnpm -F web build && du -sh apps/web/.next/static/chunks/*.js` is the budget; anything over 200KB gzipped is suspect.

### Step 6: Accessibility is a craft concern, not a checklist

- **Every interactive element has an accessible name** — `<button aria-label="Close">×</button>`, never `<div onClick={...}>`.
- **Focus rings are visible** — `focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]`.
- **Modal traps focus** — Radix's `<Dialog>` handles this; don't roll your own.
- **The Tab order matches the visual order** — `tabIndex` is rare; the natural DOM order wins.
- **Screen reader announces state changes** — `aria-live="polite"` for toast notifications; `aria-busy` while loading.

### Step 7: Mobile + responsive, by default

- **Mobile-first styles** — base styles target 360px; `@media (min-width: 640px)` and up override.
- **Touch targets ≥ 44×44 px** — every button, every link, every form field.
- **Haptics on important actions** — `haptics.success()` after a successful mutation; `haptics.error()` on a failure (see `apps/mobile/lib/haptics.ts`).
- **Pull-to-refresh on lists** — the `useEntityList` factory exposes a `refetch`; wire it to a `<RefreshControl>` or the equivalent.
- **Push notifications via WS** — see `apps/mobile/lib/notifications.ts`; the WS bridge emits `notification` events.

### Step 8: Deep-link by URL, not by navigation

Every screen has a URL. `<EntityDetailPage>` is reached at `/entities/:id`; on mobile, `jarvis://entities/:id` deep-links to it. The URL is the **canonical** entry point; navigation is just a UX nicety over the URL.

## Output

A new component/page lands as: 1 component file + 1 test (if it's a hook) + 1 story (if it's reusable) + 1 entry in the relevant registry. The PR includes:

- Screenshots (web: light + dark, 1280px + 360px; mobile: iOS + Android)
- A 60fps screen recording of the entrance animation
- The CI gates green: `pnpm any-gate`, `pnpm color-gate`, `pnpm import-check`, `pnpm type-drift:check`, `pnpm factory-check`

## Error Handling

- **`any` in a component** — replace with `unknown` + a type guard, or import the right type from `@jarvis/shared`. `pnpm any-gate` is non-negotiable.
- **Hardcoded color** — replace with the OKLCH token. `pnpm color-gate` is non-negotiable.
- **Bespoke fetch in a component** — refactor to the factory hook. `pnpm factory-check` is non-negotiable.
- **Cross-feature import** — move the imported code to `shared/`, or inline the relevant piece. `pnpm import-check` is non-negotiable.
- **Hydration mismatch (web)** — every `useState`-initialized value that depends on the client (Date.now(), Math.random(), window.matchMedia) must be wrapped in a `useEffect` or `<ClientOnly>`.
- **A11y regression** — add the missing `aria-*`; the auditor will catch it on the next gate.

## Quality Checks

```bash
# 1. Type safety
pnpm -r typecheck
pnpm any-gate

# 2. Color gate (0 hits)
pnpm color-gate

# 3. Import direction (0 hits)
pnpm import-check

# 4. Factory pattern (every CRUD goes through the factory)
pnpm factory-check

# 5. Type drift (generated types match migrations)
pnpm type-drift:check

# 6. Performance budget
pnpm -F web build
du -sh apps/web/.next/static/chunks/*.js | sort -h | tail -10
# Largest chunk should be < 200KB gzipped

# 7. A11y quick check
pnpm -F web test -- --run a11y
# Or manually: Tab through the surface, Esc closes modals, focus ring visible
```

A frontend-craft component that doesn't pass all seven is a P2 + P3 + P4 + P6 violation stack. The merge is blocked.
