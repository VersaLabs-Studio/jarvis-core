# JARVIS v1.5 — Architecture Compliance & Robustness Audit

> **Auditor standard:** Architectural DNA v1.0.0 (`ARCHITECTURAL_DNA.md`)
> **Artifacts under review:** PART1–PART5 (v1.5 Master Architecture)
> **Date:** June 2026
> **Verdict:** Conditional Pass — strong on infra/UI/docs, three structural gaps must close before "implementation-ready" is true.

---

## Overall Score: 7.4 / 10

The v1.5 architecture is a genuinely strong, infrastructure-complete specification — Docker topology, monorepo layout, design system, and use-case catalog are top decile. It loses points on three **structural** issues that directly violate the Six Pillars, plus a cluster of **production-hardening** gaps that the "single-VPS, single-user" framing doesn't excuse. None are fatal; all are fixable inside the existing document structure. With the remediation plan applied, this rises to ~9.2/10.

---

## Per-Pillar Scorecard

| Pillar | Score | Evidence | Gap |
|--------|:----:|----------|-----|
| **P1 — Schema-First** | 6/10 | Part 2 §2.1 ships a complete SQL schema, RLS, triggers before app code ✅ | **Dual source of truth:** Part 1 monorepo tree declares `apps/api/src/db/schema.ts` "Drizzle ORM schema definitions" while Part 2 declares hand-written `docs/schema.sql` run directly in the Supabase dashboard. Two authorities for one data model = the exact drift P1 forbids. |
| **P2 — Factory Pattern** | 3/10 | — | **Largely absent.** DNA mandates generic CRUD route factories, a query-key factory, and `useList/useDoc/useCreate/useUpdate/useDelete` hooks. Part 2 lists hand-enumerated Fastify routes; Part 3 lists hand-written hooks (`use-auth`, `use-websocket`). The 70%-boilerplate-reduction engine is missing. |
| **P3 — Extreme Modularization** | 8/10 | Part 1 monorepo: per-feature dirs, `ui/ → shared/ → feature/` direction, packages/shared boundary ✅ | Three-tier role split (DNA §4.1) is single-tier here (one `(dashboard)` group). Defensible for a single-user tool, but should be stated as a conscious deviation, not left implicit. |
| **P4 — Premium UI** | 9/10 | Part 3 §3.1: OKLCH tokens, glassmorphism, Framer Motion constants, Outfit/Fira Code ✅ | Dark-only for v1.5 (DNA wants dual-theme from day one). Acceptable as a stated v1.5 scope cut. Minor: status colors defined but no semantic-token mapping table. |
| **P5 — Docs-as-Architecture** | 9/10 | Five-part master doc, written before code, cross-linked, phase-gated ✅ | Part 1's `docs/` index lists files that don't exist (ARCHITECTURE.md/DEPLOYMENT.md/API-REFERENCE.md/AGENTS.md) instead of the real PART1–5 deliverables. Self-referential inconsistency. |
| **P6 — End-to-End Type Safety** | 6/10 | `packages/shared/types` + Zod schemas exist ✅ | Types are **hand-written**, not generated from the schema → reintroduces the drift P1/P6 exist to kill. No `supabase gen types` step. No runtime env validation. No shared API error/response contract types. |

---

## Blocker Findings (must fix to be buildable / safe)

**B1 — Dual source of truth for the data model.** *Severity: High. Location: Part 1 §1.3 tree (`db/schema.ts`), Part 2 §2.1.*
Drizzle schema and raw `schema.sql` both claim authority. **Fix:** Designate **versioned SQL migrations (`supabase/migrations/NNNN_*.sql`) as the single source of truth.** Generate `packages/shared/types` via `supabase gen types typescript`. Derive Zod schemas from those types. Remove the Drizzle ORM line from Part 1 (or demote Drizzle to a typed query *builder* that imports the generated types — not a second schema authority).

**B2 — Factory layer missing (P2 violation).** *Severity: High. Location: Part 2 §2.2, Part 3 §3.2.*
**Fix:** Add an API CRUD-factory section to Part 2 (`createListHandler/createGetHandler/createCreateHandler/createUpdateHandler/createDeleteHandler` driven by an entity config) and a client factory-hooks + query-key-factory section to Part 3. Hand-written routes remain only for non-CRUD verbs (chat stream, service control, workflow trigger).

