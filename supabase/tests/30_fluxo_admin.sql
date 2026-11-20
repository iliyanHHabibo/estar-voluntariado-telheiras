-- =============================================================================
-- Fluxo completo do admin: criar visita → alocar → comunicar → voluntário responde →
-- cancelar/apagar. Verifica o que cada pessoa vê em cada passo. Correr com: supabase/tests/correr.sh
-- =============================================================================
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\set ADM '\'00000000-0000-0000-0000-0000000000f0\''
\set V1  '\'00000000-0000-0000-0000-0000000000f1\''
\set V2  '\'00000000-0000-0000-0000-0000000000f2\''
\set V3  '\'00000000-0000-0000-0000-0000000000f3\''

-- ---------- Preparação (superutilizador) ----------
insert into auth.users (id, email) values
  (:ADM, 'admin.fluxo@exemplo.pt'), (:V1, 'v1@exemplo.pt'), (:V2, 'v2@exemplo.pt'), (:V3, 'v3@exemplo.pt');
insert into public.admins (utilizador_id) values (:ADM);
update private.definicoes set exigir_2fa_admins = true;

select (private.hoje() + 7) as dia \gset
select date_trunc('month', :'dia'::date)::date as mes \gset
select id as clinica from public.atividades where slug = 'clinica-sao-jose' \gset
insert into public.periodos_disponibilidade (mes, abre_em, fecha_em)
values (:'mes', private.hoje() - 1, private.hoje() + 1)
on conflict (mes) do update set abre_em = private.hoje() - 1, fecha_em = private.hoje() + 1;

-- Três voluntários; V1 e V3 estão livres das 13h às 17h; V2 só de manhã
set role authenticated;
select tests.entrar(:V1);
insert into public.voluntarios (id, nome, telefone, data_nascimento) values (auth.uid(), 'Vera Um', '911111111', '1995-01-01');
insert into public.disponibilidades (data, inicio, fim, atividade_id) values (:'dia', '13:00', '17:00', :'clinica');
select tests.entrar(:V2);
insert into public.voluntarios (id, nome, telefone, data_nascimento) values (auth.uid(), 'Vitor Dois', '922222222', '1996-02-02');
insert into public.disponibilidades (data, inicio, fim, atividade_id) values (:'dia', '10:00', '12:00', :'clinica');
select tests.entrar(:V3);
insert into public.voluntarios (id, nome, telefone, data_nascimento) values (auth.uid(), 'Vasco Três', '933333333', '1997-03-03');
insert into public.disponibilidades (data, inicio, fim, atividade_id) values (:'dia', '13:00', '17:00', null);
-- Só um admin (com 2FA) pode mudar o estado de um voluntário: é o que o painel fará
select tests.entrar(:ADM, 'aal2');
update public.voluntarios set estado = 'inativo' where id = :V3;
select tests.ok((select estado = 'inativo' from public.voluntarios where id = :V3), 'o admin desativa o V3');
reset role;

-- ================= ADMIN COM 2FA cria a visita =================
set role authenticated;
select tests.entrar(:ADM, 'aal2');
insert into public.visitas (atividade_id, data, inicio, fim, notas) values (:'clinica', :'dia', '14:00', '15:00', 'fluxo') returning id as visita \gset
select tests.ok((select estado = 'rascunho' from public.visitas where id = :'visita'), 'a visita nasce em rascunho');
select tests.ok((select criado_por = :ADM from public.visitas where id = :'visita'), 'regista quem a criou');

-- quem está disponível?
select tests.ok((select count(*) from public.disponiveis_para_visita(:'visita')) = 1, 'só 1 voluntário cobre as 14h–15h e está ativo (V2 é só de manhã; V3 está inativo)');
select tests.ok((select nome = 'Vera Um' and telefone = '911111111' and email = 'v1@exemplo.pt' and not menor from public.disponiveis_para_visita(:'visita')), 'e vê o contacto completo dessa pessoa');

-- alocar
insert into public.alocacoes (visita_id, voluntario_id) values (:'visita', :V1) returning id as aloc1 \gset
select tests.ok((select estado = 'proposta' from public.alocacoes where id = :'aloc1'), 'a alocação nasce como proposta');
select tests.falha(format('insert into public.alocacoes (visita_id, voluntario_id) values (%L, %L)', :'visita', :V1), 'duplicate key', 'não se aloca a mesma pessoa duas vezes');
select tests.ok((select ja_alocado from public.disponiveis_para_visita(:'visita') where voluntario_id = :V1), 'a lista marca quem já está alocado');
select tests.ok((select count(*) from public.alocacoes a join public.voluntarios v on v.id = a.voluntario_id where a.visita_id = :'visita' and v.telefone is not null) = 1, 'o admin vê nome e contactos de quem está alocado');

-- ================= O voluntário NÃO vê enquanto é rascunho =================
select tests.entrar(:V1);
select tests.ok((select count(*) from public.visitas) = 0, 'rascunho: V1 não vê a visita');
select tests.ok((select count(*) from public.alocacoes) = 0, 'rascunho: V1 não vê a alocação');

select tests.entrar(:ADM, 'aal2');
update public.visitas set estado = 'confirmada_responsavel' where id = :'visita';
select tests.entrar(:V1);
select tests.ok((select count(*) from public.visitas) = 0, 'confirmada pelo responsável (ainda não comunicada): V1 continua sem ver');

