-- 0003_custom_access_token_hook.sql
-- Supabase Custom Access Token Hook
-- Adds tenant_id to JWT app_metadata on token mint.
-- This ensures every JWT carries the tenant_id claim needed for RLS.

CREATE OR REPLACE FUNCTION public.custom_access_token(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
BEGIN
  -- Fetch the user's tenant_id from profiles
  SELECT tenant_id INTO user_tenant_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Get existing claims
  claims := event->'claims';

  -- Add tenant_id to app_metadata
  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,tenant_id}',
      to_jsonb(user_tenant_id::text)
    );
  END IF;

  -- Return modified event with updated claims
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token(jsonb) TO supabase_auth_admin;

-- Revoke from public
REVOKE EXECUTE ON FUNCTION public.custom_access_token(jsonb) FROM public, authenticated, anon;

-- Configure Supabase to use this hook (requires supabase/config.toml):
-- [auth.hook.custom_access_token]
-- enabled = true
-- uri = "pg-functions://postgres/public/custom_access_token"