**B3 — Invalid nginx rate-limit config.** *Severity: High (won't start). Location: Part 1 §1.6.*
`limit_req_zone` is declared inside the `server {}` block; nginx only accepts it in the `http {}` context. As written, nginx fails to load. **Fix:** Move both `limit_req_zone` directives into `nginx.conf`'s `http {}` block; keep only `limit_req zone=...` in the `location` blocks.

**B4 — No TLS in the compose topology, but Part 5 promises HTTPS.** *Severity: High. Location: Part 1 §1.4 (nginx 80 only) vs Part 5 §5.2/checklists (Let's Encrypt/SSL).* 
**Fix:** Wire `443`, mount certs, add an ACME/certbot flow, redirect 80→443, add HSTS. Make the compose file and the deployment narrative agree.

**B5 — Auth model ambiguity.** *Severity: Medium-High. Location: Part 1 env (`JWT_SECRET`), Part 2 §2.2 (`/auth/register` mints tokens) vs Supabase Auth.*
Two competing auth systems (custom JWT vs Supabase Auth). **Fix:** Standardize on **Supabase Auth issues JWTs; the API verifies them** (`JWT_SECRET` = the Supabase JWT secret, used only for verification). Document the exact verification path and that the API never mints its own tokens.

---

## Hardening Findings (pragmatic single-VPS)

**H1 — `docker.sock` mounted into two containers (api + hermes).** Root-equivalent on the host; container escape risk. **Fix:** Front the socket with a least-privilege **docker-socket-proxy** (Tecnativa); grant the API only the endpoints it needs (containers: read + restart), keep Hermes' code-exec sandbox separate and resource-capped. Never mount the raw socket into the web container.

**H2 — MCP servers run `npx -y <pkg>` at runtime, unpinned.** 9× `node:20-slim` each cold-installing latest on boot = supply-chain exposure + slow starts + thin-RAM risk. **Fix:** Pin exact versions, bake a prebuilt MCP image (deps installed at build), add `mem_limit` per container, and keep optional servers behind compose `profiles` (already partially done).

**H3 — Integration secrets "encrypted at app layer" — no mechanism.** **Fix:** Specify AES-256-GCM via a `MASTER_ENCRYPTION_KEY` (or **Supabase Vault**) with the exact encrypt/decrypt boundary; never store provider tokens in plaintext `integrations.config`.

**H4 — RLS uses a correlated subquery per row.** `tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())` runs per row. **Fix:** Put `tenant_id` into the JWT as a custom claim and use `(auth.jwt() ->> 'tenant_id')::uuid` (O(1), no subquery); wrap `auth.uid()` as `(select auth.uid())` so the planner caches it.

**H5 — No backup / restore / migration versioning.** **Fix:** Nightly `pg_dump` in `scripts/backup.sh` to off-box storage; adopt `supabase/migrations` as the versioned change log; document restore.

**H6 — No observability or error tracking.** **Fix (light):** structured `pino` logs → `system_logs`, a `/metrics` endpoint, healthcheck aggregation in `/api/admin/health`, and Sentry/GlitchTip (free) for error capture. No heavy Grafana stack needed at this scale.

**H7 — Missing healthchecks + resource limits.** `web` and `nginx` have no healthcheck; no service has `mem_limit`. **Fix:** Add both; enforces the Part 1 resource budget instead of just asserting it.

**H8 — Single VPS = SPOF.** Acceptable for v1.5, but **state it explicitly** with the recovery path (rebuild from compose + restore from backup) so it's a documented trade-off, not a blind spot.

---

## Consistency Findings

- **C1** — Part 1 `docs/` index ≠ actual deliverables (lists ARCHITECTURE/DEPLOYMENT/API-REFERENCE/AGENTS; reality is PART1–5 + this audit). Fix the index.
- **C2** — "18 skill documents" (Part 1 §1.3 lists 18 files; Part 5 Phase E asserts 18). Part 4 enumerates 7 migrated + 5 DNA skills + ~18 new — counts don't reconcile. Pick one canonical list and make every reference match.
- **C3** — Drizzle (Part 1) vs raw SQL (Part 2) — see B1.
- **C4** — MCP package names: `@supabase/mcp-server` → real is **`@supabase/mcp-server-supabase`**; `@anthropic/mcp-server-{browser,slack,linear}` don't exist under that scope; `@vercel/mcp-server` and `@modelcontextprotocol/server-gmail` need verification. Correct + pin.
- **C5** — Model IDs: `nvidia/nemotron-3-super-120b-a12b:free` ✅ verified; `zhipu/glm-5-turbo` → GLM-5 is under **Z.ai** (`z-ai/glm-5`); `minimax/minimax-m2-5:free` → MiniMax **M2.5** slug needs the real form. Add a "verify at openrouter.ai/models on deploy" note.

---

## Prioritized Remediation Plan (by Part)

**Part 1 (minimal edits):** fix `docs/` index (C1); drop the Drizzle "schema definitions" line, point `db/` at the generated-types client (B1); note socket-proxy service (H1).

**Part 2 (rewrite):** SQL migrations as single source + `supabase gen types` step (B1/P6); CRUD route-factory section (B2); Supabase-Auth verification model (B5); standard error envelope + pagination contract; integration-secret encryption (H3); hardened JWT-claim RLS (H4); migrations/backup pointer (H5).

**Part 3 (rewrite):** query-key factory + factory hooks (`useList/useDoc/useCreate/useUpdate/useDelete`) (B2); WebSocket auth handshake; generated-types import discipline (P6); keep design system; state dark-only + single-tier deviations (P3/P4).

**Part 4 (rewrite):** correct + pin MCP package names (C4); canonical skill list + reconciled count (C2); Hermes HTTP/WS API contract; socket-proxy + sandbox security (H1/H2); model-ID note (C5).

**Part 5 (rewrite):** move `limit_req_zone` to `http{}` (B3); full TLS wiring + 80→443 + HSTS (B4); backup/restore + migration versioning (H5); light observability + error tracking (H6); healthchecks + `mem_limit` (H7); SPOF trade-off statement (H8); env-validation + load-test in the gate.

---

> *Note on process: the dedicated `auditor` subagent was dispatched twice and stalled both times (0 tool calls). This report was produced inline against the same standard so the deliverable wasn't blocked. Re-spawning the agent is worth retrying in a future session if a fresh Pro window is available.*

*JARVIS v1.5 Architecture Audit — © 2026 Kidus Abdula / VersaLabs Studio.*
