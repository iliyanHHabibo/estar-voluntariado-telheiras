-- =============================================================================
-- Conteúdo gerido pelos admins: atividades, horários, fechos, testemunhos e notas.
-- Verifica o que o público, os voluntários e os admins (com e sem 2FA) podem ler/escrever.
-- =============================================================================
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\set ADM '\'00000000-0000-0000-0000-0000000000e0\''
\set VOL '\'00000000-0000-0000-0000-0000000000e1\''
\set VOL2 '\'00000000-0000-0000-0000-0000000000e2\''

insert into auth.users (id, email) values (:ADM, 'admin.conteudo@exemplo.pt'), (:VOL, 'vol.conteudo@exemplo.pt'), (:VOL2, 'vol2.conteudo@exemplo.pt');
insert into public.admins (utilizador_id) values (:ADM);
update private.definicoes set exigir_2fa_admins = true;
select id as clinica from public.atividades where slug = 'clinica-sao-jose' \gset
select id as centro from public.atividades where slug = 'centro-de-dia' \gset

set role authenticated;
select tests.entrar(:VOL);
insert into public.voluntarios (id, nome, telefone, data_nascimento) values (auth.uid(), 'Vera Voluntária', '911000001', '1995-01-01');
select tests.entrar(:VOL2);
insert into public.voluntarios (id, nome, telefone, data_nascimento) values (auth.uid(), 'Vitor Outro', '911000002', '1996-02-02');
reset role;

-- ================= O PÚBLICO lê as atividades (incluindo "o que esperar") =================
set role anon;
select tests.sair();
select tests.ok((select count(*) from public.atividades where ativa) = 2, 'público lê as atividades ativas');
select tests.ok((select cardinality(o_que_esperar) = 3 from public.atividades where slug = 'clinica-sao-jose'), 'e o "o que esperar" já vem preenchido');
select tests.ok((select count(*) from public.atividade_horarios) > 0, 'público lê os horários');
select tests.falha('select * from public.atividade_contactos', 'permission denied', 'público NÃO lê os contactos dos responsáveis');
reset role;

-- ================= ADMIN edita atividades =================
set role authenticated;
select tests.entrar(:ADM, 'aal2');
update public.atividades set nome = 'Clínica de S. José — Unidade 4 (editada)', regras = array['Regra nova 1', 'Regra nova 2', 'Regra nova 3'], max_voluntarios = 6 where id = :'clinica';
select tests.ok((select nome like '%editada%' and cardinality(regras) = 3 and max_voluntarios = 6 from public.atividades where id = :'clinica'), 'admin edita nome, regras e limites');
select tests.falha(format('update public.atividades set min_voluntarios = 9, max_voluntarios = 3 where id = %L', :'clinica'), 'check constraint', 'mínimo maior que o máximo é recusado');
select tests.falha(format('update public.atividades set regras = (select array_agg(i::text) from generate_series(1, 25) i) where id = %L', :'clinica'), 'atividades_listas_tamanho', 'listas com mais de 20 itens são recusadas');
select tests.falha('insert into public.atividades (slug, nome) values (''Slug Inválido!'', ''Um nome válido'')', 'atividades_slug_check', 'slug com maiúsculas/símbolos é recusado');
insert into public.atividades (slug, nome, resumo, descricao, ordem) values ('nova-atividade', 'Nova atividade', 'Resumo', 'Descrição', 3) returning id as nova \gset
insert into public.atividade_contactos (atividade_id, responsavel_nome, responsavel_contacto) values (:'nova', 'Dra. Maria', '210000000');
select tests.ok((select responsavel_nome = 'Dra. Maria' from public.atividade_contactos where atividade_id = :'nova'), 'admin guarda o contacto do responsável');

-- horários: substituir o horário semanal
delete from public.atividade_horarios where atividade_id = :'nova';
insert into public.atividade_horarios (atividade_id, dia_semana, abre, fecha) values (:'nova', 2, '09:00', '12:00'), (:'nova', 4, '09:00', '12:00');
select tests.ok((select count(*) = 2 from public.atividade_horarios where atividade_id = :'nova'), 'admin define o horário semanal');
select tests.falha(format('insert into public.atividade_horarios (atividade_id, dia_semana, abre, fecha) values (%L, 3, ''12:00'', ''09:00'')', :'nova'), 'check constraint', 'horário que fecha antes de abrir é recusado');
select tests.falha(format('insert into public.atividade_horarios (atividade_id, dia_semana, abre, fecha) values (%L, 2, ''10:00'', ''11:00'')', :'nova'), 'duplicate key', 'dois horários para o mesmo dia da semana são recusados');