-- ================= Comunicada: V1 vê e responde =================
select tests.entrar(:ADM, 'aal2');
update public.visitas set estado = 'comunicada' where id = :'visita';
select tests.entrar(:V1);
select tests.ok((select count(*) from public.visitas) = 1, 'comunicada: V1 vê a visita');
select tests.ok((select count(*) from public.alocacoes) = 1, 'comunicada: V1 vê a sua alocação');
select tests.ok((select count(*) from public.voluntarios) = 1, 'V1 continua a ver só o seu perfil (não vê o de V2)');
select public.responder_alocacao(:'aloc1', 'confirmada');
select tests.ok((select estado = 'confirmada' from public.alocacoes where id = :'aloc1'), 'V1 confirma');

-- ================= Alocar alguém sem disponibilidade (V2) e voltar a propor =================
select tests.entrar(:ADM, 'aal2');
insert into public.alocacoes (visita_id, voluntario_id) values (:'visita', :V2) returning id as aloc2 \gset
select tests.entrar(:V2);
select tests.ok((select count(*) from public.visitas) = 1, 'V2, alocado depois de comunicada, vê logo a visita');
select public.responder_alocacao(:'aloc2', 'recusada', 'Tenho um exame');
select tests.entrar(:ADM, 'aal2');
select tests.ok((select estado = 'recusada' and motivo = 'Tenho um exame' from public.alocacoes where id = :'aloc2'), 'o admin vê que V2 recusou, com o motivo');
update public.alocacoes set estado = 'proposta', motivo = null, respondido_em = null where id = :'aloc2';
select tests.entrar(:V2);
select public.responder_alocacao(:'aloc2', 'confirmada');
select tests.ok((select estado = 'confirmada' from public.alocacoes where id = :'aloc2'), 'depois de voltar a propor, V2 já pode confirmar');

-- Só o admin escreve presenças
select tests.entrar(:V1);
select tests.ok(tests.linhas(format('update public.alocacoes set presenca = %L where id = %L', 'presente', :'aloc1')) = 0, 'V1 NÃO regista a própria presença');
select tests.entrar(:ADM, 'aal2');
update public.alocacoes set presenca = 'presente' where id = :'aloc1';
select tests.ok((select presenca = 'presente' from public.alocacoes where id = :'aloc1'), 'o admin regista a presença');

-- ================= Admin SEM 2FA não consegue mexer em nada =================
select tests.entrar(:ADM, 'aal1');
select tests.falha(format('insert into public.alocacoes (visita_id, voluntario_id) values (%L, %L)', :'visita', :V3), 'row-level security', 'admin sem 2FA NÃO aloca');
select tests.ok(tests.linhas(format('update public.visitas set estado = %L where id = %L', 'cancelada', :'visita')) = 0, 'admin sem 2FA NÃO muda o estado da visita');
select tests.ok((select count(*) from public.alocacoes) = 0, 'admin sem 2FA NÃO vê as alocações');

-- ================= Remover uma pessoa =================
select tests.entrar(:ADM, 'aal2');
delete from public.alocacoes where id = :'aloc2';
select tests.entrar(:V2);
select tests.ok((select count(*) from public.visitas) = 0, 'depois de removido, V2 deixa de ver a visita');

-- ================= Cancelar: V1 continua a ver (como cancelada) mas já não responde =================
select tests.entrar(:ADM, 'aal2');
update public.visitas set estado = 'cancelada' where id = :'visita';
select tests.entrar(:V1);
select tests.ok((select estado = 'cancelada' from public.visitas), 'cancelada: V1 vê que foi cancelada');
select tests.falha(format('select public.responder_alocacao(%L, %L)', :'aloc1', 'cancelada'), 'ja_nao_e_possivel', 'e já não pode responder');

-- ================= Reativar e apagar: as alocações vão atrás, as disponibilidades ficam =================
select tests.entrar(:ADM, 'aal2');
update public.visitas set estado = 'rascunho' where id = :'visita';
delete from public.visitas where id = :'visita';
select tests.ok((select count(*) from public.alocacoes where visita_id = :'visita') = 0, 'ao apagar a visita, as alocações desaparecem');
select tests.entrar(:V1);
select tests.ok((select count(*) from public.disponibilidades) = 1, 'as disponibilidades do voluntário NÃO se apagam');

-- ================= Períodos: o admin gere; apagar o período não apaga disponibilidades =================
select tests.entrar(:ADM, 'aal2');
update public.periodos_disponibilidade set fecha_em = private.hoje() - 1 where mes = :'mes';
select tests.entrar(:V1);
select tests.falha(format('insert into public.disponibilidades (data, inicio, fim, atividade_id) values (%L, %L, %L, %L)', :'dia', '16:00', '17:00', :'clinica'), 'row-level security', 'período fechado pelo admin: V1 já não adiciona');
select tests.entrar(:ADM, 'aal2');
delete from public.periodos_disponibilidade where mes = :'mes';
select tests.ok((select count(*) from public.disponibilidades where voluntario_id = :V1) = 1, 'apagar o período não apaga as disponibilidades já indicadas');
reset role;

select 'FLUXO DO ADMIN: TUDO OK';
