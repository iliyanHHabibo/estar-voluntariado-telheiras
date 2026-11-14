-- =============================================================================
-- ESTAR — esquema inicial da base de dados
-- =============================================================================
-- Como aplicar: Supabase → SQL Editor → colar este ficheiro inteiro → Run.
-- Aplicar primeiro no projeto estar-dev, testar, e só depois no estar-prod.
--
-- Princípios de segurança:
--  * Row Level Security (RLS) ativo em TODAS as tabelas. Sem política = sem acesso.
--  * Permissões de admin exigem 2FA ativo na sessão (aal2). Um link de email
--    roubado, sozinho, não dá acesso a dados de outras pessoas. (Interruptor para
--    testes em private.definicoes — ver secção 3.)
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
create type public.estado_visita     as enum ('rascunho', 'confirmada_responsavel', 'comunicada', 'realizada', 'cancelada');
create type public.estado_alocacao   as enum ('proposta', 'confirmada', 'recusada', 'cancelada');
create type public.presenca          as enum ('presente', 'faltou');
create type public.estado_testemunho as enum ('pendente', 'aprovado', 'rejeitado');

-- -----------------------------------------------------------------------------
-- 2. Tabelas
-- -----------------------------------------------------------------------------

-- Admins (quem pode gerir tudo). Ninguém se adiciona a si próprio: ver adicionar_admin().
create table public.admins (
  utilizador_id    uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null
);

-- Voluntários
create table public.voluntarios (
  id                           uuid primary key references auth.users (id) on delete cascade,
  nome                         text not null check (char_length(btrim(nome)) between 2 and 120),
  email                        text not null default '',  -- copiado de auth.users por trigger
  telefone                     text not null check (telefone ~ '^\+?[0-9 ]{9,20}$'),
  data_nascimento              date not null,
  encarregado_nome             text check (char_length(encarregado_nome) <= 120),
  encarregado_telefone         text check (encarregado_telefone ~ '^\+?[0-9 ]{9,20}$'),
  encarregado_email            text check (char_length(encarregado_email) <= 254),
  autorizacao_encarregado      boolean not null default false,
  consentimento_privacidade_em       timestamptz not null default now(),
  consentimento_partilha_contacto_em timestamptz not null default now(),
  consentimento_regras_em            timestamptz not null default now(),
  estado                       public.estado_voluntario not null default 'ativo',
  criado_em                   timestamptz not null default now(),
  atualizado_em                   timestamptz not null default now()
);

