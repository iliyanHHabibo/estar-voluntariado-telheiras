-- =============================================================================
-- Testes de permissões (RLS). Correr com: supabase/tests/correr.sh
-- Cada linha "ok" é uma verificação que passou; qualquer falha pára o script.
-- =============================================================================
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\set A '\'00000000-0000-0000-0000-00000000000a\''
\set B '\'00000000-0000-0000-0000-00000000000b\''
\set C '\'00000000-0000-0000-0000-00000000000c\''
\set M '\'00000000-0000-0000-0000-00000000000d\''
\set X '\'00000000-0000-0000-0000-00000000000e\''

-- ---------- Preparação (como superutilizador) ----------
insert into auth.users (id, email) values
  (:A, 'ana@exemplo.pt'), (:B, 'bruno@exemplo.pt'), (:C, 'carla@exemplo.pt'),
  (:M, 'admin@exemplo.pt'), (:X, 'novo.admin@exemplo.pt');
insert into public.admins (user_id) values (:M);
insert into auth.mfa_factors (user_id, status) values (:M, 'verified');

select date_trunc('month', private.hoje() + interval '1 month')::date as mes \gset
select (:'mes'::date + ((6 - extract(isodow from :'mes'::date)::int + 7) % 7))::date as sabado \gset
select (:'mes'::date + ((1 - extract(isodow from :'mes'::date)::int + 7) % 7))::date as segunda \gset
select id as clinica from public.activities where slug = 'clinica-sao-jose' \gset
select id as centro from public.activities where slug = 'centro-de-dia' \gset

-- ================= ANÓNIMO (visitante sem login) =================
set role anon;
select tests.sair();
select tests.ok((select count(*) from public.activities) = 2, 'anónimo vê as atividades');
select tests.ok((select count(*) from public.activity_hours) > 0, 'anónimo vê os horários');
select tests.falha('select * from public.profiles', 'permission denied', 'anónimo NÃO lê perfis');
select tests.falha('select * from public.activity_contacts', 'permission denied', 'anónimo NÃO lê contactos dos responsáveis');
select tests.falha('select * from public.testimonials', 'permission denied', 'anónimo NÃO lê a tabela de testemunhos');
select tests.falha('select * from public.audit_log', 'permission denied', 'anónimo NÃO lê a auditoria');
select tests.falha('select public.sou_admin()', 'permission denied', 'anónimo NÃO chama funções de utilizador');
select tests.falha('select private.is_admin_member()', 'permission denied', 'anónimo NÃO chama funções privadas sem permissão');
select tests.falha('insert into public.activities (slug, nome) values (''x'', ''Hack'')', 'permission denied', 'anónimo NÃO cria atividades');
select tests.ok((select count(*) from public.testemunhos_publicados()) = 0, 'anónimo lê testemunhos publicados (ainda 0)');
reset role;

-- ================= VOLUNTÁRIA A (adulta, sem 2FA) =================
set role authenticated;
select tests.entrar(:A);

select tests.falha(format('insert into public.profiles (id, nome, telefone, data_nascimento) values (%L, ''Intrusa'', ''912345678'', ''1990-01-01'')', :B),
  'row-level security', 'A NÃO cria perfil em nome de B');
select tests.falha(format('insert into public.profiles (id, nome, telefone, data_nascimento) values (%L, ''Ana'', ''912345678'', %L)', :A, private.hoje() - interval '15 years'),
  'idade_minima', 'menos de 16 anos é recusado');
select tests.falha(format('insert into public.profiles (id, nome, telefone, data_nascimento) values (%L, ''Ana'', ''12'', ''1990-01-01'')', :A),
  'check constraint', 'telefone inválido é recusado');

insert into public.profiles (id, nome, telefone, data_nascimento, estado, email, consent_privacidade_em)
values (:A, '  Ana Silva ', '912 345 678', private.hoje() - interval '30 years', 'inativo', 'falso@x.pt', '2000-01-01');
select tests.ok((select estado from public.profiles where id = :A) = 'ativo', 'A não consegue criar-se com estado escolhido por ela');
select tests.ok((select email from public.profiles where id = :A) = 'ana@exemplo.pt', 'email vem sempre da conta, não do formulário');
select tests.ok((select consent_privacidade_em > now() - interval '1 minute' from public.profiles where id = :A), 'data do consentimento é a do servidor');
select tests.ok((select nome from public.profiles where id = :A) = 'Ana Silva', 'nome é limpo de espaços');

