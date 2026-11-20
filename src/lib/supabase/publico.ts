import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Cliente Supabase SEM sessão, para ler o que é público (atividades, horários, testemunhos aprovados).
 * Não usa cookies, por isso pode ser usado dentro de funções com cache ("use cache").
 * Só vê o que as regras RLS deixam o público ver.
 */
export function clientePublico() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
