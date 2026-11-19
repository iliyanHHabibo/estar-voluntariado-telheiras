"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NAV } from "@/lib/site";

/**
 * Menu principal. As ligações de conta (Entrar / A minha conta / Sair) vêm do servidor
 * (contaDesktop / contaMovel), porque dependem da sessão.
 */
export function MainNav({ contaDesktop, contaMovel }: { contaDesktop: ReactNode; contaMovel: ReactNode }) {
  const pathname = usePathname();
  // O menu do telemóvel fica "aberto nesta página": ao mudar de página fecha sozinho
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const setAberto = (v: boolean | ((atual: boolean) => boolean)) =>
    setAbertoEm(((typeof v === "function" ? v(aberto) : v) ? pathname : null));

  return (
    <>
      {/* Computador (a partir de 1024px; mais compacto até 1280px) */}
      <div className="hidden items-center gap-2 lg:flex">
        <nav aria-label="Principal" className="flex items-center">
          {NAV.map((item) => {
            const ativo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium transition-colors hover:bg-cinza ${
                  ativo ? "bg-cinza" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {contaDesktop}
      </div>

      {/* Telemóvel / tablet (menos de 1024px) */}
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

      <div
        id="menu-movel"
        hidden={!aberto}
        className="absolute inset-x-0 top-full border-b border-black/10 bg-white px-5 pb-6 pt-2 shadow-lg lg:hidden"
      >
        <nav aria-label="Principal">
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
          </ul>
        </nav>
        {contaMovel}
      </div>
    </>
  );
}
