-- =============================================================================
-- 0004_role_grants.sql — restore service_role table/function privileges
--
-- AUDIT FINDING (Phase F, 2026-06-13): migrations 0001–0003 created the 13
-- public tables but never granted DML to `service_role`. has_table_privilege
-- returned false for SELECT/INSERT/UPDATE/DELETE on EVERY table, and a
-- `set role service_role; select from tenants` failed with
-- "permission denied for table tenants". Because the API performs ALL CRUD as
-- service_role (the server-only backend identity, which bypasses RLS), every
-- production data call would have failed. Phase D flagged a narrow version of
-- this (tenants/profiles); it was schema-wide.
--
-- Fix: grant the backend identity full access to public (RLS still protects
-- anon/authenticated — untouched here, since all client data access is routed
-- through the API). Future objects inherit via ALTER DEFAULT PRIVILEGES.
-- Also (re)assert the custom access token hook's execute grant for the role
-- Supabase Auth runs it as (supabase_auth_admin).
--
-- Applied to the hosted project (ref rofvgnvhmwsgrqewcbci) via the Management
-- API on 2026-06-13 and recorded in supabase_migrations.schema_migrations.
-- =============================================================================

-- Backend identity: full access (server-only; bypasses RLS)
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Future objects created in `public` inherit the same grants
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Custom access token hook — Supabase Auth executes it as supabase_auth_admin
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token to supabase_auth_admin;