select tests.ok(tests.linhas('update public.profiles set estado = ''inativo'', data_nascimento = ''1950-01-01'', nome = ''Ana S.''') = 1, 'A atualiza o seu perfil');
select tests.ok((select estado = 'ativo' and data_nascimento <> '1950-01-01' and nome = 'Ana S.' from public.profiles where id = :A),
  'A muda o nome mas NÃO o estado nem a data de nascimento');
select tests.ok(not public.sou_admin(), 'A não é admin');
insert into public.volunteer_interests (activity_id) values (:'clinica'), (:'centro');
select tests.ok((select count(*) from public.volunteer_interests) = 2, 'A indica as atividades que lhe interessam');
select tests.falha(format('insert into public.volunteer_interests (volunteer_id, activity_id) values (%L, %L)', :B, :'clinica'),
  'row-level security', 'A NÃO indica interesses em nome de B');
reset role;

-- ================= VOLUNTÁRIOS B (adulto) e C (menor) =================
set role authenticated;
select tests.entrar(:B);
insert into public.profiles (id, nome, telefone, data_nascimento) values (:B, 'Bruno Costa', '+351 913 000 000', '1995-05-05');
select tests.ok((select count(*) from public.profiles) = 1, 'B só vê o seu próprio perfil');
select tests.ok(tests.linhas(format('update public.profiles set nome = ''Hack'' where id = %L', :A)) = 0, 'B NÃO altera o perfil de A');
select tests.ok(tests.linhas(format('delete from public.profiles where id = %L', :A)) = 0, 'B NÃO apaga o perfil de A');

select tests.entrar(:C);
select tests.falha(format('insert into public.profiles (id, nome, telefone, data_nascimento) values (%L, ''Carla'', ''914000000'', %L)', :C, private.hoje() - interval '16 years 2 days'),
  'encarregado_obrigatorio', 'menor sem encarregado é recusada');
insert into public.profiles (id, nome, telefone, data_nascimento, encarregado_nome, encarregado_telefone, autorizacao_encarregado)
values (:C, 'Carla Dias', '914000000', private.hoje() - interval '16 years 2 days', 'Pai da Carla', '915000000', true);
select tests.ok(true, 'menor com encarregado e autorização é aceite');
select tests.falha('update public.profiles set autorizacao_encarregado = false', 'encarregado_obrigatorio', 'menor não pode retirar a autorização');
reset role;

-- ================= Disponibilidades =================
set role authenticated;
select tests.entrar(:A);
select tests.falha(format('insert into public.availabilities (data, inicio, fim, activity_id) values (%L, ''14:00'', ''16:00'', %L)', :'sabado', :'clinica'),
  'row-level security', 'sem período aberto, NÃO se indicam disponibilidades');
select tests.falha(format('insert into public.availability_periods (mes, abre_em, fecha_em) values (%L, current_date, current_date)', :'mes'),
  'row-level security', 'voluntária NÃO abre períodos');
reset role;

-- Admin abre o período (diretamente, como se fosse pelo painel)
insert into public.availability_periods (mes, abre_em, fecha_em) values (:'mes', private.hoje() - 1, private.hoje() + 1);

set role authenticated;
select tests.entrar(:A);
insert into public.availabilities (data, inicio, fim, activity_id) values (:'sabado', '14:00', '17:00', :'clinica');
select tests.ok(true, 'A indica disponibilidade (clínica, sábado 14h–17h)');
insert into public.availabilities (data, inicio, fim, activity_id) values (:'segunda', '10:00', '12:00', null);
select tests.ok(true, 'A indica disponibilidade para "qualquer atividade"');
select tests.falha(format('insert into public.availabilities (data, inicio, fim, activity_id) values (%L, ''14:00'', ''16:00'', %L)', :'sabado', :'centro'),
  'fora_do_horario', 'Centro de Dia ao sábado é recusado');
