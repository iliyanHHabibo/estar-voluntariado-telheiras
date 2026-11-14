-- =============================================================================
-- ⚠️  APAGA TODAS AS TABELAS E DADOS DO ESTAR. SÓ PARA O PROJETO DE TESTES (estar-dev).
-- =============================================================================
-- Serve para recomeçar do zero (ex.: depois de mudar a migração inicial).
-- Não apaga as contas de utilizador (Authentication → Users).
-- Depois de correr isto: correr outra vez a migração e o seed.sql.
-- NUNCA correr no estar-prod.
-- =============================================================================

begin;

drop trigger if exists auth_users_sincronizar_email on auth.users;
drop schema if exists private cascade;

-- Tabelas (nomes atuais e os nomes antigos em inglês da primeira versão)
drop table if exists
  public.auditoria, public.notas_admin, public.testemunhos, public.alocacoes, public.visitas,
  public.disponibilidade_notas, public.disponibilidades, public.periodos_disponibilidade,
  public.voluntario_interesses, public.atividade_fechos, public.atividade_horarios,
  public.atividade_contactos, public.atividades, public.voluntarios, public.admins,
  public.audit_log, public.admin_notes, public.testimonials, public.assignments, public.sessions,
  public.availability_notes, public.availabilities, public.availability_periods,
  public.volunteer_interests, public.activity_closures, public.activity_hours,
  public.activity_contacts, public.activities, public.profiles
cascade;

-- Funções públicas (RPC) criadas pela migração
drop function if exists
  public.testemunhos_publicados(integer), public.sou_admin(), public.admin_exige_2fa(),
  public.responder_alocacao(uuid, public.estado_alocacao, text),
  public.disponiveis_para_visita(uuid), public.disponiveis_para_sessao(uuid),
  public.adicionar_admin(text), public.remover_admin(uuid), public.listar_admins(),
  public.os_meus_dados(), public.apagar_a_minha_conta()
cascade;

drop type if exists
  public.estado_voluntario, public.estado_sessao, public.estado_visita, public.estado_alocacao,
  public.presenca, public.estado_testemunho
cascade;

commit;
