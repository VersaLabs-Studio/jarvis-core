## D2 FIX ANALYSIS: API Contract Mismatch (Blocker 2)

### Summary
Both web and mobile clients are calling different API endpoints than what the server actually provides. This would cause 404s for any CRUD operations, making the mobile client unusable against the live API.

### Current Client State

#### Web Client (`apps/web/src/lib/api.ts`)
**Calls made by web:**
```ts
/api/workflows                     // GET /api/workflows
/api/chat_sessions                 // GET /api/chat_sessions
/api/models                        // GET /api/models (bypasses factory)
/api/analytics                     // GET /api/analytics (bypasses factory)
/api/logs                          // GET /api/logs (bypasses factory)
/api/chat_sessions/:id/messages     // GET /api/chat_sessions/:id/messages (bypasses factory)
/api/workflows/:id/trigger         // POST /api/workflows/:id/trigger (bypasses factory)
```

**Web uses shared factory:**
- Dashboard page: `keys.services.list()` → `api.list("services")` → `/api/services`
- Chat hooks: `keys.chat_sessions.list()` → `api.list("chat_sessions")` → `/api/chat_sessions`
- Logs hooks: `keys.system_logs.list()` → `api.getRaw(...)` → `/api/logs`
- Analytics hooks: `keys.analytics_events.list()` → `api.getRaw(...)` → `/api/analytics`

#### Mobile Client (`apps/mobile/lib/api.ts`)
**Calls made by mobile:**
```ts
/api/${entity}                     // GET /api/${entity}
/api/${entity}/${id}               // GET /api/${entity}/${id}
/api/${entity} (POST)              // POST /api/${entity}
/api/${entity}/${id} (PATCH)       // PATCH /api/${entity}/${id}
/api/${entity}/${id} (DELETE)      // DELETE /api/${entity}/${id}
```

**Mobile uses shared factory:**
- All hooks: `keys.[entity].list()` → `api.list<T>(entity)` → `/api/${entity}`

### Server State (Inferred from User Report)
**Server has:**
```
/api/cms/workflows                     // GET /api/cms/workflows
/api/cms/chat_sessions                 // GET /api/cms/chat_sessions
/api/cms/workflow_runs                  // GET /api/cms/workflow_runs
/api/cms/analytics_events               // GET /api/cms/analytics_events
/api/cms/system_logs                    // GET /api/cms/system_logs
/api/cms/models                        // GET /api/cms/models
/api/cms/integrations                  // GET /api/cms/integrations
/api/cms/secrets                        // GET /api/cms/secrets
/api/cms/skills                        // GET /api/cms/skills
/api/cms/services                      // GET /api/cms/services

# Chat Messages Path
/api/chat/sessions/:id/messages         // GET /api/chat/sessions/:id/messages
```

### Contract Deviation Analysis

#### 1. Base Path Mismatch
- **Web Client (current)**: `/api/workflows`, `/api/chat_sessions`, `/api/models`
- **Server (expected)**: `/api/cms/workflows`, `/api/cms/chat_sessions`, `/api/cms/models`

#### 2. Chat Messages Path Mismatch
- **Web Client (current)**: `/api/chat_sessions/:id/messages`
- **Server (expected)**: `/api/chat/sessions/:id/messages`

#### 3. Partial Factory Adoption
- **Web**: Mix of factory-based and direct API calls
- **Mobile**: Fully factory-based

### Impact Assessment

#### Immediate Impact
- **Mobile**: Will call `/api/workflows` vs `/api/cms/workflows` → 404
- **Web**: Same issue for non-factory calls

#### Propagating Impact
- Dashboard (services) might work if server has `/api/services`
- CRUD operations will fail for all entities
- Type safety is maintained but endpoint routing is broken

### Required Fixes

#### 1. Endpoint Alignment
**Option A: Client → Server** (recommended)
```diff
- /api/workflows → /api/cms/workflows
- /api/chat_sessions → /api/cms/chat_sessions
- /api/models → /api/cms/models
- /api/analytics → /api/cms/analytics_events
- /api/logs → /api/cms/system_logs
- /api/chat_sessions/:id/messages → /api/chat/sessions/:id/messages
```

**Option B: Server → Client** (less preferred)
Create server endpoints at both `/api/[entity]` and `/api/cms/[entity]`

#### 2. Consistent Factory Usage
Ensure web client uses shared factory consistently:
```diff
# In analytics/_hooks/use-analytics.ts
- api.getRaw<{ data: AnalyticsSummary }>("/api/analytics")
+ api.list<AnalyticsSummary>("analytics_events")

# In logs/_hooks/use-logs.ts  
- api.getRaw<{ data: SystemLog[] }>("/api/logs${qs ? `?${qs}` : ""}`)
+ api.list<SystemLog>("system_logs", { ...filters })

# In models/page.tsx
- api.getRaw<ModelsResponse>("/api/models")
+ api.list<ModelsResponse>("models")
```

### Priority for D2
1. **Immediate (Must Fix)**: Align API endpoints between clients and server
2. **Medium (Prevents Drift)**: Standardize web client to use shared factory
3. **Low (Technical Debt)**: Fix data-states.tsx typecheck issue

### Current State
- **Web client partially factory-compliant** (some files use factory, others don't)
- **Mobile client fully factory-compliant** 
- **API endpoints misaligned with server** (major blocker)
- **Documentation exists** (`docs/PHASE-D-DESIGN-SYSTEM.md`, `docs/PHASE-D-D2-FIX-1.md`)

### Next Steps
1. Apply endpoint alignment fix (Option A)
2. Refactor web client to use shared factory consistently
3. Commit changes with clear documentation of API contract alignment
4. Re-run all gates for verification