select tests.falha(format('insert into public.availabilities (data, inicio, fim, activity_id) values (%L, ''17:00'', ''19:00'', %L)', :'sabado', :'clinica'),
  'fora_do_horario', 'depois do fecho (18h) é recusado');
select tests.falha(format('insert into public.availabilities (data, inicio, fim, activity_id) values (%L, ''14:00'', ''14:30'', %L)', :'sabado', :'clinica'),
  'check constraint', 'menos de 1 hora é recusado');
select tests.falha(format('insert into public.availabilities (volunteer_id, data, inicio, fim, activity_id) values (%L, %L, ''14:00'', ''16:00'', %L)', :B, :'sabado', :'clinica'),
  'row-level security', 'A NÃO indica disponibilidades em nome de B');
select tests.falha(format('insert into public.availabilities (data, inicio, fim, activity_id) values (%L, ''14:00'', ''16:00'', %L)', (:'mes'::date + interval '1 month')::date, :'clinica'),
  'row-level security', 'mês sem período aberto é recusado');
insert into public.availability_notes (mes, texto) values (:'mes', 'Este mês só posso 2 vezes');
select tests.ok(true, 'A deixa observação para o mês');

select tests.entrar(:B);
select tests.ok((select count(*) from public.availabilities) = 0, 'B NÃO vê as disponibilidades de A');
select tests.ok((select count(*) from public.volunteer_interests) = 0, 'B NÃO vê os interesses de A');
select tests.ok(tests.linhas('delete from public.availabilities') = 0, 'B NÃO apaga disponibilidades de A');
select tests.ok((select count(*) from public.activity_contacts) = 0, 'voluntário NÃO vê contactos dos responsáveis');
select tests.ok((select count(*) from public.audit_log) = 0, 'voluntário NÃO vê a auditoria');
select tests.ok((select count(*) from public.admins) = 0, 'voluntário NÃO vê a lista de admins');
select tests.falha('insert into public.admins (user_id) values (auth.uid())', 'permission denied', 'voluntário NÃO se torna admin sozinho');
select tests.falha(format('select public.adicionar_admin(%L)', 'bruno@exemplo.pt'), 'sem_permissao', 'voluntário NÃO adiciona admins');
select tests.falha(format('select * from public.disponiveis_para_sessao(%L)', gen_random_uuid()), 'sem_permissao', 'voluntário NÃO lista disponíveis');
reset role;

-- ================= ADMIN SEM 2FA (aal1) =================
set role authenticated;
select tests.entrar(:M, 'aal1');
select tests.ok(public.sou_admin(), 'admin é reconhecido como admin (para encaminhar para o 2FA)');
select tests.ok((select count(*) from public.profiles) = 0, 'admin SEM 2FA NÃO vê perfis');
select tests.ok((select count(*) from public.availabilities) = 0, 'admin SEM 2FA NÃO vê disponibilidades');
select tests.falha(format('insert into public.sessions (activity_id, data, inicio, fim) values (%L, %L, ''14:00'', ''15:00'')', :'clinica', :'sabado'),
  'row-level security', 'admin SEM 2FA NÃO cria visitas');
select tests.falha('select * from public.listar_admins()', 'sem_permissao', 'admin SEM 2FA NÃO gere admins');

-- ================= ADMIN COM 2FA (aal2) =================
select tests.entrar(:M, 'aal2');
select tests.ok((select count(*) from public.profiles) = 3, 'admin com 2FA vê todos os perfis');
select tests.ok((select count(*) from public.availabilities) = 2, 'admin com 2FA vê todas as disponibilidades');
update public.activity_contacts set responsavel_nome = 'Enf. Responsável', responsavel_contacto = '210000000' where activity_id = :'clinica';
select tests.ok((select count(*) from public.activity_contacts where responsavel_nome is not null) = 1, 'admin gere contactos dos responsáveis');

insert into public.sessions (activity_id, data, inicio, fim) values (:'clinica', :'sabado', '15:00', '16:00') returning id as sessao \gset
select tests.falha(format('insert into public.sessions (activity_id, data, inicio, fim) values (%L, %L, ''15:00'', ''15:30'')', :'clinica', :'sabado'),
  'check constraint', 'visita com menos de 1 hora é recusada');
