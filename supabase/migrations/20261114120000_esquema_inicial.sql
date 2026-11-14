-- =============================================================================
-- ESTAR — esquema inicial da base de dados
-- =============================================================================
-- Como aplicar: Supabase → SQL Editor → colar este ficheiro inteiro → Run.
-- Aplicar primeiro no projeto estar-dev, testar, e só depois no estar-prod.
--
-- Princípios de segurança:
--  * Row Level Security (RLS) ativo em TODAS as tabelas. Sem política = sem acesso.
--  * Permissões de admin exigem 2FA ativo na sessão (aal2). Uma password/link de
--    email roubado, sozinho, não dá acesso a dados de outras pessoas.
--  * Funções com privilégios elevados (security definer) ficam no esquema
--    `private`, que não é exposto pela API, e têm search_path vazio.
--  * Colunas que só os admins podem mudar são protegidas por triggers.
--  * O registo de auditoria guarda QUEM fez O QUÊ, sem copiar dados pessoais.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Permissões base: começar do zero (o Supabase dá acesso total por omissão)
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
create type public.estado_voluntario as enum ('ativo', 'inativo');
create type public.estado_sessao     as enum ('rascunho', 'confirmada_responsavel', 'comunicada', 'realizada', 'cancelada');
create type public.estado_alocacao   as enum ('proposta', 'confirmada', 'recusada', 'cancelada');
create type public.presenca          as enum ('presente', 'faltou');
create type public.estado_testemunho as enum ('pendente', 'aprovado', 'rejeitado');

-- -----------------------------------------------------------------------------
-- 2. Tabelas
-- -----------------------------------------------------------------------------

-- Admins (quem pode gerir tudo). Ninguém se adiciona a si próprio: ver adicionar_admin().
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

-- Voluntários
create table public.profiles (
  id                           uuid primary key references auth.users (id) on delete cascade,
  nome                         text not null check (char_length(btrim(nome)) between 2 and 120),
  email                        text not null default '',  -- copiado de auth.users por trigger
  telefone                     text not null check (telefone ~ '^\+?[0-9 ]{9,20}$'),
  data_nascimento              date not null,
  encarregado_nome             text check (char_length(encarregado_nome) <= 120),
  encarregado_telefone         text check (encarregado_telefone ~ '^\+?[0-9 ]{9,20}$'),
  encarregado_email            text check (char_length(encarregado_email) <= 254),
  autorizacao_encarregado      boolean not null default false,
  consent_privacidade_em       timestamptz not null default now(),
  consent_partilha_contacto_em timestamptz not null default now(),
  consent_regras_em            timestamptz not null default now(),
  estado                       public.estado_voluntario not null default 'ativo',
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- Atividades (informação pública)
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  nome            text not null check (char_length(nome) between 2 and 120),
  resumo          text not null default '' check (char_length(resumo) <= 300),
  descricao       text not null default '' check (char_length(descricao) <= 4000),
  morada          text check (char_length(morada) <= 300),
  regras          text[] not null default '{}',
  min_voluntarios smallint not null default 2 check (min_voluntarios >= 0),
  max_voluntarios smallint not null default 5 check (max_voluntarios >= min_voluntarios),
  ativa           boolean not null default true,
  ordem           smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Contactos dos responsáveis (só admins) — separado para nunca ser público
create table public.activity_contacts (
  activity_id          uuid primary key references public.activities (id) on delete cascade,
  responsavel_nome     text check (char_length(responsavel_nome) <= 120),
  responsavel_contacto text check (char_length(responsavel_contacto) <= 200),
  notas                text check (char_length(notas) <= 2000),
  updated_at           timestamptz not null default now()
);

-- Horário semanal de cada atividade (1 = segunda … 7 = domingo)
create table public.activity_hours (
  activity_id uuid not null references public.activities (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 1 and 7),
  abre        time not null,
  fecha       time not null check (fecha > abre),
  primary key (activity_id, dia_semana)
);

-- Dias de fecho (feriados, férias). activity_id nulo = fecha tudo.
create table public.activity_closures (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities (id) on delete cascade,
  data        date not null,
  motivo      text check (char_length(motivo) <= 200),
  unique nulls not distinct (activity_id, data)
);

-- Atividades que interessam a cada voluntário (indicado na inscrição)
create table public.volunteer_interests (
  volunteer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  primary key (volunteer_id, activity_id)
);

-- Período em que se recolhem disponibilidades para um mês
create table public.availability_periods (
  mes        date primary key check (extract(day from mes) = 1),
  abre_em    date not null,
  fecha_em   date not null check (fecha_em >= abre_em),
  created_at timestamptz not null default now()
);

-- Disponibilidades dos voluntários
create table public.availabilities (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  data         date not null,
  inicio       time not null,
  fim          time not null,
  activity_id  uuid references public.activities (id) on delete cascade,  -- nulo = qualquer atividade
  created_at   timestamptz not null default now(),
  check (fim - inicio >= interval '1 hour')
);
create index availabilities_data_idx on public.availabilities (data);
create index availabilities_volunteer_idx on public.availabilities (volunteer_id, data);

-- Observações mensais ("este mês prefiro só 2 visitas")
create table public.availability_notes (
  volunteer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mes          date not null check (extract(day from mes) = 1),
  texto        text not null check (char_length(texto) <= 500),
  updated_at   timestamptz not null default now(),
  primary key (volunteer_id, mes)
);

-- Visitas
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  data        date not null,
  inicio      time not null,
  fim         time not null,
  estado      public.estado_sessao not null default 'rascunho',
  notas       text check (char_length(notas) <= 2000),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (fim - inicio >= interval '1 hour')
);
create index sessions_data_idx on public.sessions (data);

