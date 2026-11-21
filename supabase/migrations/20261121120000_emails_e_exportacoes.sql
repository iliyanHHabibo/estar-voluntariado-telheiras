-- =============================================================================
-- Emails do site e registo das exportações de dados pessoais
-- =============================================================================
-- Aplicar no SQL Editor do Supabase DEPOIS das migrações anteriores. Seguro correr uma vez.
-- =============================================================================

begin;

-- Quando foi enviado à pessoa o email "estás alocado para…" (evita enviar duas vezes)
alter table public.alocacoes add column notificada_em timestamptz;

-- Quando se avisaram os voluntários de que a recolha deste mês abriu
alter table public.periodos_disponibilidade add column avisados_em timestamptz;

-- Exportar voluntários/visitas tira dados pessoais do sistema: fica registado quem e quando
create function public.registar_exportacao(p_o_que text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_o_que not in ('voluntarios', 'visitas') then
    raise exception 'pedido_invalido' using errcode = '22023';
  end if;
  insert into public.auditoria (ator_id, acao, tabela) values ((select auth.uid()), 'exportar', p_o_que);
end
$$;

revoke all on function public.registar_exportacao(text) from public, anon;
grant execute on function public.registar_exportacao(text) to authenticated;

-- Limite aos emails automáticos para a equipa (testemunho novo, voluntário que cancela…):
-- cada pessoa só pode gerar alguns por dia, para ninguém conseguir encher a caixa do ESTAR
-- nem gastar o limite diário de envios do Gmail.
create table private.avisos_equipa (
  id      bigint generated always as identity primary key,
  ator_id uuid not null,
  tipo    text not null,
  em      timestamptz not null default now()
);
alter table private.avisos_equipa enable row level security;
create index avisos_equipa_ator_idx on private.avisos_equipa (ator_id, tipo, em);

create function public.registar_aviso_equipa(p_tipo text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_limite integer;
  v_n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  v_limite := case p_tipo when 'testemunho' then 3 when 'resposta' then 10 end;
  if v_limite is null then
    raise exception 'pedido_invalido' using errcode = '22023';
  end if;
  delete from private.avisos_equipa where em < now() - interval '2 days';
  select count(*) into v_n from private.avisos_equipa
   where ator_id = (select auth.uid()) and tipo = p_tipo and em > now() - interval '1 day';
  if v_n >= v_limite then
    return false;
  end if;
  insert into private.avisos_equipa (ator_id, tipo) values ((select auth.uid()), p_tipo);
  return true;
end $$;
revoke all on function public.registar_aviso_equipa(text) from public, anon;
grant execute on function public.registar_aviso_equipa(text) to authenticated;

commit;
