"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/conta", label: "Resumo", exato: true },
  { href: "/conta/disponibilidades", label: "Disponibilidades" },
  { href: "/conta/visitas", label: "As minhas visitas", contador: true },
  { href: "/conta/testemunhos", label: "Testemunhos" },
];

/**
 * Separadores da área do voluntário (aparecem no topo de cada página da conta).
 * `contador`: o número de visitas por responder (vem do servidor; ver separadores.tsx).
 */
export function ContaNav({ contador }: { contador?: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="A minha conta" className="-mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {ITENS.map((i) => {
          const ativo = i.exato ? pathname === i.href : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-5 font-semibold transition-colors ${
                  ativo ? "bg-verde text-white" : "bg-cinza-claro hover:bg-cinza"
                }`}
              >
                {i.label}
                {i.contador && contador}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
