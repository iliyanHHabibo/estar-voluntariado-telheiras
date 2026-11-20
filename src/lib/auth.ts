import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada central de autenticação ("Data Access Layer").
 * Todas as páginas e ações privadas passam por aqui.
 *
 * Lembrete: estas verificações servem para dar boa experiência (redirecionar,
 * mostrar a página certa). A proteção real dos dados é feita pelas políticas
 * RLS na base de dados — mesmo que alguém contorne o site, não lê nada.
 */

export type Utilizador = {
  id: string;
  email: string;
  /** aal1 = entrou só com email; aal2 = passou também o 2FA */
  aal: "aal1" | "aal2";
};

export async function obterUtilizador(): Promise<Utilizador | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return null;
  return {
    id: c.sub,
    email: typeof c.email === "string" ? c.email : "",
    aal: c.aal === "aal2" ? "aal2" : "aal1",
  };
}

export async function exigirUtilizador(seguinte = "/conta"): Promise<Utilizador> {
  const u = await obterUtilizador();
  if (!u) redirect(`/entrar?seguinte=${encodeURIComponent(seguinte)}`);
  return u;
}

export type PerfilVoluntario = { id: string; nome: string; estado: "ativo" | "inativo" };

/** Sessão iniciada E inscrição feita. Quem ainda não se inscreveu vai para a inscrição. */
export async function exigirVoluntario(seguinte: string): Promise<{ u: Utilizador; perfil: PerfilVoluntario }> {
  const u = await exigirUtilizador(seguinte);
  const supabase = await createClient();
  const { data } = await supabase.from("voluntarios").select("id, nome, estado").eq("id", u.id).maybeSingle();
  if (!data) redirect("/conta/inscricao");
  return { u, perfil: data as PerfilVoluntario };
}

export async function souAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sou_admin");
  return !error && data === true;
}

/** O 2FA dos admins está ligado? (interruptor na base de dados; ligado por omissão) */
export async function adminExige2fa(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_exige_2fa");
  return error ? true : data !== false; // em caso de dúvida, exige
}

/** Admin (com 2FA verificado nesta sessão, se estiver a ser exigido). Caso contrário redireciona/404. */
export async function exigirAdmin(): Promise<Utilizador> {
  const u = await exigirUtilizador("/admin");
  if (!(await souAdmin())) notFound(); // não revelar que a área existe
  if (u.aal !== "aal2" && (await adminExige2fa())) redirect("/entrar/2fa");
  return u;
}

/**
 * Para as rotas que devolvem ficheiros (exportações): é admin, e com 2FA se for exigido?
 * Não redireciona (um ficheiro não é uma página): quem chamar responde 404.
 */
export async function adminParaApi(): Promise<boolean> {
  const u = await obterUtilizador();
  if (!u) return false;
  if (!(await souAdmin())) return false;
  if (u.aal !== "aal2" && (await adminExige2fa())) return false;
  return true;
}

/** Para onde mandar alguém logo depois de entrar. */
export async function destinoDepoisDeEntrar(seguinte?: string | null): Promise<string> {
  const pedido = caminhoSeguro(seguinte);
  if (await souAdmin()) {
    return pedido?.startsWith("/admin") ? pedido : "/admin";
  }
  const supabase = await createClient();
  const u = await obterUtilizador();
  const { data } = await supabase.from("voluntarios").select("id").eq("id", u?.id ?? "").maybeSingle();
  if (!data) return "/conta/inscricao";
  return pedido?.startsWith("/conta") ? pedido : "/conta";
}

/**
 * Evita "open redirects": só aceita caminhos internos, de áreas conhecidas.
 * Ex.: rejeita "//site-malicioso.com", "https://…", "/\\evil".
 */
export function caminhoSeguro(v?: string | null): string | null {
  if (!v || typeof v !== "string") return null;
  if (!/^\/(conta|admin)(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9=&\-_%]*)?$/.test(v)) return null;
  return v;
}
