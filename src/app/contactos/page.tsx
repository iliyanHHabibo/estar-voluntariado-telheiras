import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Fala com a equipa do ESTAR.",
};

export default function Contactos() {
  return (
    <>
      <PageHeader titulo="Contactos" subtitulo="Dúvidas, sugestões ou testemunhos? Escreve-nos." />
      <Section>
        <Container narrow>
          <a
            href={`mailto:${SITE.email}`}
            className="flex items-center gap-4 rounded-3xl bg-cinza p-7 text-lg font-semibold transition-colors hover:bg-cinza-claro sm:p-9"
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-verde-vivo text-tinta">
              <Mail aria-hidden className="size-6" />
            </span>
            <span className="break-all">{SITE.email}</span>
          </a>
          <p className="mt-8 text-lg text-tinta-suave">
            Respondemos assim que pudermos. Se já és voluntário e não podes ir a uma visita, avisa-nos o mais
            cedo possível.
          </p>
          <p className="mt-4 text-tinta-suave">
            O ESTAR é um projeto do {SITE.organizacao}.
          </p>
        </Container>
      </Section>
    </>
  );
}
