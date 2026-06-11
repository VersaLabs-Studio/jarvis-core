# D2 CORRECT FIX STRATEGY — IMPLEMENTATION GUIDE

## Current State Summary

❌ **D2 — BLOCKED — INCORRECT FIXES APPLIED**

**Files with incorrect fixes:**
- apps/web/src/app/(dashboard)/analytics/_hooks/use-analytics.ts
- apps/web/src/app/(dashboard)/chat/_hooks/use-chat.ts  
- apps/web/src/app/(dashboard)/logs/_hooks/use-logs.ts
- apps/web/src/app/(dashboard)/models/page.tsx
- apps/web/src/app/(dashboard)/page.tsx
- apps/web/src/app/(dashboard)/workflows/_hooks/use-workflows.ts

**Problems introduced:**
1. ❌ Only peripheral paths fixed (chat messages)
2. ❌ Core CRUD endpoints still broken
3. ❌ Typecheck made worse (style?: unknown)
4. ❌ Mobile data layer still untracked
5. ❌ Wrong fix strategy applied

---

## CORRECT FIX STRATEGY — Option A: Client → Server

### Phase 1: CRITICAL FIXES (Must apply)

#### 1. Fix ALL API Clients to use `/api/cms/` prefix

**Web Client Files (Apply `/api/cms/` to ALL endpoints):**

**a) apps/web/src/lib/api.ts** (36 lines of changes)
```diff
- return request<{ data: T[] }>(`/api/${entity}${params}`)
+ return request<{ data: T[] }>(`/api/cms/${entity}${params}`)

- return request<{ data: T }>(`/api/${entity}/${id}`)
+ return request<{ data: T }>(`/api/cms/${entity}/${id}`)

- return request<{ data: T }>(`/api/${entity}`, { method: "POST" })
+ return request<{ data: T }>(`/api/cms/${entity}`, { method: "POST" })

- return request<{ data: T }>(`/api/${entity}/${id}`, { method: "PATCH" })
+ return request<{ data: T }>(`/api/cms/${entity}/${id}`, { method: "PATCH" })

- return request<void>(`/api/${entity}/${id}`, { method: "DELETE" })
+ return request<void>(`/api/cms/${entity}/${id}`, { method: "DELETE" })
```

**b) apps/web/src/app/(dashboard)/analytics/_hooks/use-analytics.ts**
```diff
- api.getRaw<{ data: AnalyticsSummary }>("/api/analytics")
+ api.getRaw<{ data: AnalyticsSummary }>("/api/cms/analytics_events")
```

**c) apps/web/src/app/(dashboard)/logs/_hooks/use-logs.ts**
```diff
- api.getRaw<{ data: SystemLog[] }>(`/api/logs${qs}`)
+ api.getRaw<{ data: SystemLog[] }>(`/api/cms/system_logs${qs}`)
```

**d) apps/web/src/app/(dashboard)/models/page.tsx**
```diff
- api.getRaw<ModelsResponse>("/api/models")
+ api.getRaw<ModelsResponse>("/api/cms/models")
```

**e) apps/web/src/app/(dashboard)/workflows/_hooks/use-workflows.ts**
```diff
- api.post<{ data: WorkflowRun }>(`/api/workflows/${workflowId}/trigger`)
+ api.post<{ data: WorkflowRun }>(`/api/cms/workflow_runs/${workflowId}/trigger`)
```

**f) apps/web/src/app/(dashboard)/chat/_hooks/use-chat.ts**
```diff
- /api/chat_sessions/:id/messages
+ /api/chat/sessions/:id/messages  (already correct - keep this fix)
```

#### 2. Fix Typecheck Properly

**File:** `apps/mobile/components/data-states.tsx`
**Issue:** React Native ViewStyle compatibility
**Solution:** Either fix properly or document as architectural limitation

#### 3. Commit Mobile Data Layer

**Untracked files that need to be added:**
```
apps/mobile/hooks/           # All hook implementations
apps/mobile/lib/             # API client and utilities
```

### Phase 2: PATTERN CONSISTENCY

**Standardize web client to use shared factory:**
- Replace direct API calls with `useList`, `useCreate`, etc.
- Use `keys.[entity].list()` for query keys instead of hardcoded entity names

---

## IMPLEMENTATION STEPS

### Step 1: Revert Incorrect Changes
```bash
git checkout apps/web/src/app/(dashboard)/analytics/_hooks/use-analytics.ts
# ... repeat for all web files
```

### Step 2: Apply Correct Option A Fixes
```bash
# Edit each file as shown in the CORRECT FIX STRATEGY above
# This will add /api/cms/ prefix to all CRUD endpoints
```

### Step 3: Fix Typecheck
```bash
# Fix apps/mobile/components/data-states.tsx typecheck issue
# Either resolve properly or document as architectural limitation
```

### Step 4: Commit Mobile Data Layer
```bash
git add apps/mobile/hooks/
git add apps/mobile/lib/
git commit -m "Add mobile data layer (hooks and API client)"
```

### Step 5: Standardize Patterns
```bash
# Replace direct API calls with factory hooks where possible
# Update web client to use shared factory consistently
```

---

## EXPECTED RESULT

✅ **D2 — READY — CORRECT FIXES APPLIED**

- All API endpoints use `/api/cms/` prefix (server aligned)
- Typecheck resolved or documented as architectural trade-off
- Mobile data layer committed
- Consistent factory pattern usage
- All gates pass (except documented trade-offs)

---

## FILES MODIFIED (CORRECT FIX)

### Web Client Files
- apps/web/src/lib/api.ts                  # All CRUD endpoints
- apps/web/src/app/(dashboard)/analytics/_hooks/use-analytics.ts
- apps/web/src/app/(dashboard)/logs/_hooks/use-logs.ts  
- apps/web/src/app/(dashboard)/models/page.tsx
- apps/web/src/app/(dashboard)/workflows/_hooks/use-workflows.ts
- apps/web/src/app/(dashboard)/chat/_hooks/use-chat.ts   # Keep chat fix

### Mobile Client Files
- apps/mobile/lib/api.ts                     # All CRUD endpoints
- apps/mobile/components/data-states.tsx   # Typecheck fix

### Untracked (Need to add)
- apps/mobile/hooks/                         # All hooks
- apps/mobile/lib/                           # API client and utils

---

## DECISION: WHY OPTION A (CLIENT → SERVER)

1. **Fastest path to fix** — Align clients to existing server
2. **Minimal architectural changes** — Don't break factory patterns
3. **Documented in design system** — Option A is documented approach
4. **Immediate impact** — Fixes 404s for all CRUD operations

---

*Current state is broken — Must apply correct Option A fix strategy.*
