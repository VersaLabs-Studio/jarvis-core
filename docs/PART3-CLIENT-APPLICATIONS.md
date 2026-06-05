# JARVIS v1.5 — Part 3: Client Applications

> **System:** JARVIS — Autonomous SWE Workflow Platform  
> **Version:** 1.5.0  
> **Author:** Kidus Abdula — Lead Senior Software Engineer & Systems Architect  
> **Architectural Standard:** Architectural DNA v1.0.0  
> **Date:** June 2026  
> **Classification:** Implementation-Ready — Hand to Coding Agent

---

> [!IMPORTANT]
> This document is **Part 3 of 5** of the JARVIS v1.5 Master Architecture. It covers the design system, the **factory data layer (query-key factory + generic hooks — DNA P2)**, the Next.js web dashboard, and the Expo mobile app.

### Document Index

| Part | Document | Contents |
|------|----------|----------|
| 1 | [PART1-SYSTEM-ARCHITECTURE.md](./PART1-SYSTEM-ARCHITECTURE.md) | VPS, Docker, Hermes, Nginx, Monorepo |
| 2 | [PART2-DATABASE-API.md](./PART2-DATABASE-API.md) | Schema, Generated Types, CRUD Factories, Contracts |
| **→ 3** | **PART3-CLIENT-APPLICATIONS.md** | **Design System, Factory Hooks, Next.js, Expo** |
| 4 | [PART4-AGENT-SKILL-SYSTEM.md](./PART4-AGENT-SKILL-SYSTEM.md) | Agent Migration, Hermes Skills, MCP Catalog |
| 5 | [PART5-TESTING-DEPLOYMENT.md](./PART5-TESTING-DEPLOYMENT.md) | Verification, VPS Setup, Use Cases, Timeline |

> [!NOTE]
> **Changes from the prior draft (audit-driven):** added the query-key factory + generic factory hooks (DNA P2, fix B2); added the WebSocket auth-handshake client; mandated importing **generated** types from `@jarvis/shared` (P6); documented the conscious single-tier / dark-only scope deviations from the DNA.

---

## 3.0 Architectural Conformance Notes (explicit DNA deviations)

JARVIS v1.5 is a **single-user operator tool**, so two DNA defaults are deliberately scoped down. These are conscious decisions, recorded so they are visible (DNA P5), not accidental gaps:

| DNA default | v1.5 decision | Rationale | Revisit at |
|-------------|---------------|-----------|-----------|
| Three-Tier Role Architecture (§4.1) | **Single operator tier** (one `(dashboard)` group) | One human operator; no public catalog, no end-customer tier | Multi-tenant SaaS (v2.0) reintroduces Public + Admin tiers |
| Dual theme from day one (§8.3) | **Dark-only** | Command-center aesthetic; matches the existing mockup | Tokens are already OKLCH semantic — light theme is an additive set later |

Everything else (P1, P2, P5, P6, premium UI) is held to full DNA standard.

---

## 3.1 Design System — Carried From the Dashboard Mockup

The existing HTML mockup (`dashboard/`) defines the design language. Port it to React with these exact specifications.

### Color Tokens (OKLCH — Dark, semantic)

```css
/* apps/web/styles/globals.css */
@layer base {
  :root {
    --background: oklch(0.00 0 0);          /* true black */
    --foreground: oklch(0.95 0 0);          /* near white */
    --card: oklch(0.12 0 0);
    --card-foreground: oklch(0.95 0 0);
    --popover: oklch(0.14 0 0);
    --popover-foreground: oklch(0.95 0 0);
    --primary: oklch(0.95 0 0);
    --primary-foreground: oklch(0.10 0 0);
    --secondary: oklch(0.15 0 0);
    --secondary-foreground: oklch(0.85 0 0);
    --muted: oklch(0.10 0 0);
    --muted-foreground: oklch(0.55 0 0);
    --accent: oklch(0.15 0 0);
    --accent-foreground: oklch(0.95 0 0);
    --destructive: oklch(0.55 0.20 25);
    --destructive-foreground: oklch(0.95 0 0);
    --border: oklch(0.20 0 0);
    --input: oklch(0.15 0 0);
    --ring: oklch(0.50 0 0);
    --radius: 1rem;

    /* Status — semantic tokens (never use raw color utilities) */
    --success: oklch(0.70 0.17 155);
    --warning: oklch(0.80 0.15 85);
    --error:   oklch(0.65 0.20 25);
    --info:    oklch(0.70 0.13 230);
  }
}
```

> **Absolute rule (DNA P4):** never `bg-white`, `text-black`, or raw `text-gray-*`. Always semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `text-success`). Part 5 Phase C greps for violations and fails the gate on any hit.