-- Atividades (informação pública)
create table public.atividades (
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
  criado_em      timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

-- Contactos dos responsáveis (só admins) — separado para nunca ser público
create table public.atividade_contactos (
  atividade_id          uuid primary key references public.atividades (id) on delete cascade,
  responsavel_nome     text check (char_length(responsavel_nome) <= 120),
  responsavel_contacto text check (char_length(responsavel_contacto) <= 200),
  notas                text check (char_length(notas) <= 2000),
  atualizado_em           timestamptz not null default now()
);

-- Horário semanal de cada atividade (1 = segunda … 7 = domingo)
create table public.atividade_horarios (
  atividade_id uuid not null references public.atividades (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 1 and 7),
  abre        time not null,
  fecha       time not null check (fecha > abre),
  primary key (atividade_id, dia_semana)
);

-- Dias de fecho (feriados, férias). atividade_id nulo = fecha tudo.
create table public.atividade_fechos (
  id          uuid primary key default gen_random_uuid(),
  atividade_id uuid references public.atividades (id) on delete cascade,
  data        date not null,
  motivo      text check (char_length(motivo) <= 200),
  unique nulls not distinct (atividade_id, data)
);

-- Atividades que interessam a cada voluntário (indicado na inscrição)
create table public.voluntario_interesses (
  voluntario_id uuid not null default auth.uid() references public.voluntarios (id) on delete cascade,
  atividade_id  uuid not null references public.atividades (id) on delete cascade,
  primary key (voluntario_id, atividade_id)
);

-- Período em que se recolhem disponibilidades para um mês
create table public.periodos_disponibilidade (
  mes        date primary key check (extract(day from mes) = 1),
  abre_em    date not null,
  fecha_em   date not null check (fecha_em >= abre_em),
  criado_em timestamptz not null default now()
);

-- Disponibilidades dos voluntários
create table public.disponibilidades (
  id           uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null default auth.uid() references public.voluntarios (id) on delete cascade,
  data         date not null,
  inicio       time not null,
  fim          time not null,
  atividade_id  uuid references public.atividades (id) on delete cascade,  -- nulo = qualquer atividade
  criado_em   timestamptz not null default now(),
  check (fim - inicio >= interval '1 hour')
);
create index disponibilidades_data_idx on public.disponibilidades (data);
create index disponibilidades_voluntario_idx on public.disponibilidades (voluntario_id, data);

-- Observações mensais ("este mês prefiro só 2 visitas")
create table public.disponibilidade_notas (
  voluntario_id uuid not null default auth.uid() references public.voluntarios (id) on delete cascade,
  mes          date not null check (extract(day from mes) = 1),
  texto        text not null check (char_length(texto) <= 500),
  atualizado_em   timestamptz not null default now(),
  primary key (voluntario_id, mes)
);

-- Visitas
create table public.visitas (
  id          uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades (id) on delete restrict,
  data        date not null,
  inicio      time not null,
  fim         time not null,
  estado      public.estado_visita not null default 'rascunho',
  notas       text check (char_length(notas) <= 2000),
  criado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (fim - inicio >= interval '1 hour')
);
create index visitas_data_idx on public.visitas (data);

-- Voluntário alocado a uma visita
create table public.alocacoes (
  id            uuid primary key default gen_random_uuid(),
  visita_id    uuid not null references public.visitas (id) on delete cascade,
  voluntario_id  uuid not null references public.voluntarios (id) on delete cascade,
  estado        public.estado_alocacao not null default 'proposta',
  presenca      public.presenca,
  respondido_em timestamptz,
  motivo        text check (char_length(motivo) <= 500),
  criado_em    timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (visita_id, voluntario_id)
);
create index alocacoes_voluntario_idx on public.alocacoes (voluntario_id);

-- Testemunhos
create table public.testemunhos (
  id                       uuid primary key default gen_random_uuid(),
  autor_id                 uuid default auth.uid() references public.voluntarios (id) on delete cascade,
  anonimo                  boolean not null default false,
  nome_exibido             text not null default '' check (char_length(nome_exibido) <= 60),
  atividade_id              uuid references public.atividades (id) on delete set null,
  texto                    text not null check (char_length(btrim(texto)) between 20 and 2000),
  texto_publicado          text check (char_length(texto_publicado) <= 2000),
  consentimento_publicacao boolean not null check (consentimento_publicacao),
  estado                   public.estado_testemunho not null default 'pendente',
  destaque                 boolean not null default false,
  revisto_por              uuid references auth.users (id) on delete set null,
  revisto_em               timestamptz,
  criado_em               timestamptz not null default now(),
  atualizado_em               timestamptz not null default now()
);

-- Notas internas dos admins sobre voluntários
create table public.notas_admin (
  id           uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null references public.voluntarios (id) on delete cascade,
  autor_id     uuid default auth.uid() references auth.users (id) on delete set null,
  texto        text not null check (char_length(texto) between 1 and 2000),
  criado_em   timestamptz not null default now()
);

-- Registo de auditoria (não guarda valores, só quem/o quê/quando/que colunas)
create table public.auditoria (
  id         bigint generated always as identity primary key,
  ator_id    uuid,
  acao       text not null,
  tabela     text not null,
  registo_id text,
  colunas    text[],
  criado_em timestamptz not null default now()
);
create index auditoria_criado_idx on public.auditoria (criado_em desc);

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
create function private.e_membro_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins a where a.utilizador_id = (select auth.uid())) $$;

-- Definições do sistema. Só se alteram no SQL Editor do Supabase (não estão expostas pela API).
--   exigir_2fa_admins: LIGADO por omissão. Pode desligar-se temporariamente no projeto
--   de testes (estar-dev) com:  update private.definicoes set exigir_2fa_admins = false;
create table private.definicoes (
  id                boolean primary key default true check (id),  -- só uma linha
  exigir_2fa_admins boolean not null default true
);
insert into private.definicoes default values;
alter table private.definicoes enable row level security;  -- sem políticas: só funções do sistema a leem
revoke all on private.definicoes from public, anon, authenticated;

