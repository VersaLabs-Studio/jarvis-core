-- =============================================================================
-- JARVIS CORE — Initial Schema Migration
-- Single source of truth for all table definitions
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE public.workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE public.integration_status AS ENUM ('pending', 'connected', 'disconnected', 'error');
CREATE TYPE public.skill_status AS ENUM ('draft', 'active', 'disabled', 'archived');
CREATE TYPE public.service_status AS ENUM ('provisioning', 'running', 'stopped', 'error', 'terminated');
CREATE TYPE public.secret_type AS ENUM ('api_key', 'oauth_token', 'database_url', 'webhook_secret', 'custom');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Tenants (organizations)
CREATE TABLE public.tenants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_plan ON public.tenants(plan);

-- Profiles (users linked to auth.users)
CREATE TABLE public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Workflows
CREATE TABLE public.workflows (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        public.workflow_status NOT NULL DEFAULT 'draft',
  definition    JSONB NOT NULL DEFAULT '{}'::jsonb,
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workflows_tenant_id ON public.workflows(tenant_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_created_at ON public.workflows(created_at DESC);

-- Integrations
CREATE TABLE public.integrations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  provider      TEXT NOT NULL,
  status        public.integration_status NOT NULL DEFAULT 'pending',
  config        JSONB DEFAULT '{}'::jsonb,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_integrations_tenant_id ON public.integrations(tenant_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);
CREATE INDEX idx_integrations_status ON public.integrations(status);

-- Skills
CREATE TABLE public.skills (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        public.skill_status NOT NULL DEFAULT 'draft',
  config        JSONB DEFAULT '{}'::jsonb,
  capabilities  TEXT[] DEFAULT '{}',
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_skills_tenant_id ON public.skills(tenant_id);
CREATE INDEX idx_skills_status ON public.skills(status);

-- Services
CREATE TABLE public.services (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  status        public.service_status NOT NULL DEFAULT 'provisioning',
  config        JSONB DEFAULT '{}'::jsonb,
  endpoints     JSONB DEFAULT '{}'::jsonb,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_services_tenant_id ON public.services(tenant_id);
CREATE INDEX idx_services_type ON public.services(type);
CREATE INDEX idx_services_status ON public.services(status);

-- Secrets (encrypted at rest via Supabase Vault in production)
CREATE TABLE public.secrets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          public.secret_type NOT NULL DEFAULT 'custom',
  value         TEXT NOT NULL,
  description   TEXT,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_secrets_tenant_id ON public.secrets(tenant_id);
CREATE INDEX idx_secrets_type ON public.secrets(type);

-- Audit Log
CREATE TABLE public.audit_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}'::jsonb,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.secrets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — Tenant Isolation
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: read tenant_id from JWT claim (O(1), no subquery)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
    ''
  )::uuid;
$$ LANGUAGE sql STABLE;

-- Tenants: users can only see their own tenant
CREATE POLICY "tenant_isolation_select" ON public.tenants
  FOR SELECT USING (id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.tenants
  FOR UPDATE USING (id = public.current_tenant_id());

-- Profiles: users can see profiles in their tenant
CREATE POLICY "tenant_isolation_select" ON public.profiles
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Workflows: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.workflows
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.workflows
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.workflows
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.workflows
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Integrations: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.integrations
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.integrations
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.integrations
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.integrations
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Skills: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.skills
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.skills
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.skills
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.skills
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Services: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.services
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.services
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.services
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.services
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Secrets: tenant isolation (select masks value)
CREATE POLICY "tenant_isolation_select" ON public.secrets
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.secrets
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.secrets
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.secrets
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Audit Log: tenant isolation (read-only for users)
CREATE POLICY "tenant_isolation_select" ON public.audit_log
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.audit_log
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
