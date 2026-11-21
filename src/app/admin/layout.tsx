import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/ui";
import { UserRound } from "lucide-react";
import { adminExige2fa, exigirAdmin, obterUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { testemunhosPendentes, visitasComFalta, visitasPorResponder } from "@/lib/contadores";
import { Contador } from "@/components/contador";
import { sair } from "../entrar/actions";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s · Admin ESTAR" },
  robots: { index: false, follow: false },
};

/**
 * A área de admin confirma sempre quem é a pessoa (e o 2FA) antes de mostrar alguma coisa,
 * por isso não pode ser "instantânea". Isto desliga só a validação de navegação instantânea
 * do modo de desenvolvimento (evita avisos ao simular navegações sem sessão).
 */
export const instant = false;

const NAV_ADMIN: { href: string; label: string; contador?: ReactNode }[] = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/planeamento", label: "Planeamento", contador: <ComFalta /> },
  { href: "/admin/periodos", label: "Períodos" },
  { href: "/admin/voluntarios", label: "Voluntários" },
  { href: "/admin/atividades", label: "Atividades" },
  { href: "/admin/testemunhos", label: "Testemunhos", contador: <TestemunhosPendentes /> },
  { href: "/admin/admins", label: "Admins" },
];

async function ComFalta() {
  return <Contador n={await visitasComFalta()} singular="visita com falta de pessoas" plural="visitas com falta de pessoas" />;
}

async function TestemunhosPendentes() {
  return <Contador n={await testemunhosPendentes()} singular="testemunho por rever" plural="testemunhos por rever" />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-cinza-claro">
      <div className="border-b border-black/10 bg-verde text-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <nav aria-label="Administração" className="flex flex-wrap gap-1">
            <span className="titulo mr-3 self-center text-sm">Admin</span>
            {NAV_ADMIN.map((i) => (
              <Link key={i.href} href={i.href} className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10">
                {i.label}
                {i.contador && <Suspense fallback={null}>{i.contador}</Suspense>}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Suspense fallback={null}>
              <AtalhoVoluntario />
            </Suspense>
            <form action={sair}>
              <button type="submit" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>
        </Container>
      </div>
      <Container className="min-h-[60vh] py-10">
        <Suspense fallback={<p>A carregar…</p>}>
          <Porta>{children}</Porta>
        </Suspense>
      </Container>
    </div>
  );
}

/** Primeira verificação (cada página volta a verificar com exigirAdmin()). */
async function Porta({ children }: { children: ReactNode }) {
  await exigirAdmin();
  const com2fa = await adminExige2fa();
  return (
    <>
      {!com2fa && (
        <p role="status" className="mb-8 rounded-xl border-2 border-aviso/40 bg-amber-50 px-4 py-3 text-aviso">
          <strong>Modo de testes:</strong> o 2FA dos admins está desligado. Liga-o antes de usar dados reais
          (ver CONFIGURAR.md).
        </p>
      )}
      {children}
    </>
  );
}

/** Atalho para a conta de voluntário de quem é admin (ou para se inscrever, se ainda não o fez). */
async function AtalhoVoluntario() {
  const u = await obterUtilizador();
  if (!u) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("voluntarios").select("id").eq("id", u.id).maybeSingle();
  const porResponder = data ? await visitasPorResponder(u.id) : 0;
  return (
    <Link
      href={data ? "/conta" : "/conta/inscricao"}
      className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
    >
      <UserRound aria-hidden className="size-4" />
      {data ? "A minha conta de voluntário" : "Inscrever-me como voluntário"}
      <Contador n={porResponder} singular="visita por responder" plural="visitas por responder" />
    </Link>
  );
}