-- Voluntário alocado a uma visita
create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  volunteer_id  uuid not null references public.profiles (id) on delete cascade,
  estado        public.estado_alocacao not null default 'proposta',
  presenca      public.presenca,
  respondido_em timestamptz,
  motivo        text check (char_length(motivo) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (session_id, volunteer_id)
);
create index assignments_volunteer_idx on public.assignments (volunteer_id);

-- Testemunhos
create table public.testimonials (
  id                       uuid primary key default gen_random_uuid(),
  autor_id                 uuid default auth.uid() references public.profiles (id) on delete cascade,
  anonimo                  boolean not null default false,
  nome_exibido             text not null default '' check (char_length(nome_exibido) <= 60),
  activity_id              uuid references public.activities (id) on delete set null,
  texto                    text not null check (char_length(btrim(texto)) between 20 and 2000),
  texto_publicado          text check (char_length(texto_publicado) <= 2000),
  consentimento_publicacao boolean not null check (consentimento_publicacao),
  estado                   public.estado_testemunho not null default 'pendente',
  destaque                 boolean not null default false,
  revisto_por              uuid references auth.users (id) on delete set null,
  revisto_em               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Notas internas dos admins sobre voluntários
create table public.admin_notes (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles (id) on delete cascade,
  autor_id     uuid default auth.uid() references auth.users (id) on delete set null,
  texto        text not null check (char_length(texto) between 1 and 2000),
  created_at   timestamptz not null default now()
);

-- Registo de auditoria (não guarda valores, só quem/o quê/quando/que colunas)
create table public.audit_log (
  id         bigint generated always as identity primary key,
  ator_id    uuid,
  acao       text not null,
  tabela     text not null,
  registo_id text,
  colunas    text[],
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Funções auxiliares (esquema private, não expostas pela API)
-- -----------------------------------------------------------------------------

-- Data de hoje em Lisboa (o servidor está em UTC)
create function private.hoje() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Europe/Lisbon')::date $$;

create function private.idade(nascimento date) returns integer
language sql stable set search_path = ''
as $$ select date_part('year', age(private.hoje()::timestamp, nascimento::timestamp))::integer $$;

-- É admin (independentemente do 2FA). Só para decidir para onde encaminhar no site.
create function private.is_admin_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins a where a.user_id = (select auth.uid())) $$;

-- É admin E a sessão atual passou o 2FA (aal2). É ESTA que dá acesso aos dados.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin_member()
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
$$;

-- O período de disponibilidades do mês desta data está aberto hoje?
create function private.periodo_aberto(d date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.availability_periods p
    where p.mes = date_trunc('month', d)::date
      and private.hoje() between p.abre_em and p.fecha_em
  )
$$;

-- O utilizador atual está alocado a esta visita, e a visita já lhe foi comunicada?
-- (definer para evitar recursão entre as políticas de sessions e assignments)
create function private.alocado_visivel(p_session_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.sessions s on s.id = a.session_id
    where a.session_id = p_session_id
      and a.volunteer_id = (select auth.uid())
      and s.estado in ('comunicada', 'realizada', 'cancelada')
  )
$$;

-- updated_at automático
create function private.tocar_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

-- -----------------------------------------------------------------------------
-- 4. Triggers de validação e proteção de colunas
-- -----------------------------------------------------------------------------

-- PERFIS: email vem sempre de auth.users; colunas sensíveis só mudam por admins;
-- idade mínima 16; menores precisam de encarregado e autorização.
create function private.validar_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin boolean := private.is_admin();
  v_idade integer;
begin
  -- Sincronização de email feita pelo sistema: deixar passar
  if current_setting('estar.sistema', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.email := coalesce((select u.email from auth.users u where u.id = new.id), '');
    new.created_at := now();
    if not v_admin then
      new.estado := 'ativo';
      new.consent_privacidade_em := now();
      new.consent_partilha_contacto_em := now();
      new.consent_regras_em := now();
    end if;
  else
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
    if not v_admin then
      new.estado := old.estado;
      new.data_nascimento := old.data_nascimento;
      new.consent_privacidade_em := old.consent_privacidade_em;
      new.consent_partilha_contacto_em := old.consent_partilha_contacto_em;
      new.consent_regras_em := old.consent_regras_em;
    end if;
  end if;

  new.nome := btrim(new.nome);

  if new.data_nascimento > private.hoje() or new.data_nascimento < date '1900-01-01' then
    raise exception 'data_nascimento_invalida' using errcode = '22023';
  end if;

  v_idade := private.idade(new.data_nascimento);

  if (tg_op = 'INSERT' or new.data_nascimento is distinct from old.data_nascimento)
     and v_idade < 16 then
    raise exception 'idade_minima' using errcode = '22023',
      hint = 'É preciso ter pelo menos 16 anos.';
  end if;

  if v_idade < 18 and (
       coalesce(btrim(new.encarregado_nome), '') = ''
    or coalesce(btrim(new.encarregado_telefone), '') = ''
    or not new.autorizacao_encarregado
  ) then
    raise exception 'encarregado_obrigatorio' using errcode = '22023',
      hint = 'Menores de 18 anos precisam dos dados e da autorização do encarregado de educação.';
  end if;

  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_validar
before insert or update on public.profiles
for each row execute function private.validar_perfil();

-- Manter o email do perfil igual ao da conta (se mudar em auth.users)
create function private.sincronizar_email() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    perform set_config('estar.sistema', 'on', true);
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
    perform set_config('estar.sistema', 'off', true);
  end if;
  return new;
end
$$;

create trigger auth_users_sincronizar_email
after update of email on auth.users
for each row execute function private.sincronizar_email();

-- DISPONIBILIDADES: voluntário ativo, dentro do horário da atividade, dia não fechado.
-- (admins podem registar fora destas regras, p.ex. a pedido de alguém por WhatsApp)
create function private.validar_disponibilidade() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_dow smallint := extract(isodow from new.data)::smallint;
begin
  if private.is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.volunteer_id := old.volunteer_id;
  end if;

  if not exists (select 1 from public.profiles p where p.id = new.volunteer_id and p.estado = 'ativo') then
    raise exception 'voluntario_inativo' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.activities a
    join public.activity_hours h on h.activity_id = a.id and h.dia_semana = v_dow
    where a.ativa
      and (new.activity_id is null or a.id = new.activity_id)
      and new.inicio >= h.abre
      and new.fim <= h.fecha
      and not exists (
        select 1 from public.activity_closures c
        where c.data = new.data and (c.activity_id is null or c.activity_id = a.id)
      )
  ) then
    raise exception 'fora_do_horario' using errcode = '22023',
      hint = 'Esse horário não coincide com o funcionamento da atividade nesse dia.';
  end if;

  -- Travão anti-abuso: no máximo 120 intervalos por mês
  if tg_op = 'INSERT' and (
    select count(*) from public.availabilities x
    where x.volunteer_id = new.volunteer_id
      and date_trunc('month', x.data) = date_trunc('month', new.data)
  ) >= 120 then
    raise exception 'limite_disponibilidades' using errcode = '54000';
  end if;

  return new;
end
$$;

create trigger availabilities_validar
before insert or update on public.availabilities
for each row execute function private.validar_disponibilidade();

-- TESTEMUNHOS: voluntário só cria pendentes em seu nome; revisão registada.
create function private.validar_testemunho() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin boolean := private.is_admin();
begin
  if tg_op = 'INSERT' then
    if not v_admin then
      new.autor_id := (select auth.uid());
      new.estado := 'pendente';
      new.destaque := false;
      new.texto_publicado := null;
      new.revisto_por := null;
      new.revisto_em := null;
      if (select count(*) from public.testimonials t
          where t.autor_id = new.autor_id and t.estado = 'pendente') >= 3 then
        raise exception 'limite_testemunhos' using errcode = '54000',
          hint = 'Já tens 3 testemunhos à espera de revisão.';
      end if;
    end if;
    new.nome_exibido := case
      when new.anonimo then 'Anónimo'
      else coalesce(
        (select split_part(btrim(p.nome), ' ', 1) from public.profiles p where p.id = new.autor_id),
        'Anónimo')
    end;
    new.created_at := now();
  else
    new.autor_id := old.autor_id;
    new.texto := old.texto;  -- o original fica sempre guardado; edita-se texto_publicado
    new.created_at := old.created_at;
    if new.estado is distinct from old.estado then
      new.revisto_por := (select auth.uid());
      new.revisto_em := now();
      if new.estado = 'aprovado' and new.texto_publicado is null then
        new.texto_publicado := new.texto;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger testimonials_validar
before insert or update on public.testimonials
for each row execute function private.validar_testemunho();

-- updated_at nas restantes tabelas
create trigger activities_updated_at before update on public.activities
for each row execute function private.tocar_updated_at();
create trigger activity_contacts_updated_at before update on public.activity_contacts
for each row execute function private.tocar_updated_at();
create trigger sessions_updated_at before update on public.sessions
for each row execute function private.tocar_updated_at();
create trigger assignments_updated_at before update on public.assignments
for each row execute function private.tocar_updated_at();
create trigger availability_notes_updated_at before update on public.availability_notes
for each row execute function private.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Auditoria
-- -----------------------------------------------------------------------------
create function private.auditar() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id     text;
  v_cols   text[];
  v_antigo jsonb;
  v_novo   jsonb;
begin
  -- Só regista ações de admins (e sempre alterações à tabela admins)
  if tg_table_name <> 'admins' and not private.is_admin_member() then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_antigo := to_jsonb(old);
  else
    v_novo := to_jsonb(new);
  end if;
  if tg_op = 'UPDATE' then
    v_antigo := to_jsonb(old);
    select array_agg(k order by k) into v_cols
    from jsonb_object_keys(v_novo) k
    where v_novo -> k is distinct from v_antigo -> k and k <> 'updated_at';
  end if;

  v_id := coalesce(v_novo, v_antigo) ->> case
    when tg_table_name = 'admins' then 'user_id'
    when tg_table_name in ('activity_contacts', 'activity_hours') then 'activity_id'
    when tg_table_name = 'availability_periods' then 'mes'
    else 'id' end;

  insert into public.audit_log (ator_id, acao, tabela, registo_id, colunas)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_cols);
  return null;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'profiles', 'activities', 'activity_contacts', 'activity_hours',
    'activity_closures', 'availability_periods', 'sessions', 'assignments',
    'testimonials', 'admin_notes'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function private.auditar()', t || '_auditar', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admins               enable row level security;
