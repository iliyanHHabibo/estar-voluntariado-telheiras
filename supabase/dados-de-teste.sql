-- =============================================================================
-- DADOS DE TESTE (só para o projeto de testes, estar-dev)
-- =============================================================================
-- Cria, para o voluntário com o email abaixo:
--   • um período de disponibilidades ABERTO para o mês seguinte (se ainda não existir);
--   • 3 visitas já "comunicadas": uma por confirmar, uma já confirmada e uma que já passou.
-- Depois, em /conta/disponibilidades e /conta/visitas, podes experimentar tudo.
--
-- 1. Troca o email na linha "v_email" pelo teu (tens de ter entrado no site e te inscrito).
-- 2. Corre tudo no SQL Editor do Supabase.
-- 3. Para limpar no fim, corre as duas linhas da secção "LIMPAR" no fundo.
-- =============================================================================

do $$
declare
  v_email    text := 'O-TEU-EMAIL@exemplo.com';   -- <<< muda aqui
  v_uid      uuid;
  v_hoje     date := private.hoje();
  v_mes      date := date_trunc('month', private.hoje() + interval '1 month')::date;
  v_clinica  uuid;
  v_centro   uuid;
  v_v1       uuid;
  v_v2       uuid;
  v_v3       uuid;
begin
  select u.id into v_uid from auth.users u where lower(u.email) = lower(v_email);
  if v_uid is null then
    raise exception 'Não há nenhuma conta com o email %. Entra primeiro no site.', v_email;
  end if;
  if not exists (select 1 from public.voluntarios where id = v_uid) then
    raise exception 'A conta % ainda não completou a inscrição de voluntário.', v_email;
  end if;

  select id into v_clinica from public.atividades where slug = 'clinica-sao-jose';
  select id into v_centro  from public.atividades where slug = 'centro-de-dia';

  -- Período aberto agora, para o mês seguinte
  insert into public.periodos_disponibilidade (mes, abre_em, fecha_em)
  values (v_mes, v_hoje - 1, v_hoje + 10)
  on conflict (mes) do update set abre_em = v_hoje - 1, fecha_em = v_hoje + 10;

  -- 1) Por confirmar (daqui a 8 dias), Clínica 15h–16h
  insert into public.visitas (atividade_id, data, inicio, fim, estado, notas)
  values (v_clinica, v_hoje + 8, '15:00', '16:00', 'comunicada', 'DADOS DE TESTE')
  returning id into v_v1;
  insert into public.alocacoes (visita_id, voluntario_id, estado) values (v_v1, v_uid, 'proposta');

  -- 2) Já confirmada (daqui a 5 dias), Centro de Dia 10h–11h30
  insert into public.visitas (atividade_id, data, inicio, fim, estado, notas)
  values (v_centro, v_hoje + 5, '10:00', '11:30', 'comunicada', 'DADOS DE TESTE')
  returning id into v_v2;
  insert into public.alocacoes (visita_id, voluntario_id, estado, respondido_em) values (v_v2, v_uid, 'confirmada', now());

  -- 3) Já passou (há 6 dias), com presença registada
  insert into public.visitas (atividade_id, data, inicio, fim, estado, notas)
  values (v_clinica, v_hoje - 6, '14:00', '15:00', 'realizada', 'DADOS DE TESTE')
  returning id into v_v3;
  insert into public.alocacoes (visita_id, voluntario_id, estado, presenca, respondido_em)
  values (v_v3, v_uid, 'confirmada', 'presente', now() - interval '10 days');

  raise notice 'Pronto: período de % aberto e 3 visitas criadas para %.', v_mes, v_email;
end $$;

-- =============================================================================
-- LIMPAR (corre isto no fim dos testes; apaga as visitas de teste e as suas alocações)
-- =============================================================================
-- delete from public.visitas where notas = 'DADOS DE TESTE';
-- delete from public.periodos_disponibilidade where mes = date_trunc('month', private.hoje() + interval '1 month')::date;
