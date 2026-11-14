/**
 * Configuração pública do Supabase.
 *
 * Só usamos a chave PÚBLICA ("publishable"/anon). Ela pode estar no browser:
 * o que protege os dados são as políticas RLS da base de dados.
 * A chave secreta (service_role) NÃO é usada em lado nenhum desta aplicação.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example para .env.local e preenche.",
    );
  }
  if (key.startsWith("sb_secret_") || key.includes("service_role")) {
    throw new Error("Estás a usar a chave SECRETA do Supabase. Usa a chave pública (publishable/anon).");
  }
  return { url, key };
}

/**
 * Cookies de sessão inacessíveis a JavaScript (httpOnly): mesmo que um script
 * malicioso corresse na página, não conseguiria roubar a sessão.
 * Funciona porque toda a comunicação com o Supabase é feita no servidor.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