select tests.ok((select count(*) from public.disponiveis_para_sessao(:'sessao')) = 1, 'A aparece como disponível para a visita das 15h');
select tests.ok((select bool_and(volunteer_id = :A) from public.disponiveis_para_sessao(:'sessao')), 'e é mesmo a A');
insert into public.assignments (session_id, volunteer_id) values (:'sessao', :A) returning id as alocacao \gset
insert into public.assignments (session_id, volunteer_id) values (:'sessao', :C);
update public.profiles set estado = 'inativo' where id = :B;
select tests.ok((select estado from public.profiles where id = :B) = 'inativo', 'admin pode mudar o estado de um voluntário');
update public.profiles set estado = 'ativo' where id = :B;
reset role;

-- Visita ainda em rascunho: voluntária não a vê
set role authenticated;
select tests.entrar(:A);
select tests.ok((select count(*) from public.sessions) = 0, 'visita em rascunho NÃO é visível para a voluntária');
select tests.ok((select count(*) from public.assignments) = 0, 'alocação em rascunho NÃO é visível');
select tests.falha(format('select public.responder_alocacao(%L, ''confirmada'')', :'alocacao'), 'ja_nao_e_possivel', 'não se responde a visita não comunicada');

select tests.entrar(:M, 'aal2');
update public.sessions set estado = 'comunicada' where id = :'sessao';

select tests.entrar(:A);
select tests.ok((select count(*) from public.sessions) = 1, 'visita comunicada é visível para a voluntária alocada');
select tests.ok((select count(*) from public.assignments) = 1, 'A vê só a SUA alocação (não a da C)');
select tests.ok(tests.linhas('update public.assignments set estado = ''confirmada'', presenca = ''presente''') = 0, 'A NÃO altera a alocação diretamente');
select tests.ok(tests.linhas('delete from public.sessions') = 0, 'A NÃO apaga visitas');

select tests.entrar(:B);
select tests.ok((select count(*) from public.sessions) = 0, 'B (não alocado) NÃO vê a visita');
select tests.falha(format('select public.responder_alocacao(%L, ''recusada'')', :'alocacao'), 'nao_encontrado', 'B NÃO responde pela A');

select tests.entrar(:A);
select public.responder_alocacao(:'alocacao', 'confirmada');
select tests.ok((select estado from public.assignments where id = :'alocacao') = 'confirmada', 'A confirma a visita');
select tests.falha(format('select public.responder_alocacao(%L, ''proposta'')', :'alocacao'), 'transicao_invalida', 'transição inválida é recusada');
select public.responder_alocacao(:'alocacao', 'cancelada', 'Fiquei doente');
select tests.ok((select estado = 'cancelada' and motivo = 'Fiquei doente' from public.assignments where id = :'alocacao'), 'A cancela com motivo ("Não posso ir")');
reset role;

-- ================= Testemunhos =================
set role authenticated;
select tests.entrar(:A);
insert into public.testimonials (texto, consentimento_publicacao, estado, destaque, activity_id)
values ('Foi uma tarde incrível, saí de lá mais leve do que entrei.', true, 'aprovado', true, :'clinica')
returning id as testemunho \gset
select tests.ok((select estado = 'pendente' and not destaque and nome_exibido = 'Ana' from public.testimonials where id = :'testemunho'),
  'testemunho entra SEMPRE como pendente, com o primeiro nome');
select tests.falha('insert into public.testimonials (texto, consentimento_publicacao) values (''curto'', true)', 'check constraint', 'testemunho demasiado curto é recusado');
select tests.falha('insert into public.testimonials (texto, consentimento_publicacao) values (''Um texto suficientemente longo aqui.'', false)', 'check constraint', 'sem autorização para publicar é recusado');
insert into public.testimonials (texto, consentimento_publicacao, anonimo) values ('Segundo testemunho com texto suficiente.', true, true);
insert into public.testimonials (texto, consentimento_publicacao) values ('Terceiro testemunho com texto suficiente.', true);
select tests.falha('insert into public.testimonials (texto, consentimento_publicacao) values (''Quarto testemunho com texto suficiente.'', true)', 'limite_testemunhos', 'máximo 3 pendentes (anti-spam)');
select tests.ok((select nome_exibido from public.testimonials where anonimo) = 'Anónimo', 'testemunho anónimo mostra "Anónimo"');
select tests.ok(tests.linhas(format('update public.testimonials set estado = ''aprovado'' where id = %L', :'testemunho')) = 0, 'A NÃO aprova o seu próprio testemunho');

