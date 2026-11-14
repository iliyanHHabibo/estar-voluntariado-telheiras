import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth";
import { sair } from "../entrar/actions";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s · Admin ESTAR" },
  robots: { index: false, follow: false },
};

const NAV_ADMIN = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/admins", label: "Admins" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-cinza-claro">
      <div className="border-b border-black/10 bg-verde text-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <nav aria-label="Administração" className="flex flex-wrap gap-1">
            <span className="titulo mr-3 self-center text-sm">Admin</span>
            {NAV_ADMIN.map((i) => (
              <Link key={i.href} href={i.href} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10">
                {i.label}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10">
              Sair
            </button>
          </form>
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
  return <>{children}</>;
}