-- fechos (feriados): um para tudo, outro só para uma atividade
insert into public.atividade_fechos (atividade_id, data, motivo) values (null, '2027-12-24', 'Véspera de Natal');
insert into public.atividade_fechos (atividade_id, data, motivo) values (:'nova', '2027-12-24', 'Nova atividade fechada');
select tests.falha('insert into public.atividade_fechos (atividade_id, data, motivo) values (null, ''2027-12-24'', ''Repetido'')', 'duplicate key', 'não há dois fechos "para tudo" no mesmo dia');
select tests.falha(format('insert into public.atividade_fechos (atividade_id, data, motivo) values (%L, ''2027-12-24'', ''Repetido'')', :'nova'), 'duplicate key', 'nem dois para a mesma atividade');
reset role;

-- O público vê os fechos e a atividade nova, mas não o contacto
set role anon;
select tests.sair();
select tests.ok((select count(*) = 2 from public.atividade_fechos where data = '2027-12-24'), 'público lê os fechos');
select tests.ok((select count(*) = 1 from public.atividades where slug = 'nova-atividade'), 'público vê a atividade nova');
reset role;

-- ================= Voluntário e admin SEM 2FA não editam =================
set role authenticated;
select tests.entrar(:VOL);
select tests.ok(tests.linhas(format('update public.atividades set nome = ''Hack'' where id = %L', :'clinica')) = 0, 'voluntário NÃO edita atividades');
select tests.falha('insert into public.atividades (slug, nome) values (''hack'', ''Hack'')', 'row-level security', 'voluntário NÃO cria atividades');
select tests.ok(tests.linhas(format('delete from public.atividade_fechos where atividade_id = %L', :'nova')) = 0, 'voluntário NÃO apaga fechos');
select tests.entrar(:ADM, 'aal1');
select tests.ok(tests.linhas(format('update public.atividades set nome = ''Hack'' where id = %L', :'clinica')) = 0, 'admin sem 2FA NÃO edita atividades');
select tests.ok((select count(*) from public.atividade_contactos) = 0, 'admin sem 2FA NÃO lê contactos dos responsáveis');
reset role;

-- ================= TESTEMUNHOS: moderação e página pública =================
set role authenticated;
select tests.entrar(:VOL);
insert into public.testemunhos (texto, consentimento_publicacao, atividade_id)
values ('Foi uma tarde muito especial, conversámos sobre tudo.', true, :'clinica') returning id as t1 \gset
insert into public.testemunhos (texto, consentimento_publicacao, anonimo)
values ('Aprendi imenso com as histórias que ouvi lá.', true, true) returning id as t2 \gset
select tests.entrar(:VOL2);
insert into public.testemunhos (texto, consentimento_publicacao)
values ('Este texto vai ser rejeitado por ter um nome de utente.', true) returning id as t3 \gset
select tests.ok((select count(*) from public.testemunhos) = 1, 'cada voluntário só vê os seus testemunhos');
reset role;

set role anon;
select tests.sair();
select tests.ok((select count(*) from public.testemunhos_publicados()) = 0, 'enquanto pendentes, o público não vê nenhum');
reset role;

set role authenticated;
select tests.entrar(:ADM, 'aal1');
select tests.ok((select count(*) from public.testemunhos) = 0, 'admin sem 2FA NÃO vê testemunhos');
select tests.ok(tests.linhas(format('update public.testemunhos set estado = ''aprovado'' where id = %L', :'t1')) = 0, 'admin sem 2FA NÃO aprova');

select tests.entrar(:ADM, 'aal2');
select tests.ok((select count(*) from public.testemunhos where estado = 'pendente') = 3, 'admin com 2FA vê os 3 pendentes');
update public.testemunhos set estado = 'aprovado', texto_publicado = 'Foi uma tarde muito especial.' where id = :'t1';
update public.testemunhos set estado = 'aprovado' where id = :'t2';
update public.testemunhos set estado = 'rejeitado' where id = :'t3';
select tests.ok((select revisto_por = :ADM and revisto_em is not null from public.testemunhos where id = :'t1'), 'a revisão regista quem reviu e quando');
select tests.ok((select texto_publicado = texto from public.testemunhos where id = :'t2'), 'aprovado sem editar: publica o texto original');
update public.testemunhos set texto = 'O admin tenta alterar o texto original do voluntário.' where id = :'t1';
select tests.ok((select texto like 'Foi uma tarde%' from public.testemunhos where id = :'t1'), 'o texto ORIGINAL do voluntário nunca se altera (só o texto publicado)');
reset role;

set role anon;
select tests.sair();
select tests.ok((select count(*) from public.testemunhos_publicados()) = 2, 'público vê os 2 aprovados (o rejeitado não aparece)');
select tests.ok((select texto from public.testemunhos_publicados() where autor = 'Vera') = 'Foi uma tarde muito especial.', 'e vê a versão editada, com só o primeiro nome');
select tests.ok((select count(*) from public.testemunhos_publicados() where autor = 'Anónimo') = 1, 'o anónimo aparece como "Anónimo"');
select tests.ok((select atividade from public.testemunhos_publicados() where autor = 'Vera') like 'Clínica%', 'com o nome da atividade');
select tests.falha('select * from public.testemunhos', 'permission denied', 'o público não lê a tabela diretamente (só pela função)');
reset role;

