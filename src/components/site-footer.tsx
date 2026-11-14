import Link from "next/link";
import { Container } from "./ui";
import { NAV, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-tinta text-white">
      <Container className="grid gap-12 py-14 sm:grid-cols-3">
        <div>
          <p className="titulo text-2xl">ESTAR</p>
          <p className="mt-3 max-w-xs text-white/75">
            Voluntariado do {SITE.organizacao}.
          </p>
          <p className="mt-3 text-white/75">{SITE.slogan}</p>
        </div>

        <nav aria-label="Rodapé">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Páginas</p>
          <ul className="mt-4 space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/90 hover:text-verde-vivo">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contactos" className="text-white/90 hover:text-verde-vivo">
                Contactos
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Contacto</p>
          <p className="mt-4">
            <a href={`mailto:${SITE.email}`} className="break-all text-white/90 underline underline-offset-4 hover:text-verde-vivo">
              {SITE.email}
            </a>
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/privacidade" className="hover:text-verde-vivo">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className="hover:text-verde-vivo">
                Termos de utilização
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-5 text-sm text-white/60">
          © ESTAR · {SITE.organizacao}
        </Container>
      </div>
    </footer>
  );
}