alter table public.profiles             enable row level security;
alter table public.activities           enable row level security;
alter table public.activity_contacts    enable row level security;
alter table public.activity_hours       enable row level security;
alter table public.activity_closures    enable row level security;
alter table public.availability_periods enable row level security;
alter table public.volunteer_interests  enable row level security;
alter table public.availabilities       enable row level security;
alter table public.availability_notes   enable row level security;
alter table public.sessions             enable row level security;
alter table public.assignments          enable row level security;
alter table public.testimonials         enable row level security;
alter table public.admin_notes          enable row level security;
alter table public.audit_log            enable row level security;

-- admins: cada um vê a própria linha; admins (com 2FA) veem todas. Escrita só por RPC.
create policy admins_select on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_delete on public.profiles for delete to authenticated
  using ((select private.is_admin()));

-- Informação pública das atividades: todos leem, só admins escrevem
create policy activities_select on public.activities for select to anon, authenticated using (true);
create policy activities_admin  on public.activities for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy activity_hours_select on public.activity_hours for select to anon, authenticated using (true);
create policy activity_hours_admin  on public.activity_hours for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy activity_closures_select on public.activity_closures for select to anon, authenticated using (true);
create policy activity_closures_admin  on public.activity_closures for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy availability_periods_select on public.availability_periods for select to anon, authenticated using (true);
create policy availability_periods_admin  on public.availability_periods for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Contactos dos responsáveis: só admins
create policy activity_contacts_admin on public.activity_contacts for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Interesses: o próprio ou admins
create policy volunteer_interests_select on public.volunteer_interests for select to authenticated
  using (volunteer_id = (select auth.uid()) or (select private.is_admin()));