### Typography
```
Primary:   Outfit (Google Fonts) — geometric, clean
Monospace: Fira Code — code, logs, terminal
Body base: 13px (dense operator UI)
Headings:  Bold, tight tracking
```

### Glassmorphism + Motion
```tsx
// The glass surface — elevated panels
<div className="bg-card/80 backdrop-blur-xl border border-border/50
                rounded-2xl shadow-sm shadow-black/5
                transition-all duration-200 hover:border-border" />
```
```ts
// apps/web/lib/motion.ts
export const MOTION = {
  fast:   { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  normal: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  slow:   { duration: 0.4,  ease: [0.4, 0, 0.2, 1] },
  spring: { type: "spring", stiffness: 300, damping: 30 },
};
export const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
};
```

---

## 3.2 The Factory Data Layer (Pillar P2 — Audit fix B2)

> [!IMPORTANT]
> The web and mobile clients consume the API's CRUD factory (Part 2 §2.4) through **one** matching set of generic hooks and **one** structured query-key factory. No feature writes its own fetch/create/update/delete. Types come from `@jarvis/shared` — the generated source of truth (P6).

### Query-Key Factory — `apps/web/lib/query-keys.ts`
```ts
// Structured, predictable keys → mutation on any entity invalidates exactly the right queries.
export const keys = {
  entity: (e: string) => [e] as const,                                  // invalidation target
  list:   (e: string, opts?: object) => [e, "list", opts ?? {}] as const,
  doc:    (e: string, id: string) => [e, "doc", id] as const,
};
// e.g. keys.list("workflows", { page: 1 })  ·  keys.doc("workflows", id)
```