select tests.entrar(:B);
select tests.ok((select count(*) from public.testimonials) = 0, 'B NÃO vê testemunhos pendentes de A');

select tests.entrar(:M, 'aal2');
update public.testimonials set estado = 'aprovado', texto_publicado = 'Foi uma tarde incrível.' where id = :'testemunho';
select tests.ok((select revisto_por = :M from public.testimonials where id = :'testemunho'), 'aprovação regista quem reviu');
reset role;

set role anon;
select tests.sair();
select tests.ok((select count(*) from public.testemunhos_publicados()) = 1, 'público vê o testemunho aprovado');
select tests.ok((select texto from public.testemunhos_publicados()) = 'Foi uma tarde incrível.', 'público vê a versão editada pelos admins');
reset role;

-- ================= Gestão de admins e auditoria =================
set role authenticated;
select tests.entrar(:M, 'aal2');
select tests.falha('select public.remover_admin(auth.uid())', 'ultimo_admin', 'não se remove o último admin');
select tests.falha('select public.adicionar_admin(''nao.existe@exemplo.pt'')', 'utilizador_nao_encontrado', 'adicionar email sem conta dá erro claro');
select public.adicionar_admin('NOVO.admin@exemplo.pt');
select tests.ok((select count(*) from public.listar_admins()) = 2, 'admin adiciona outro admin (email sem distinção de maiúsculas)');
select tests.ok((select not tem_2fa from public.listar_admins() where email = 'novo.admin@exemplo.pt'), 'lista mostra que o novo admin ainda não tem 2FA');
select tests.ok((select count(*) from public.audit_log) > 0, 'admin vê a auditoria');
select tests.ok((select bool_and(ator_id = :M) from public.audit_log where tabela = 'sessions'), 'auditoria regista quem criou a visita');
select tests.ok((select colunas = array['estado'] from public.audit_log where tabela = 'sessions' and acao = 'update' limit 1), 'auditoria regista que colunas mudaram (sem valores)');
select tests.falha('delete from public.audit_log', 'permission denied', 'NINGUÉM apaga a auditoria (nem admins)');
select tests.falha('update public.audit_log set acao = ''x''', 'permission denied', 'NINGUÉM altera a auditoria');
reset role;

-- ================= RGPD =================
set role authenticated;
select tests.entrar(:A);
select tests.ok((select (public.os_meus_dados() -> 'perfil' ->> 'nome') = 'Ana S.'), 'A descarrega os seus dados');
select tests.ok((select jsonb_array_length(public.os_meus_dados() -> 'disponibilidades')) = 2, 'export inclui as disponibilidades');
reset role;

update auth.users set email = 'ana.nova@exemplo.pt' where id = :A;
select tests.ok((select email from public.profiles where id = :A) = 'ana.nova@exemplo.pt', 'mudança de email da conta passa para o perfil');

set role authenticated;
select tests.entrar(:A);
select public.apagar_a_minha_conta();
reset role;
select tests.ok(not exists (select 1 from auth.users where id = :A), 'A apaga a conta');
select tests.ok(not exists (select 1 from public.profiles where id = :A), 'perfil de A desaparece');
select tests.ok(not exists (select 1 from public.availabilities where volunteer_id = :A), 'disponibilidades de A desaparecem');
select tests.ok(not exists (select 1 from public.testimonials where autor_id = :A), 'testemunhos de A desaparecem');

set role authenticated;
select tests.entrar(:M, 'aal2');
select public.remover_admin(:X);
select tests.falha('select public.apagar_a_minha_conta()', 'ultimo_admin', 'último admin NÃO apaga a própria conta');
reset role;

select 'TODOS OS TESTES PASSARAM';
