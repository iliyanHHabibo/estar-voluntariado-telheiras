"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV, ROTA_INSCRICAO } from "@/lib/site";

export function MainNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
        {NAV.map((item) => {
          const ativo = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors hover:bg-cinza ${
                ativo ? "bg-cinza" : ""
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <Link href="/conta" className="ml-2 rounded-full px-4 py-2 text-[0.95rem] font-medium hover:bg-cinza">
          Entrar
        </Link>
        <Link
          href={ROTA_INSCRICAO}
          className="ml-1 inline-flex min-h-11 items-center rounded-full bg-verde-vivo px-6 text-[0.95rem] font-semibold text-tinta transition-colors hover:bg-verde-vivo-hover"
        >
          Quero ser voluntário
        </Link>
      </nav>

      {/* Telemóvel */}
      <button
        type="button"
        className="inline-flex size-12 items-center justify-center rounded-full hover:bg-cinza lg:hidden"
        aria-expanded={aberto}
        aria-controls="menu-movel"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
      </button>

      {aberto && (
        <nav
          id="menu-movel"
          aria-label="Principal"
          className="absolute inset-x-0 top-full border-b border-black/10 bg-white px-5 pb-6 pt-2 shadow-lg lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setAberto(false)}
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                  className="block border-b border-black/5 py-4 text-lg font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/conta" onClick={() => setAberto(false)} className="block border-b border-black/5 py-4 text-lg font-medium">
                Entrar / A minha conta
              </Link>
            </li>
          </ul>
          <Link
            href={ROTA_INSCRICAO}
            onClick={() => setAberto(false)}
            className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-verde-vivo px-6 text-base font-semibold text-tinta"
          >
            Quero ser voluntário
          </Link>
        </nav>
      )}
    </>
  );
}
