-- =============================================================================
-- SÓ PARA TESTES LOCAIS. NÃO APLICAR NO SUPABASE.
-- Imita o mínimo do ambiente Supabase (papéis, esquema auth, auth.uid/jwt e as
-- permissões por omissão que o Supabase dá) para testar as políticas RLS num
-- Postgres normal.
-- =============================================================================

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

create table auth.mfa_factors (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  status  text not null
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;

-- Permissões por omissão do Supabase (a migração tem de as retirar)
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
