#!/usr/bin/env bash
# Corre os testes de permissões numa base de dados Postgres local descartável.
# Requer PostgreSQL (psql) e um utilizador com permissão para criar bases de dados.
# Uso: supabase/tests/correr.sh   (variável PSQL para mudar o comando, ex.: PSQL="sudo -u postgres psql")
set -euo pipefail
cd "$(dirname "$0")/.."

PSQL=${PSQL:-psql}
DB=estar_testes_$$

$PSQL -q -d postgres -c "create database $DB" >/dev/null
trap '$PSQL -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT

run() { $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }

# Os papéis anon/authenticated são globais no Postgres: criar só se não existirem
$PSQL -q -d "$DB" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
SQL

sed '/^create role/d' tests/00_shim_supabase.sql > "/tmp/estar_shim_$$.sql"
run "/tmp/estar_shim_$$.sql"; rm -f "/tmp/estar_shim_$$.sql"
run migrations/20261114120000_esquema_inicial.sql
run seed.sql
run tests/10_helpers.sql
$PSQL -v ON_ERROR_STOP=1 -d "$DB" -f tests/20_rls.sql
$PSQL -v ON_ERROR_STOP=1 -d "$DB" -f tests/30_fluxo_admin.sql