### API Client — `apps/web/lib/api.ts`
```ts
import type { ApiResponse } from "@jarvis/shared/types/api";
import { supabase } from "./supabase/client";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!("ok" in body) || body.ok === false) {
    throw new ApiClientError(body.ok === false ? body.error : { code: "INTERNAL", message: res.statusText });
  }
  return body as unknown as T;
}
export const api = {
  list:   <T>(e: string, q?: Record<string, unknown>) => request<{ data: T[]; total: number; hasMore: boolean }>(`/api/${e}?${new URLSearchParams(q as any)}`),
  get:    <T>(e: string, id: string) => request<{ data: T }>(`/api/${e}/${id}`),
  create: <T>(e: string, body: unknown) => request<{ data: T }>(`/api/${e}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T>(e: string, id: string, body: unknown) => request<{ data: T }>(`/api/${e}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (e: string, id: string) => request<{ data: { id: string } }>(`/api/${e}/${id}`, { method: "DELETE" }),
};
```

### Generic Hooks — `apps/web/hooks/use-entity.ts`
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keys } from "@/lib/query-keys";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useList<T>(entity: string, opts?: Record<string, unknown>) {
  return useQuery({ queryKey: keys.list(entity, opts), queryFn: () => api.list<T>(entity, opts) });
}
export function useDoc<T>(entity: string, id: string) {
  return useQuery({ queryKey: keys.doc(entity, id), queryFn: () => api.get<T>(entity, id), enabled: !!id });
}
function useInvalidate(entity: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.entity(entity) });
}
export function useCreate<T>(entity: string) {
  const invalidate = useInvalidate(entity);
  return useMutation({
    mutationFn: (body: unknown) => api.create<T>(entity, body),
    onSuccess: () => { invalidate(); toast.success("Created"); },
    onError: (e: any) => toast.error(e.message ?? "Create failed"),
  });
}
export function useUpdate<T>(entity: string) {
  const invalidate = useInvalidate(entity);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.update<T>(entity, id, body),
    onSuccess: () => { invalidate(); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });
}
export function useDelete(entity: string) {
  const invalidate = useInvalidate(entity);
  return useMutation({
    mutationFn: (id: string) => api.remove(entity, id),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
}
```

**Usage in a page (the entire data layer for Workflows):**
```ts
import type { Workflow } from "@jarvis/shared/types";          // generated type
const { data, isLoading } = useList<Workflow>("workflows", { page });
const create = useCreate<Workflow>("workflows");
// create.mutate({ name, trigger: "manual", skill_name }) → auto-invalidates the list
```

> The **same** `packages/shared` types feed the Expo app's hooks (`apps/mobile/hooks/use-entity.ts`), which are identical minus the `toast`/web bindings. One contract, two clients (DNA P3 cross-platform readiness).

---

## 3.3 Next.js Web Dashboard — Page Specifications

Port all 10 pages from the HTML mockup. Each connects to the Fastify API via the factory hooks above (replacing mock data). Single operator tier → one `(dashboard)` route group (§3.0).

| Page | Source Mockup | Key Components | Data Source |
|------|--------------|----------------|-------------|
| Dashboard | `index.html` | StatCard ×4, QuickActions, ServiceHealth, ModelUsage, ActiveWorkflows, ActivityFeed | `useQuery /api/analytics/overview` + `/api/services` + `useList("workflows")` |
| Services | `services.html` | ServiceCard ×N, BulkActions, DockerNetworkViz | `/api/services`, `POST /api/services/:name/restart` |
| Models | `models.html` | OpenRouterStatus, RoutingConfig, ModelCards ×3 | `/api/models`, `/api/models/usage` |
| Integrations | `integrations.html` | IntegrationCard ×N, AddIntegration dialog | `useList/useCreate("integrations")`, `POST /api/integrations/:id/test` |
| Workflows | `workflows.html` | WorkflowCard, CronJobsTable | `useList/useCreate/useUpdate/useDelete("workflows")`, `POST :id/trigger` |
| Chat | `chat.html` | ChatBubble, MessageInput, QuickCommands, SessionList | `/api/chat/*` + WebSocket `chat:stream` (§3.4) |
| Logs | `logs.html` | LogViewer (terminal-style), LevelFilters, ServiceFilter | `/api/logs` + SSE `/api/logs/stream` |
| Config | `config.html` | FileExplorer, CodeEditor, EnvVarDisplay (masked) | `/api/admin/system` |
| Analytics | `analytics.html` | StatCards, CostSavings, ModelUsageChart, DailyActiveTime, TaskCompletion | `/api/analytics/*` |
| Admin | `admin.html` | SystemInfo, SecuritySettings, BackupControls, SystemActions | `/api/admin/*` (role ≥ admin) |

**Mandatory states for every data view (DNA P4):** skeleton loading (never spinners), empty state with CTA, error state with retry, Framer Motion stagger on mount. TypeScript strict; zero `any` in committed code.

---

## 3.4 Realtime Client — WebSocket with Auth + Reconnect

Matches the Part 2 §2.8 handshake. Shared logic lives in `apps/web/hooks/use-websocket.ts` and `apps/mobile/lib/websocket.ts`.

```ts
// apps/web/hooks/use-websocket.ts (core)
import { supabase } from "@/lib/supabase/client";

export function connectWs(onEvent: (e: WsEvent) => void) {
  let ws: WebSocket; let retries = 0; let alive = true;

  async function open() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;                                  // not authed → no socket
    ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws?token=${session.access_token}`);
    ws.onopen = () => { retries = 0; };
    ws.onmessage = (m) => onEvent(JSON.parse(m.data));
    ws.onclose = (e) => {
      if (!alive || e.code === 4401) return;               // 4401 = auth rejected, don't retry blindly
      const backoff = Math.min(1000 * 2 ** retries++, 30_000);
      setTimeout(open, backoff);                           // exponential backoff, cap 30s
    };
  }
  open();
  return () => { alive = false; ws?.close(); };
}
```

- Token is passed as a query param over **TLS** (browsers can't set WS headers); the API verifies before upgrade.
- On `4401` (auth rejected) the client refreshes the Supabase session once, then retries; repeated failure routes to `/login`.
- Heartbeat handled transparently (server `ping`/client `pong`).

---

## 3.5 Expo Mobile App — Screen Specifications

| Tab | Purpose | Key Components |
|-----|---------|----------------|
| **Dashboard** | At-a-glance status | StatCards (2×2), ServiceHealthList, RecentActivity (FlatList), pull-to-refresh |
| **Chat** (primary) | Talk to JARVIS | ChatBubble list, TextInput + Send, QuickCommandChips (h-scroll), VoiceInput (Expo Audio), SessionPicker |
| **Workflows** | View/trigger | WorkflowCard list, one-tap trigger, StatusBadge, RunHistory |
| **Settings** | Config | Server URL, Notifications toggle, Theme (dark, v1.5), About/Version, Logout |

**Mobile-specific:**
1. **Push** — Expo Notifications, triggered by the WS `notification` event.
2. **Voice** — Expo Audio → speech-to-text → send as chat message.
3. **Haptics** — Expo Haptics on triggers/sends.
4. **Secure storage** — Expo SecureStore for the Supabase session (refresh token), never plaintext AsyncStorage.
5. **Deep linking** — `jarvis://chat/session/:id`.

The mobile app reuses `@jarvis/shared` types + the same query-key factory and generic hooks (§3.2) — only the transport/storage adapters differ.

---

> **← Previous:** [Part 2: Database Schema & API Design](./PART2-DATABASE-API.md)  
> **Next:** [Part 4: Agent & Skill System →](./PART4-AGENT-SKILL-SYSTEM.md)

---

*JARVIS v1.5 Master Architecture Document — Part 3 of 5*  
*© 2026 Kidus Abdula / VersaLabs Studio. All rights reserved.*
