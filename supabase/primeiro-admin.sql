-- =============================================================================
-- Nomear o PRIMEIRO admin (só se faz uma vez, no SQL Editor do Supabase)
-- =============================================================================
-- 1. Entra no site com o teu email (página /entrar), para a tua conta existir.
-- 2. Substitui o email abaixo pelo teu e corre este script.
-- 3. Volta ao site, vai a /admin e configura o 2FA.
-- Os restantes admins são adicionados a partir do próprio site (Admin → Admins).
-- =============================================================================

insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('O-TEU-EMAIL@exemplo.com')
on conflict do nothing
returning user_id;
