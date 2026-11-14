import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_OPTIONS, supabaseConfig } from "@/lib/supabase/config";

/**
 * Corre antes das páginas privadas:
 *  1. renova a sessão do Supabase (cookies) quando está a expirar;
 *  2. quem não tem sessão e tenta abrir /conta ou /admin vai para /entrar.
 *
 * Isto é só a primeira barreira. Cada página volta a verificar a sessão
 * (src/lib/auth.ts) e a base de dados aplica as políticas RLS.
 */
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims valida o token (assinatura e validade). Não usar getSession() aqui.
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const privado = pathname.startsWith("/conta") || pathname.startsWith("/admin");

  if (privado && !autenticado) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    destino.searchParams.set("seguinte", pathname + search);
    return NextResponse.redirect(destino);
  }

  // Páginas privadas nunca ficam em cache (nem no browser, nem em CDNs)
  if (privado) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: ["/conta/:path*", "/admin/:path*", "/entrar/:path*", "/auth/:path*"],
};