create function private.exige_2fa() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select d.exigir_2fa_admins from private.definicoes d), true) $$;

-- É admin E (se o 2FA estiver a ser exigido) a sessão passou o 2FA (aal2).
-- É ESTA função que dá acesso aos dados.
create function private.e_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.e_membro_admin()
     and (not private.exige_2fa() or coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2')
$$;

-- O período de disponibilidades do mês desta data está aberto hoje?
create function private.periodo_aberto(d date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.periodos_disponibilidade p
    where p.mes = date_trunc('month', d)::date
      and private.hoje() between p.abre_em and p.fecha_em
  )
$$;

-- O utilizador atual está alocado a esta visita, e a visita já lhe foi comunicada?
-- (definer para evitar recursão entre as políticas de visitas e alocacoes)
create function private.alocado_visivel(p_visita_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.alocacoes a
    join public.visitas s on s.id = a.visita_id
    where a.visita_id = p_visita_id
      and a.voluntario_id = (select auth.uid())
      and s.estado in ('comunicada', 'realizada', 'cancelada')
  )
$$;

-- atualizado_em automático
create function private.tocar_atualizado_em() returns trigger
language plpgsql set search_path = ''
as $$ begin new.atualizado_em := now(); return new; end $$;

-- -----------------------------------------------------------------------------
-- 4. Triggers de validação e proteção de colunas
-- -----------------------------------------------------------------------------

-- PERFIS: email vem sempre de auth.users; colunas sensíveis só mudam por admins;
-- idade mínima 16; menores precisam de encarregado e autorização.
create function private.validar_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin boolean := private.e_admin();
  v_idade integer;
begin
  -- Sincronização de email feita pelo sistema: deixar passar
  if current_setting('estar.sistema', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.email := coalesce((select u.email from auth.users u where u.id = new.id), '');
    new.criado_em := now();
    if not v_admin then
      new.estado := 'ativo';
      new.consentimento_privacidade_em := now();
      new.consentimento_partilha_contacto_em := now();
      new.consentimento_regras_em := now();
    end if;
  else
    new.id := old.id;
    new.email := old.email;
    new.criado_em := old.criado_em;
    if not v_admin then
      new.estado := old.estado;
      new.data_nascimento := old.data_nascimento;
      new.consentimento_privacidade_em := old.consentimento_privacidade_em;
      new.consentimento_partilha_contacto_em := old.consentimento_partilha_contacto_em;
      new.consentimento_regras_em := old.consentimento_regras_em;
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

  new.atualizado_em := now();
  return new;
end
$$;

create trigger voluntarios_validar
before insert or update on public.voluntarios
for each row execute function private.validar_perfil();

-- Manter o email do perfil igual ao da conta (se mudar em auth.users)
create function private.sincronizar_email() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    perform set_config('estar.sistema', 'on', true);
    update public.voluntarios set email = coalesce(new.email, '') where id = new.id;
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
  if private.e_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.voluntario_id := old.voluntario_id;
  end if;

  if not exists (select 1 from public.voluntarios p where p.id = new.voluntario_id and p.estado = 'ativo') then
    raise exception 'voluntario_inativo' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.atividades a
    join public.atividade_horarios h on h.atividade_id = a.id and h.dia_semana = v_dow
    where a.ativa
      and (new.atividade_id is null or a.id = new.atividade_id)
      and new.inicio >= h.abre
      and new.fim <= h.fecha
      and not exists (
        select 1 from public.atividade_fechos c
        where c.data = new.data and (c.atividade_id is null or c.atividade_id = a.id)
      )
  ) then
    raise exception 'fora_do_horario' using errcode = '22023',
      hint = 'Esse horário não coincide com o funcionamento da atividade nesse dia.';
  end if;

  -- Travão anti-abuso: no máximo 120 intervalos por mês
  if tg_op = 'INSERT' and (
    select count(*) from public.disponibilidades x
    where x.voluntario_id = new.voluntario_id
      and date_trunc('month', x.data) = date_trunc('month', new.data)
  ) >= 120 then
    raise exception 'limite_disponibilidades' using errcode = '54000';
  end if;

  return new;
end
$$;

create trigger disponibilidades_validar
before insert or update on public.disponibilidades
for each row execute function private.validar_disponibilidade();

-- TESTEMUNHOS: voluntário só cria pendentes em seu nome; revisão registada.
create function private.validar_testemunho() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin boolean := private.e_admin();
begin
  if tg_op = 'INSERT' then
    if not v_admin then
      new.autor_id := (select auth.uid());
      new.estado := 'pendente';
      new.destaque := false;
      new.texto_publicado := null;
      new.revisto_por := null;
      new.revisto_em := null;
      if (select count(*) from public.testemunhos t
          where t.autor_id = new.autor_id and t.estado = 'pendente') >= 3 then
        raise exception 'limite_testemunhos' using errcode = '54000',
          hint = 'Já tens 3 testemunhos à espera de revisão.';
      end if;
    end if;
    new.nome_exibido := case
      when new.anonimo then 'Anónimo'
      else coalesce(
        (select split_part(btrim(p.nome), ' ', 1) from public.voluntarios p where p.id = new.autor_id),
        'Anónimo')
    end;
    new.criado_em := now();
  else
    new.autor_id := old.autor_id;
    new.texto := old.texto;  -- o original fica sempre guardado; edita-se texto_publicado
    new.criado_em := old.criado_em;
    if new.estado is distinct from old.estado then
      new.revisto_por := (select auth.uid());
      new.revisto_em := now();
      if new.estado = 'aprovado' and new.texto_publicado is null then
        new.texto_publicado := new.texto;
      end if;
    end if;
  end if;
  new.atualizado_em := now();
  return new;
end
$$;

create trigger testemunhos_validar
before insert or update on public.testemunhos
for each row execute function private.validar_testemunho();

-- atualizado_em nas restantes tabelas
create trigger atividades_atualizado_em before update on public.atividades
for each row execute function private.tocar_atualizado_em();
create trigger atividade_contactos_atualizado_em before update on public.atividade_contactos
for each row execute function private.tocar_atualizado_em();
create trigger visitas_atualizado_em before update on public.visitas
for each row execute function private.tocar_atualizado_em();
create trigger alocacoes_atualizado_em before update on public.alocacoes
for each row execute function private.tocar_atualizado_em();
create trigger disponibilidade_notas_atualizado_em before update on public.disponibilidade_notas
for each row execute function private.tocar_atualizado_em();

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
  if tg_table_name <> 'admins' and not private.e_membro_admin() then
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
    where v_novo -> k is distinct from v_antigo -> k and k <> 'atualizado_em';
  end if;

  v_id := coalesce(v_novo, v_antigo) ->> case
    when tg_table_name = 'admins' then 'utilizador_id'
    when tg_table_name in ('atividade_contactos', 'atividade_horarios') then 'atividade_id'
    when tg_table_name = 'periodos_disponibilidade' then 'mes'
    else 'id' end;

  insert into public.auditoria (ator_id, acao, tabela, registo_id, colunas)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_cols);
  return null;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'voluntarios', 'atividades', 'atividade_contactos', 'atividade_horarios',
    'atividade_fechos', 'periodos_disponibilidade', 'visitas', 'alocacoes',
    'testemunhos', 'notas_admin'
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
alter table public.voluntarios             enable row level security;
alter table public.atividades           enable row level security;
alter table public.atividade_contactos    enable row level security;
alter table public.atividade_horarios       enable row level security;
alter table public.atividade_fechos    enable row level security;
alter table public.periodos_disponibilidade enable row level security;
alter table public.voluntario_interesses  enable row level security;
alter table public.disponibilidades       enable row level security;
alter table public.disponibilidade_notas   enable row level security;
alter table public.visitas             enable row level security;
alter table public.alocacoes          enable row level security;
alter table public.testemunhos         enable row level security;
alter table public.notas_admin          enable row level security;
alter table public.auditoria            enable row level security;

