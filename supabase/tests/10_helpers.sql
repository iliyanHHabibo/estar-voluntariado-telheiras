-- Funções de apoio aos testes (só local)
create schema tests;
grant usage on schema tests to anon, authenticated;

-- Simular sessão: utilizador + nível de autenticação (aal1 = só email; aal2 = com 2FA)
create function tests.entrar(p_user uuid, p_aal text default 'aal1') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, false)
$$;

create function tests.sair() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;

create function tests.ok(cond boolean, descricao text) returns text
language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FALHOU: %', descricao;
  end if;
  return 'ok  ' || descricao;
end $$;

-- Espera que um comando falhe com uma mensagem que contenha `esperado`
create function tests.falha(comando text, esperado text, descricao text) returns text
language plpgsql as $$
begin
  begin
    execute comando;
  exception when others then
    if position(esperado in sqlerrm) > 0 then
      return 'ok  ' || descricao || '  [' || sqlerrm || ']';
    end if;
    raise exception 'FALHOU: % — erro inesperado: %', descricao, sqlerrm;
  end;
  raise exception 'FALHOU: % — devia ter dado erro', descricao;
end $$;

-- Executa e devolve nº de linhas afetadas
create function tests.linhas(comando text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute comando;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema tests to anon, authenticated;
