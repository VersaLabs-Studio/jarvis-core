-- =============================================================================
-- JARVIS CORE — Schema Completion Migration
-- Adds chat_sessions, chat_messages, workflow_runs, analytics_events, system_logs
-- Plus bootstrap_user RPC for atomic tenant+profile creation
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- Chat Sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'New Chat',
  context       JSONB,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chat_sessions_tenant_id ON public.chat_sessions(tenant_id);
CREATE INDEX idx_chat_sessions_tenant_created ON public.chat_sessions(tenant_id, created_at DESC);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content       TEXT,
  model         TEXT,
  tools_used    TEXT[] DEFAULT '{}',
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  duration_ms   INTEGER,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_tenant_id ON public.chat_messages(tenant_id);
CREATE INDEX idx_chat_messages_tenant_created ON public.chat_messages(tenant_id, created_at DESC);

-- Workflow Runs
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id   UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  output        TEXT,
  error         TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  duration_ms   INTEGER
);

CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_tenant_id ON public.workflow_runs(tenant_id);
CREATE INDEX idx_workflow_runs_tenant_created ON public.workflow_runs(tenant_id, started_at DESC);

-- Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_analytics_events_tenant_id ON public.analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_tenant_created ON public.analytics_events(tenant_id, created_at DESC);

-- System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  level         TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  service       TEXT NOT NULL,
  message       TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_system_logs_tenant_id ON public.system_logs(tenant_id);
CREATE INDEX idx_system_logs_tenant_created ON public.system_logs(tenant_id, created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER (chat_sessions only)
-- =============================================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — Tenant Isolation
-- =============================================================================

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Chat Sessions: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.chat_sessions
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.chat_sessions
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.chat_sessions
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.chat_sessions
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Chat Messages: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.chat_messages
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.chat_messages
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.chat_messages
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Workflow Runs: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.workflow_runs
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.workflow_runs
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.workflow_runs
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.workflow_runs
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- Analytics Events: tenant isolation
CREATE POLICY "tenant_isolation_select" ON public.analytics_events
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON public.analytics_events
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_update" ON public.analytics_events
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.analytics_events
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- System Logs: tenant isolation (nullable tenant_id)
CREATE POLICY "tenant_isolation_select" ON public.system_logs
  FOR SELECT USING (tenant_id = public.current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_isolation_insert" ON public.system_logs
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_isolation_update" ON public.system_logs
  FOR UPDATE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON public.system_logs
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- BOOTSTRAP USER RPC — Atomic tenant+profile creation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_user(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_profile JSONB;
BEGIN
  -- Check if profile already exists
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;

  IF v_tenant_id IS NOT NULL THEN
    -- User already exists, return existing profile
    SELECT jsonb_build_object('tenant_id', tenant_id, 'id', id, 'email', email, 'full_name', full_name)
    INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id;
    RETURN v_profile;
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name) VALUES (p_email) RETURNING id INTO v_tenant_id;

  -- Create profile
  INSERT INTO public.profiles (id, tenant_id, email, full_name)
  VALUES (p_user_id, v_tenant_id, p_email, p_full_name)
  RETURNING jsonb_build_object('tenant_id', tenant_id, 'id', id, 'email', email, 'full_name', full_name)
  INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.bootstrap_user(UUID, TEXT, TEXT) TO authenticated;

-- Revoke from public
REVOKE EXECUTE ON FUNCTION public.bootstrap_user(UUID, TEXT, TEXT) FROM public, anon;
