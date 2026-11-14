import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_OPTIONS, supabaseConfig } from "./config";

/**
 * Cliente Supabase para o servidor (Server Components, Server Actions, Route Handlers).
 * Age sempre COMO o utilizador com sessão iniciada — as políticas RLS aplicam-se.
 */
export async function createClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component (não pode escrever cookies).
          // Não faz mal: o proxy renova a sessão em cada pedido.
        }
      },
    },
  });
}