create policy volunteer_interests_insert on public.volunteer_interests for insert to authenticated
  with check (volunteer_id = (select auth.uid()) or (select private.is_admin()));
create policy volunteer_interests_delete on public.volunteer_interests for delete to authenticated
  using (volunteer_id = (select auth.uid()) or (select private.is_admin()));

-- Disponibilidades: o próprio (só com o período aberto) ou admins
create policy availabilities_select on public.availabilities for select to authenticated
  using (volunteer_id = (select auth.uid()) or (select private.is_admin()));
create policy availabilities_insert on public.availabilities for insert to authenticated
  with check (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.is_admin()));
create policy availabilities_update on public.availabilities for update to authenticated
  using (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.is_admin()))
  with check (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.is_admin()));
create policy availabilities_delete on public.availabilities for delete to authenticated
  using (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.is_admin()));

create policy availability_notes_select on public.availability_notes for select to authenticated
  using (volunteer_id = (select auth.uid()) or (select private.is_admin()));
create policy availability_notes_insert on public.availability_notes for insert to authenticated
  with check (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.is_admin()));
create policy availability_notes_update on public.availability_notes for update to authenticated
  using (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.is_admin()))
  with check (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.is_admin()));
create policy availability_notes_delete on public.availability_notes for delete to authenticated
  using (
    (volunteer_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.is_admin()));

