import Link from "next/link";
import { Suspense } from "react";
import { MainNav } from "./main-nav";
import { ContaLinks, ContaLinksEspera } from "./conta-links";
import { Container } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <Container className="relative flex h-18 items-center justify-between gap-6">
        <Link href="/" className="shrink-0 leading-none" aria-label="ESTAR — página inicial">
          <span className="titulo block text-2xl font-semibold tracking-wide">ESTAR</span>
          <span className="mt-1 hidden text-[0.7rem] font-medium uppercase tracking-[0.14em] text-tinta-suave sm:block">
            Jovens da Paróquia de Telheiras
          </span>
        </Link>
        <MainNav
          contaDesktop={
            <Suspense fallback={<ContaLinksEspera variante="desktop" />}>
              <ContaLinks variante="desktop" />
            </Suspense>
          }
          contaMovel={
            <Suspense fallback={<ContaLinksEspera variante="movel" />}>
              <ContaLinks variante="movel" />
            </Suspense>
          }
        />
      </Container>
    </header>
  );
}
