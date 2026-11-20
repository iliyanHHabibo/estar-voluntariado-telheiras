-- =============================================================================
-- Atividades editáveis pelos admins: campo "o que esperar" + limites nas listas
-- =============================================================================
-- Aplicar no SQL Editor do Supabase DEPOIS da migração inicial (e antes ou depois do seed).
-- É seguro correr uma só vez. Não apaga nada.
-- =============================================================================

begin;

alter table public.atividades
  add column o_que_esperar text[] not null default '{}';

-- Para ninguém (por engano ou com más intenções) guardar listas gigantes
alter table public.atividades
  add constraint atividades_listas_tamanho
  check (cardinality(regras) <= 20 and cardinality(o_que_esperar) <= 20);

-- As atividades iniciais passam a ter o mesmo texto que o site mostrava até agora.
-- (Só mexe em quem ainda não tem "o que esperar", ou seja, ainda não foi editada.)
update public.atividades
set resumo = 'Visitas para fazer companhia e conversar com quem está internado.',
    descricao = 'Visitamos a Unidade 4 da Clínica de S. José. Não é preciso fazer nada de especial: o que importa é estar, ouvir e conversar. Pode ser uma conversa, um jogo de cartas ou simplesmente companhia.',
    o_que_esperar = array[
      'Visitas de 1 hora (pode ficar mais tempo, se for combinado).',
      'Normalmente vais com mais 1 a 4 voluntários.',
      'Os responsáveis do local explicam-te tudo à chegada.'],
    regras = array[
      'Seguir as indicações de higiene e segurança do local.',
      'Não ir se estiveres doente (constipação, febre, gripe…). Avisa-nos que alocamos outra pessoa.']
where slug = 'clinica-sao-jose' and cardinality(o_que_esperar) = 0;

update public.atividades
set resumo = 'Tardes e manhãs de convívio com pessoas idosas.',
    descricao = 'Passamos tempo com as pessoas que frequentam o Centro de Dia: conversa, jogos, passeios curtos ou apenas companhia. É um bom primeiro passo para quem nunca fez voluntariado.',
    o_que_esperar = array[
      'Visitas de 1 hora (pode ficar mais tempo, se for combinado).',
      'Normalmente vais com mais 1 a 4 voluntários.',
      'Ambiente descontraído, com muita conversa.'],
    regras = array[
      'Só há visitas em dias úteis (não há fins de semana nem feriados).',
      'Não partilhar informação pessoal dos utentes fora do centro.']
where slug = 'centro-de-dia' and cardinality(o_que_esperar) = 0;

commit;