-- Visitas: admins tudo; voluntário só vê as suas, depois de comunicadas
create policy sessions_select on public.sessions for select to authenticated
  using ((select private.is_admin()) or private.alocado_visivel(id));
create policy sessions_admin on public.sessions for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Alocações: admins tudo; voluntário só vê as suas (de visitas comunicadas).
-- O voluntário responde (confirmar/recusar/cancelar) através de responder_alocacao().
create policy assignments_select on public.assignments for select to authenticated
  using ((select private.is_admin())
         or (volunteer_id = (select auth.uid()) and private.alocado_visivel(session_id)));
create policy assignments_admin on public.assignments for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Testemunhos: autor cria e vê os seus; pode apagar enquanto pendente; admins moderam.
-- O público lê os aprovados através de testemunhos_publicados().
create policy testimonials_select on public.testimonials for select to authenticated
  using (autor_id = (select auth.uid()) or (select private.is_admin()));
create policy testimonials_insert on public.testimonials for insert to authenticated
  with check (autor_id = (select auth.uid()) or (select private.is_admin()));
create policy testimonials_update on public.testimonials for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy testimonials_delete on public.testimonials for delete to authenticated
  using ((select private.is_admin())
         or (autor_id = (select auth.uid()) and estado = 'pendente'));

create policy admin_notes_admin on public.admin_notes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- 7. Funções públicas (RPC)
-- -----------------------------------------------------------------------------

