import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";
import { TESTEMUNHOS } from "@/lib/testemunhos";

export const metadata: Metadata = {
  title: "Testemunhos",
  description: "Histórias de quem já esteve: testemunhos de voluntários do ESTAR.",
};

export default function Testemunhos() {
  return (
    <>
      <PageHeader titulo="Testemunhos" subtitulo="Histórias de quem já esteve." />
      <Section>
        <Container>
          {TESTEMUNHOS.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-3xl bg-cinza p-8 text-center sm:p-12">
              <p className="titulo text-xl">Ainda não há testemunhos</p>
              <p className="mt-4 text-lg text-tinta-suave">
                Os testemunhos dos voluntários vão aparecer aqui. Já foste a alguma visita? Conta-nos como foi.
              </p>
              <div className="mt-8">
                <ButtonLink href={`mailto:${SITE.email}?subject=Testemunho%20ESTAR`} variante="escuro">
                  Enviar o meu testemunho
                </ButtonLink>
              </div>
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {TESTEMUNHOS.map((t) => (
                <li key={t.id}>
                  <figure className="h-full rounded-3xl bg-cinza p-7 sm:p-9">
                    <blockquote className="text-lg">“{t.texto}”</blockquote>
                    <figcaption className="mt-5 text-sm font-semibold text-tinta-suave">
                      {t.autor} · {t.atividade}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
