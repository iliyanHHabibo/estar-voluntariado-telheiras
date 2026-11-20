/**
 * Para onde pode ir um admin a partir de onde está (cabeçalho do site).
 *
 *  - Na área de admin  → o atalho principal leva à conta de voluntário (ou à inscrição, se ainda não tem).
 *  - Fora dela         → o atalho principal leva ao admin; e a conta de voluntário fica como segundo atalho
 *                        (a não ser que já estejamos nela).
 */

export type AtalhoArea = { href: string; rotulo: string; tipo: "admin" | "conta" | "inscricao" };

const emAdmin = (p: string) => /^\/admin(\/|$)/.test(p);
const emConta = (p: string) => /^\/conta(\/|$)/.test(p);

export function atalhosDeArea(pathname: string, voluntario: boolean): { principal: AtalhoArea; secundario: AtalhoArea | null } {
  const admin: AtalhoArea = { href: "/admin", rotulo: "Admin", tipo: "admin" };
  const conta: AtalhoArea = { href: "/conta", rotulo: "A minha conta", tipo: "conta" };
  const inscricao: AtalhoArea = { href: "/conta/inscricao", rotulo: "Ser voluntário", tipo: "inscricao" };

  if (emAdmin(pathname)) return { principal: voluntario ? conta : inscricao, secundario: null };
  return { principal: admin, secundario: voluntario && !emConta(pathname) ? conta : null };
}
