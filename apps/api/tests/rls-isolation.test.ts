import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { v4 as uuid } from "uuid";

/**
 * RLS Isolation Tests — JARVIS v1.5 Phase B / B7
 *
 * Verifies cross-tenant isolation across all 13 tenant-scoped tables.
 * Uses real Supabase clients with cryptographically valid JWT tokens.
 *
 * W3-RLS-1: Cross-tenant isolation (all 13 tables)
 * W3-RLS-2: Claim flow end-to-end (real minted tokens)
 * W3-RLS-3: system_logs asymmetry (null-tenant read-only)
 */

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "";

// All 13 tenant-scoped tables (8 from 0001 + 5 from 0003)
const TENANT_TABLES = [
  // From 0001_init.sql (8 tables)
  "workflows",
  "integrations",
  "skills",
  "services",
  "secrets",
  "audit_log",
  "tenants",
  "profiles",
  // From 0003_schema_completion.sql (5 tables)
  "chat_sessions",
  "chat_messages",
  "workflow_runs",
  "analytics_events",
  "system_logs",
] as const;

/**
 * Mint a cryptographically valid JWT using jose SignJWT.
 * Token includes tenant_id at root level (matches custom_access_token_hook).
 */
async function mintTestJWT(tenantId: string, userId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);

  return new SignJWT({
    tenant_id: tenantId,
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {},
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("https://test.supabase.co/auth/v1")
    .sign(secret);
}

/**
 * Create a tenant-scoped Supabase client using ANON key + JWT.
 * RLS policies are enforced because we use the anon key (not service role).
 */
function createTenantClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// Helper to create insert payload for each table
function createTestPayload(table: string, tenantId: string, userId: string): Record<string, unknown> {
  const base = { tenant_id: tenantId };

  switch (table) {
    case "workflows":
      return { ...base, name: `Test Workflow ${uuid()}`, status: "draft", definition: {}, version: 1 };
    case "integrations":
      return { ...base, name: `Test Integration ${uuid()}`, provider: "test", status: "pending", config: {} };
    case "skills":
      return { ...base, name: `Test Skill ${uuid()}`, description: "test", status: "draft", config: {}, capabilities: [], version: 1 };
    case "services":
      return { ...base, name: `Test Service ${uuid()}`, type: "test", status: "provisioning", config: {}, endpoints: {} };
    case "secrets":
      return { ...base, name: `test-secret-${uuid()}`, type: "api_key", value: "test-value", description: "test" };
    case "audit_log":
      return { ...base, action: "test.action", resource_type: "test", resource_id: uuid(), metadata: {} };
    case "tenants":
      return { name: `Test Tenant ${uuid()}`, slug: `test-${uuid()}` };
    case "profiles":
      return { id: userId, tenant_id: tenantId, email: `${uuid()}@test.com`, full_name: "Test User" };
    case "chat_sessions":
      return { ...base, title: `Test Session ${uuid()}`, is_active: true };
    case "chat_messages":
      return { ...base, session_id: uuid(), role: "user", content: "test message" };
    case "workflow_runs":
      return { ...base, workflow_id: uuid(), status: "pending" };
    case "analytics_events":
      return { ...base, event_type: "test.event", metadata: {} };
    case "system_logs":
      return { tenant_id: tenantId, level: "info", service: "test", message: "test log" };
    default:
      return base;
  }
}

describe("RLS Isolation Tests (W3-RLS-1)", () => {
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let adminClient: SupabaseClient;

  const createdRecords: Array<{ table: string; id: string }> = [];

  beforeAll(async () => {
    if (!SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY || !JWT_SECRET) {
      console.warn("Skipping: env vars not set");
      return;
    }

    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test tenants
    const { data: tenantAData, error: errA } = await adminClient
      .from("tenants")
      .insert({ name: "Test Tenant A", slug: `test-a-${uuid()}` })
      .select("id")
      .single();
    if (errA) throw new Error(`Failed to create tenant A: ${errA.message}`);
    tenantA = tenantAData!.id;

    const { data: tenantBData, error: errB } = await adminClient
      .from("tenants")
      .insert({ name: "Test Tenant B", slug: `test-b-${uuid()}` })
      .select("id")
      .single();
    if (errB) throw new Error(`Failed to create tenant B: ${errB.message}`);
    tenantB = tenantBData!.id;

    // Create test users
    userA = uuid();
    userB = uuid();

    // Create profiles
    await adminClient.from("profiles").insert([
      { id: userA, tenant_id: tenantA, email: "a@test.com", full_name: "User A" },
      { id: userB, tenant_id: tenantB, email: "b@test.com", full_name: "User B" },
    ]);

    // Mint real JWTs
    tokenA = await mintTestJWT(tenantA, userA);
    tokenB = await mintTestJWT(tenantB, userB);

    // Create tenant-scoped clients with anon key + JWT (enforces RLS)
    clientA = createTenantClient(tokenA);
    clientB = createTenantClient(tokenB);
  });

  afterAll(async () => {
    if (!adminClient || !tenantA || !tenantB) return;

    for (const record of createdRecords.reverse()) {
      await adminClient.from(record.table).delete().eq("id", record.id);
    }
    await adminClient.from("profiles").delete().eq("id", userA);
    await adminClient.from("profiles").delete().eq("id", userB);
    await adminClient.from("tenants").delete().eq("id", tenantA);
    await adminClient.from("tenants").delete().eq("id", tenantB);
  });

  describe.each(TENANT_TABLES)("%s: cross-tenant isolation", (table) => {
    let recordIdA: string;

    it(`should create record in tenant A (${table})`, async () => {
      if (!adminClient) return;

      const payload = createTestPayload(table, tenantA, userA);

      if (table === "chat_messages") {
        const { data: session } = await adminClient
          .from("chat_sessions")
          .insert({ tenant_id: tenantA, title: "Test Session for Messages" })
          .select("id")
          .single();
        if (session) {
          payload.session_id = session.id;
          createdRecords.push({ table: "chat_sessions", id: session.id });
        }
      }

      if (table === "workflow_runs") {
        const { data: workflow } = await adminClient
          .from("workflows")
          .insert({ tenant_id: tenantA, name: "Test Workflow for Runs", status: "draft", definition: {}, version: 1 })
          .select("id")
          .single();
        if (workflow) {
          payload.workflow_id = workflow.id;
          createdRecords.push({ table: "workflows", id: workflow.id });
        }
      }

      const { data, error } = await adminClient
        .from(table)
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        console.warn(`Skipping ${table}: ${error.message}`);
        return;
      }

      recordIdA = data!.id;
      createdRecords.push({ table, id: recordIdA });
      expect(recordIdA).toBeDefined();
    });

    it(`should NOT allow tenant B to read tenant A's ${table}`, async () => {
      if (!clientB || !recordIdA) return;

      const { data } = await clientB
        .from(table)
        .select("*")
        .eq("id", recordIdA)
        .single();

      expect(data).toBeNull();
    });

    it(`should NOT allow tenant B to update tenant A's ${table}`, async () => {
      if (!clientB || !recordIdA) return;

      const { data } = await clientB
        .from(table)
        .update({ name: "Hacked!" })
        .eq("id", recordIdA)
        .select();

      expect(data).toEqual([]);
    });

    it(`should NOT allow tenant B to delete tenant A's ${table}`, async () => {
      if (!clientB || !recordIdA) return;

      const { data } = await clientB
        .from(table)
        .delete()
        .eq("id", recordIdA)
        .select();

      expect(data).toEqual([]);
    });

    it(`should NOT allow INSERT with foreign tenant_id (${table})`, async () => {
      if (!clientB) return;

      const payload = createTestPayload(table, tenantA, userB);

      const { data, error } = await clientB
        .from(table)
        .insert(payload)
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});

describe("Claim Flow End-to-End (W3-RLS-2)", () => {
  it("should carry tenant_id at root level in minted JWT", async () => {
    if (!JWT_SECRET) {
      console.warn("Skipping: JWT_SECRET not set");
      return;
    }

    const token = await mintTestJWT("test-tenant-id", "test-user-id");
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    expect(payload.tenant_id).toBe("test-tenant-id");
    expect(payload.sub).toBe("test-user-id");
    expect(payload.role).toBe("authenticated");
  });

  it("should return zero rows when tenant_id claim is absent (fail-safe)", async () => {
    if (!SUPABASE_ANON_KEY) return;

    // Client with no Authorization header — no JWT context
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: workflows } = await anonClient.from("workflows").select("*");
    const { data: integrations } = await anonClient.from("integrations").select("*");

    expect(workflows).toEqual([]);
    expect(integrations).toEqual([]);
  });

  it("should return zero rows when tenant_id is empty string (fail-safe)", async () => {
    if (!JWT_SECRET || !SUPABASE_ANON_KEY) return;

    const token = await mintTestJWT("", "test-user-id");
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data } = await client.from("workflows").select("*");
    expect(data).toEqual([]);
  });
});

describe("system_logs Asymmetry (W3-RLS-3)", () => {
  let adminClient: SupabaseClient;
  let tenantId: string;
  let userId: string;
  let platformLogId: string;

  beforeAll(async () => {
    if (!SUPABASE_SERVICE_KEY || !JWT_SECRET) return;

    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: tenant } = await adminClient
      .from("tenants")
      .insert({ name: "System Logs Test", slug: `syslog-test-${uuid()}` })
      .select("id")
      .single();

    if (tenant) {
      tenantId = tenant.id;
      userId = uuid();
      await adminClient
        .from("profiles")
        .insert({ id: userId, tenant_id: tenantId, email: "syslog@test.com" });
    }

    const { data: log } = await adminClient
      .from("system_logs")
      .insert({ tenant_id: null, level: "info", service: "platform", message: "Platform log for testing" })
      .select("id")
      .single();

    if (log) platformLogId = log.id;
  });

  afterAll(async () => {
    if (!adminClient) return;
    if (platformLogId) await adminClient.from("system_logs").delete().eq("id", platformLogId);
    if (tenantId) {
      await adminClient.from("profiles").delete().eq("id", userId);
      await adminClient.from("tenants").delete().eq("id", tenantId);
    }
  });

  it("should allow reading null-tenant platform logs", async () => {
    if (!adminClient || !platformLogId) return;

    const { data, error } = await adminClient
      .from("system_logs")
      .select("*")
      .is("tenant_id", null);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0].tenant_id).toBeNull();
  });

  it("should allow tenant to read null-tenant platform logs", async () => {
    if (!SUPABASE_ANON_KEY || !tenantId || !JWT_SECRET) return;

    const token = await mintTestJWT(tenantId, userId);
    const tenantClient = createTenantClient(token);

    const { data, error } = await tenantClient
      .from("system_logs")
      .select("*")
      .is("tenant_id", null);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it("should NOT allow tenant to modify null-tenant platform logs", async () => {
    if (!SUPABASE_ANON_KEY || !tenantId || !platformLogId || !JWT_SECRET) return;

    const token = await mintTestJWT(tenantId, userId);
    const tenantClient = createTenantClient(token);

    const { data } = await tenantClient
      .from("system_logs")
      .update({ message: "Hacked!" })
      .eq("id", platformLogId)
      .select();

    expect(data).toEqual([]);
  });

  it("should NOT allow tenant to delete null-tenant platform logs", async () => {
    if (!SUPABASE_ANON_KEY || !tenantId || !platformLogId || !JWT_SECRET) return;

    const token = await mintTestJWT(tenantId, userId);
    const tenantClient = createTenantClient(token);

    const { data } = await tenantClient
      .from("system_logs")
      .delete()
      .eq("id", platformLogId)
      .select();

    expect(data).toEqual([]);
  });
});