-- admins: cada um vê a própria linha; admins (com 2FA) veem todas. Escrita só por RPC.
create policy admins_select on public.admins for select to authenticated
  using (utilizador_id = (select auth.uid()) or (select private.e_admin()));

-- voluntarios
create policy voluntarios_select on public.voluntarios for select to authenticated
  using (id = (select auth.uid()) or (select private.e_admin()));
create policy voluntarios_insert on public.voluntarios for insert to authenticated
  with check (id = (select auth.uid()));
create policy voluntarios_update on public.voluntarios for update to authenticated
  using (id = (select auth.uid()) or (select private.e_admin()))
  with check (id = (select auth.uid()) or (select private.e_admin()));
create policy voluntarios_delete on public.voluntarios for delete to authenticated
  using ((select private.e_admin()));

-- Informação pública das atividades: todos leem, só admins escrevem
create policy atividades_select on public.atividades for select to anon, authenticated using (true);
create policy atividades_admin  on public.atividades for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

create policy atividade_horarios_select on public.atividade_horarios for select to anon, authenticated using (true);
create policy atividade_horarios_admin  on public.atividade_horarios for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

create policy atividade_fechos_select on public.atividade_fechos for select to anon, authenticated using (true);
create policy atividade_fechos_admin  on public.atividade_fechos for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