-- Testemunhos aprovados, para a página pública (sem ids de autor nem texto original)
create function public.testemunhos_publicados(p_limite integer default 50)
returns table (id uuid, autor text, atividade text, texto text, destaque boolean, publicado_em timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.nome_exibido, a.nome, coalesce(t.texto_publicado, t.texto), t.destaque, t.revisto_em
  from public.testimonials t
  left join public.activities a on a.id = t.activity_id
  where t.estado = 'aprovado'
  order by t.destaque desc, t.revisto_em desc nulls last
  limit least(greatest(coalesce(p_limite, 50), 1), 100)
$$;

-- Para o site saber para onde encaminhar depois do login
create function public.sou_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_admin_member() $$;

-- Voluntário confirma, recusa ou cancela uma visita
create function public.responder_alocacao(p_alocacao uuid, p_resposta public.estado_alocacao, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.assignments;
  s public.sessions;
begin
  select * into v from public.assignments where id = p_alocacao for update;
  if not found or v.volunteer_id is distinct from (select auth.uid()) then
    raise exception 'nao_encontrado' using errcode = 'P0002';
  end if;
  select * into s from public.sessions where id = v.session_id;
  if s.estado <> 'comunicada' or s.data < private.hoje() then
    raise exception 'ja_nao_e_possivel' using errcode = '22023';
  end if;
  if not (
       (v.estado = 'proposta'   and p_resposta in ('confirmada', 'recusada'))
    or (v.estado = 'confirmada' and p_resposta = 'cancelada')
    or (v.estado = 'recusada'   and p_resposta = 'confirmada')
  ) then
    raise exception 'transicao_invalida' using errcode = '22023';
  end if;
  update public.assignments
     set estado = p_resposta,
         respondido_em = now(),
         motivo = nullif(left(btrim(coalesce(p_motivo, '')), 500), '')
   where id = p_alocacao;
end
$$;

-- Voluntários disponíveis para uma visita (cobre o horário completo da visita)
create function public.disponiveis_para_sessao(p_sessao uuid)
returns table (
  volunteer_id uuid, nome text, telefone text, email text, menor boolean,
  so_esta_atividade boolean, ja_alocado boolean, visitas_no_dia integer, visitas_no_mes integer
)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
  select p.id, p.nome, p.telefone, p.email,
         private.idade(p.data_nascimento) < 18,
         bool_or(av.activity_id is not null),
         exists (select 1 from public.assignments x where x.session_id = s.id and x.volunteer_id = p.id),
         (select count(*)::integer from public.assignments x join public.sessions s2 on s2.id = x.session_id
           where x.volunteer_id = p.id and s2.data = s.data
             and x.estado in ('proposta', 'confirmada') and s2.estado <> 'cancelada'),
         (select count(*)::integer from public.assignments x join public.sessions s2 on s2.id = x.session_id
           where x.volunteer_id = p.id and date_trunc('month', s2.data) = date_trunc('month', s.data)
             and x.estado in ('proposta', 'confirmada') and s2.estado <> 'cancelada')
  from public.sessions s
  join public.availabilities av
    on av.data = s.data and av.inicio <= s.inicio and av.fim >= s.fim
   and (av.activity_id is null or av.activity_id = s.activity_id)
  join public.profiles p on p.id = av.volunteer_id and p.estado = 'ativo'
  where s.id = p_sessao
  group by p.id, p.nome, p.telefone, p.email, p.data_nascimento, s.id, s.data
  order by 9, p.nome;
end
$$;

-- Gestão de admins (só admins com 2FA). A pessoa tem de ter entrado no site uma vez.
create function public.adicionar_admin(p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'utilizador_nao_encontrado' using errcode = 'P0002',
      hint = 'A pessoa tem de entrar no site pelo menos uma vez antes de ser adicionada.';
  end if;
  insert into public.admins (user_id, created_by) values (v_id, (select auth.uid()))
  on conflict (user_id) do nothing;
end
$$;

create function public.remover_admin(p_user_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if (select count(*) from public.admins) <= 1 then
    raise exception 'ultimo_admin' using errcode = '22023',
      hint = 'Não é possível remover o último admin.';
  end if;
  delete from public.admins where user_id = p_user_id;
end
$$;

create function public.listar_admins()
returns table (user_id uuid, email text, desde timestamptz, tem_2fa boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
  select a.user_id, u.email::text, a.created_at,
         exists (select 1 from auth.mfa_factors f where f.user_id = a.user_id and f.status::text = 'verified')
  from public.admins a join auth.users u on u.id = a.user_id
  order by a.created_at;
end
$$;

-- RGPD: descarregar os meus dados
create function public.os_meus_dados() returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'disponibilidades', coalesce((select jsonb_agg(to_jsonb(a) order by a.data)
                                  from public.availabilities a where a.volunteer_id = (select auth.uid())), '[]'),
    'interesses', coalesce((select jsonb_agg(act.nome) from public.volunteer_interests i
                            join public.activities act on act.id = i.activity_id
                            where i.volunteer_id = (select auth.uid())), '[]'),
    'observacoes', coalesce((select jsonb_agg(to_jsonb(n) order by n.mes)
                             from public.availability_notes n where n.volunteer_id = (select auth.uid())), '[]'),
    'visitas', coalesce((select jsonb_agg(jsonb_build_object(
                           'atividade', act.nome, 'data', s.data, 'inicio', s.inicio, 'fim', s.fim,
                           'estado', x.estado, 'presenca', x.presenca) order by s.data)
                         from public.assignments x
                         join public.sessions s on s.id = x.session_id
                         join public.activities act on act.id = s.activity_id
                         where x.volunteer_id = (select auth.uid())), '[]'),
    'testemunhos', coalesce((select jsonb_agg(jsonb_build_object(
                               'texto', t.texto, 'estado', t.estado, 'anonimo', t.anonimo, 'enviado_em', t.created_at))
                             from public.testimonials t where t.autor_id = (select auth.uid())), '[]')
  )
$$;

-- RGPD: apagar a minha conta (e, em cascata, todos os meus dados)
create function public.apagar_a_minha_conta() returns void
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'sem_sessao' using errcode = '42501';
  end if;
  if exists (select 1 from public.admins where user_id = v_uid)
     and (select count(*) from public.admins) <= 1 then
    raise exception 'ultimo_admin' using errcode = '22023';
  end if;
  delete from auth.users where id = v_uid;
end
$$;

-- -----------------------------------------------------------------------------
-- 8. Permissões explícitas (o que cada papel pode fazer; o RLS filtra as linhas)
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

-- Leitura pública
grant select on public.activities, public.activity_hours, public.activity_closures,
                public.availability_periods
  to anon, authenticated;

-- Utilizadores autenticados (as políticas RLS decidem que linhas)
grant select                         on public.admins to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant insert, update, delete         on public.activities, public.activity_hours,
                                        public.activity_closures, public.availability_periods
  to authenticated;
grant select, insert, update, delete on public.activity_contacts to authenticated;
grant select, insert, update, delete on public.availabilities, public.availability_notes to authenticated;
grant select, insert, delete         on public.volunteer_interests to authenticated;
grant select, insert, update, delete on public.sessions, public.assignments to authenticated;
grant select, insert, update, delete on public.testimonials to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select                         on public.audit_log to authenticated;

-- Funções usadas dentro das políticas
grant execute on function private.hoje(), private.idade(date), private.is_admin_member(),
                          private.is_admin(), private.periodo_aberto(date),
                          private.alocado_visivel(uuid)
  to authenticated;

-- RPCs
grant execute on function public.testemunhos_publicados(integer) to anon, authenticated;
grant execute on function public.sou_admin(), public.responder_alocacao(uuid, public.estado_alocacao, text),
                          public.disponiveis_para_sessao(uuid), public.adicionar_admin(text),
                          public.remover_admin(uuid), public.listar_admins(),
                          public.os_meus_dados(), public.apagar_a_minha_conta()
  to authenticated;

commit;
