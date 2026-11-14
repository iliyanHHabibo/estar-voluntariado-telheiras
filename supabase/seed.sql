-- =============================================================================
-- ESTAR — dados iniciais (atividades e horários)
-- Aplicar DEPOIS da migração, no SQL Editor do Supabase.
-- =============================================================================

begin;

insert into public.activities (slug, nome, resumo, descricao, regras, min_voluntarios, max_voluntarios, ordem)
values
  ('clinica-sao-jose',
   'Clínica de S. José — Unidade 4',
   'Visitas para fazer companhia e conversar com quem está internado.',
   'Visitamos a Unidade 4 da Clínica de S. José. Não é preciso fazer nada de especial: o que importa é estar, ouvir e conversar.',
   array['Seguir as indicações de higiene e segurança do local.',
         'Não ir se estiveres doente. Avisa-nos, que alocamos outra pessoa.'],
   2, 5, 1),
  ('centro-de-dia',
   'Centro de Dia',
   'Tardes e manhãs de convívio com pessoas idosas.',
   'Passamos tempo com as pessoas que frequentam o Centro de Dia: conversa, jogos, passeios curtos ou apenas companhia.',
   array['Só há visitas em dias úteis.',
         'Não partilhar informação pessoal dos utentes fora do centro.'],
   2, 5, 2)
on conflict (slug) do nothing;

-- Clínica: todos os dias, 10h–18h
insert into public.activity_hours (activity_id, dia_semana, abre, fecha)
select a.id, d, time '10:00', time '18:00'
from public.activities a, generate_series(1, 7) d
where a.slug = 'clinica-sao-jose'
on conflict do nothing;

-- Centro de Dia: dias úteis, 10h–17h
insert into public.activity_hours (activity_id, dia_semana, abre, fecha)
select a.id, d, time '10:00', time '17:00'
from public.activities a, generate_series(1, 5) d
where a.slug = 'centro-de-dia'
on conflict do nothing;

insert into public.activity_contacts (activity_id)
select id from public.activities
on conflict do nothing;

-- Feriados nacionais que caem até ao fim de 2027 (fecham o Centro de Dia; a clínica mantém-se)
insert into public.activity_closures (activity_id, data, motivo)
select a.id, f.data, f.motivo
from public.activities a,
     (values (date '2026-12-01', 'Restauração da Independência'),
             (date '2026-12-08', 'Imaculada Conceição'),
             (date '2026-12-25', 'Natal'),
             (date '2027-01-01', 'Ano Novo'),
             (date '2027-03-26', 'Sexta-feira Santa'),
             (date '2027-04-25', 'Dia da Liberdade'),
             (date '2027-05-01', 'Dia do Trabalhador'),
             (date '2027-05-27', 'Corpo de Deus'),
             (date '2027-06-10', 'Dia de Portugal'),
             (date '2027-06-13', 'Santo António (Lisboa)'),
             (date '2027-08-15', 'Assunção de Nossa Senhora'),
             (date '2027-10-05', 'Implantação da República'),
             (date '2027-11-01', 'Todos os Santos'),
             (date '2027-12-01', 'Restauração da Independência'),
             (date '2027-12-08', 'Imaculada Conceição'),
             (date '2027-12-25', 'Natal')) as f(data, motivo)
where a.slug = 'centro-de-dia'
on conflict do nothing;

commit;