create policy periodos_disponibilidade_select on public.periodos_disponibilidade for select to anon, authenticated using (true);
create policy periodos_disponibilidade_admin  on public.periodos_disponibilidade for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

-- Contactos dos responsáveis: só admins
create policy atividade_contactos_admin on public.atividade_contactos for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

-- Interesses: o próprio ou admins
create policy voluntario_interesses_select on public.voluntario_interesses for select to authenticated
  using (voluntario_id = (select auth.uid()) or (select private.e_admin()));
create policy voluntario_interesses_insert on public.voluntario_interesses for insert to authenticated
  with check (voluntario_id = (select auth.uid()) or (select private.e_admin()));
create policy voluntario_interesses_delete on public.voluntario_interesses for delete to authenticated
  using (voluntario_id = (select auth.uid()) or (select private.e_admin()));

-- Disponibilidades: o próprio (só com o período aberto) ou admins
create policy disponibilidades_select on public.disponibilidades for select to authenticated
  using (voluntario_id = (select auth.uid()) or (select private.e_admin()));
create policy disponibilidades_insert on public.disponibilidades for insert to authenticated
  with check (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.e_admin()));
create policy disponibilidades_update on public.disponibilidades for update to authenticated
  using (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.e_admin()))
  with check (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.e_admin()));
create policy disponibilidades_delete on public.disponibilidades for delete to authenticated
  using (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(data))
    or (select private.e_admin()));

create policy disponibilidade_notas_select on public.disponibilidade_notas for select to authenticated
  using (voluntario_id = (select auth.uid()) or (select private.e_admin()));
create policy disponibilidade_notas_insert on public.disponibilidade_notas for insert to authenticated
  with check (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.e_admin()));
create policy disponibilidade_notas_update on public.disponibilidade_notas for update to authenticated
  using (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.e_admin()))
  with check (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.e_admin()));
create policy disponibilidade_notas_delete on public.disponibilidade_notas for delete to authenticated
  using (
    (voluntario_id = (select auth.uid()) and private.periodo_aberto(mes))
    or (select private.e_admin()));

-- Visitas: admins tudo; voluntário só vê as suas, depois de comunicadas
create policy visitas_select on public.visitas for select to authenticated
  using ((select private.e_admin()) or private.alocado_visivel(id));
create policy visitas_admin on public.visitas for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

-- Alocações: admins tudo; voluntário só vê as suas (de visitas comunicadas).
-- O voluntário responde (confirmar/recusar/cancelar) através de responder_alocacao().
create policy alocacoes_select on public.alocacoes for select to authenticated
  using ((select private.e_admin())
         or (voluntario_id = (select auth.uid()) and private.alocado_visivel(visita_id)));
create policy alocacoes_admin on public.alocacoes for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

-- Testemunhos: autor cria e vê os seus; pode apagar enquanto pendente; admins moderam.
-- O público lê os aprovados através de testemunhos_publicados().
create policy testemunhos_select on public.testemunhos for select to authenticated
  using (autor_id = (select auth.uid()) or (select private.e_admin()));