set role authenticated;
select tests.entrar(:ADM, 'aal2');
update public.testemunhos set destaque = true where id = :'t2';
reset role;
set role anon;
select tests.sair();
select tests.ok((select autor from public.testemunhos_publicados() limit 1) = 'Anónimo', 'os destacados aparecem primeiro');
reset role;

set role authenticated;
select tests.entrar(:ADM, 'aal2');
update public.testemunhos set estado = 'pendente' where id = :'t1';
reset role;
set role anon;
select tests.sair();
select tests.ok((select count(*) from public.testemunhos_publicados()) = 1, 'voltar a pendente tira o testemunho do site');
reset role;

set role authenticated;
select tests.entrar(:VOL2);
select tests.ok(tests.linhas(format('delete from public.testemunhos where id = %L', :'t3')) = 0, 'um testemunho já revisto (rejeitado) já não se apaga');

-- ================= NOTAS INTERNAS =================
select tests.entrar(:ADM, 'aal2');
insert into public.notas_admin (voluntario_id, texto) values (:VOL, 'Prefere visitas de manhã.') returning id as nota \gset
select tests.ok((select autor_id = :ADM from public.notas_admin where id = :'nota'), 'a nota regista quem a escreveu');
select tests.entrar(:VOL);
select tests.ok((select count(*) from public.notas_admin) = 0, 'o voluntário NÃO vê as notas que os admins escrevem sobre ele');
select tests.falha(format('insert into public.notas_admin (voluntario_id, texto) values (%L, ''x'')', :VOL), 'row-level security', 'e não escreve notas');
select tests.entrar(:ADM, 'aal1');
select tests.ok((select count(*) from public.notas_admin) = 0, 'admin sem 2FA NÃO vê as notas');
select tests.entrar(:ADM, 'aal2');
delete from public.notas_admin where id = :'nota';
select tests.ok((select count(*) from public.notas_admin) = 0, 'o admin apaga uma nota');

-- ================= ADMIN edita um voluntário =================
update public.voluntarios set telefone = '933000001', nome = 'Vera Editada', encarregado_nome = null where id = :VOL;
select tests.ok((select telefone = '933000001' and nome = 'Vera Editada' from public.voluntarios where id = :VOL), 'admin corrige nome e telefone');
update public.voluntarios set email = 'outro@exemplo.pt' where id = :VOL;
select tests.ok((select email = 'vol.conteudo@exemplo.pt' from public.voluntarios where id = :VOL), 'o email do voluntário nunca se altera por aqui (vem da conta)');
select tests.falha(format('update public.voluntarios set data_nascimento = (private.hoje() - interval ''15 years'')::date where id = %L', :VOL), 'idade_minima', 'nem o admin põe uma data de nascimento abaixo dos 16 anos');
update public.voluntarios set estado = 'inativo' where id = :VOL;
select tests.ok((select estado = 'inativo' from public.voluntarios where id = :VOL), 'admin desativa e reativa voluntários');
update public.voluntarios set estado = 'ativo' where id = :VOL;

-- ================= APAGAR ATIVIDADES =================
insert into public.visitas (atividade_id, data, inicio, fim) values (:'nova', private.hoje() + 3, '09:00', '10:00') returning id as vnova \gset
select tests.falha(format('delete from public.atividades where id = %L', :'nova'), 'violates foreign key', 'atividade COM visitas não se apaga (protege o histórico)');
delete from public.visitas where id = :'vnova';
select tests.entrar(:VOL);
select tests.ok(tests.linhas(format('delete from public.atividades where id = %L', :'nova')) = 0, 'voluntário NÃO apaga atividades');
select tests.entrar(:ADM, 'aal2');
delete from public.atividades where id = :'nova';
select tests.ok(not exists (select 1 from public.atividades where id = :'nova'), 'atividade SEM visitas apaga-se');
select tests.ok(not exists (select 1 from public.atividade_horarios where atividade_id = :'nova'), 'e vão os seus horários');
select tests.ok(not exists (select 1 from public.atividade_contactos where atividade_id = :'nova'), 'e o contacto do responsável');
select tests.ok(not exists (select 1 from public.atividade_fechos where atividade_id = :'nova'), 'e os feriados próprios dela');
select tests.ok(exists (select 1 from public.atividade_fechos where atividade_id is null and data = '2027-12-24'), 'os fechos "para tudo" mantêm-se');
reset role;

select 'CONTEÚDO DO ADMIN: TUDO OK';