create policy testemunhos_insert on public.testemunhos for insert to authenticated
  with check (autor_id = (select auth.uid()) or (select private.e_admin()));
create policy testemunhos_update on public.testemunhos for update to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));
create policy testemunhos_delete on public.testemunhos for delete to authenticated
  using ((select private.e_admin())
         or (autor_id = (select auth.uid()) and estado = 'pendente'));

create policy notas_admin_admin on public.notas_admin for all to authenticated
  using ((select private.e_admin())) with check ((select private.e_admin()));

create policy auditoria_select on public.auditoria for select to authenticated
  using ((select private.e_admin()));

-- -----------------------------------------------------------------------------
-- 7. Funções públicas (RPC)
-- -----------------------------------------------------------------------------

-- Testemunhos aprovados, para a página pública (sem ids de autor nem texto original)
create function public.testemunhos_publicados(p_limite integer default 50)
returns table (id uuid, autor text, atividade text, texto text, destaque boolean, publicado_em timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.nome_exibido, a.nome, coalesce(t.texto_publicado, t.texto), t.destaque, t.revisto_em
  from public.testemunhos t
  left join public.atividades a on a.id = t.atividade_id
  where t.estado = 'aprovado'
  order by t.destaque desc, t.revisto_em desc nulls last
  limit least(greatest(coalesce(p_limite, 50), 1), 100)
$$;

-- Para o site saber se deve pedir o 2FA aos admins
create function public.admin_exige_2fa() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.exige_2fa() $$;

-- Para o site saber para onde encaminhar depois do login
create function public.sou_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.e_membro_admin() $$;

-- Voluntário confirma, recusa ou cancela uma visita
create function public.responder_alocacao(p_alocacao uuid, p_resposta public.estado_alocacao, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.alocacoes;
  s public.visitas;
begin
  select * into v from public.alocacoes where id = p_alocacao for update;
  if not found or v.voluntario_id is distinct from (select auth.uid()) then
    raise exception 'nao_encontrado' using errcode = 'P0002';
  end if;
  select * into s from public.visitas where id = v.visita_id;
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
  update public.alocacoes
     set estado = p_resposta,
         respondido_em = now(),
         motivo = nullif(left(btrim(coalesce(p_motivo, '')), 500), '')
   where id = p_alocacao;
end
$$;

-- Voluntários disponíveis para uma visita (cobre o horário completo da visita)
create function public.disponiveis_para_visita(p_visita uuid)
returns table (
  voluntario_id uuid, nome text, telefone text, email text, menor boolean,
  so_esta_atividade boolean, ja_alocado boolean, visitas_no_dia integer, visitas_no_mes integer
)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
  select p.id, p.nome, p.telefone, p.email,
         private.idade(p.data_nascimento) < 18,
         bool_or(av.atividade_id is not null),
         exists (select 1 from public.alocacoes x where x.visita_id = s.id and x.voluntario_id = p.id),
         (select count(*)::integer from public.alocacoes x join public.visitas s2 on s2.id = x.visita_id
           where x.voluntario_id = p.id and s2.data = s.data
             and x.estado in ('proposta', 'confirmada') and s2.estado <> 'cancelada'),
         (select count(*)::integer from public.alocacoes x join public.visitas s2 on s2.id = x.visita_id
           where x.voluntario_id = p.id and date_trunc('month', s2.data) = date_trunc('month', s.data)
             and x.estado in ('proposta', 'confirmada') and s2.estado <> 'cancelada')
  from public.visitas s
  join public.disponibilidades av
    on av.data = s.data and av.inicio <= s.inicio and av.fim >= s.fim
   and (av.atividade_id is null or av.atividade_id = s.atividade_id)
  join public.voluntarios p on p.id = av.voluntario_id and p.estado = 'ativo'
  where s.id = p_visita
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
  if not private.e_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'utilizador_nao_encontrado' using errcode = 'P0002',
      hint = 'A pessoa tem de entrar no site pelo menos uma vez antes de ser adicionada.';
  end if;
  insert into public.admins (utilizador_id, criado_por) values (v_id, (select auth.uid()))
  on conflict (utilizador_id) do nothing;
end
$$;

create function public.remover_admin(p_utilizador_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if (select count(*) from public.admins) <= 1 then
    raise exception 'ultimo_admin' using errcode = '22023',
      hint = 'Não é possível remover o último admin.';
  end if;
  delete from public.admins where utilizador_id = p_utilizador_id;
end
$$;

create function public.listar_admins()
returns table (utilizador_id uuid, email text, desde timestamptz, tem_2fa boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
  select a.utilizador_id, u.email::text, a.criado_em,
         exists (select 1 from auth.mfa_factors f where f.user_id = a.utilizador_id and f.status::text = 'verified')
  from public.admins a join auth.users u on u.id = a.utilizador_id
  order by a.criado_em;
end
$$;

-- RGPD: descarregar os meus dados
create function public.os_meus_dados() returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'perfil', (select to_jsonb(p) from public.voluntarios p where p.id = (select auth.uid())),
    'disponibilidades', coalesce((select jsonb_agg(to_jsonb(a) order by a.data)
                                  from public.disponibilidades a where a.voluntario_id = (select auth.uid())), '[]'),
    'interesses', coalesce((select jsonb_agg(act.nome) from public.voluntario_interesses i
                            join public.atividades act on act.id = i.atividade_id
                            where i.voluntario_id = (select auth.uid())), '[]'),
    'observacoes', coalesce((select jsonb_agg(to_jsonb(n) order by n.mes)
                             from public.disponibilidade_notas n where n.voluntario_id = (select auth.uid())), '[]'),
    'visitas', coalesce((select jsonb_agg(jsonb_build_object(
                           'atividade', act.nome, 'data', s.data, 'inicio', s.inicio, 'fim', s.fim,
                           'estado', x.estado, 'presenca', x.presenca) order by s.data)
                         from public.alocacoes x
                         join public.visitas s on s.id = x.visita_id
                         join public.atividades act on act.id = s.atividade_id
                         where x.voluntario_id = (select auth.uid())), '[]'),
    'testemunhos', coalesce((select jsonb_agg(jsonb_build_object(
                               'texto', t.texto, 'estado', t.estado, 'anonimo', t.anonimo, 'enviado_em', t.criado_em))
                             from public.testemunhos t where t.autor_id = (select auth.uid())), '[]')
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
  if exists (select 1 from public.admins where utilizador_id = v_uid)
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
grant select on public.atividades, public.atividade_horarios, public.atividade_fechos,
                public.periodos_disponibilidade
  to anon, authenticated;

-- Utilizadores autenticados (as políticas RLS decidem que linhas)
grant select                         on public.admins to authenticated;
grant select, insert, update, delete on public.voluntarios to authenticated;
grant insert, update, delete         on public.atividades, public.atividade_horarios,
                                        public.atividade_fechos, public.periodos_disponibilidade
  to authenticated;
grant select, insert, update, delete on public.atividade_contactos to authenticated;
grant select, insert, update, delete on public.disponibilidades, public.disponibilidade_notas to authenticated;
grant select, insert, delete         on public.voluntario_interesses to authenticated;
grant select, insert, update, delete on public.visitas, public.alocacoes to authenticated;
grant select, insert, update, delete on public.testemunhos to authenticated;
grant select, insert, update, delete on public.notas_admin to authenticated;
grant select                         on public.auditoria to authenticated;

-- Funções usadas dentro das políticas
grant execute on function private.hoje(), private.idade(date), private.e_membro_admin(),
                          private.e_admin(), private.periodo_aberto(date),
                          private.alocado_visivel(uuid)
  to authenticated;

-- RPCs
grant execute on function public.testemunhos_publicados(integer) to anon, authenticated;
grant execute on function public.sou_admin(), public.admin_exige_2fa(), public.responder_alocacao(uuid, public.estado_alocacao, text),
                          public.disponiveis_para_visita(uuid), public.adicionar_admin(text),
                          public.remover_admin(uuid), public.listar_admins(),
                          public.os_meus_dados(), public.apagar_a_minha_conta()
  to authenticated;

commit;
