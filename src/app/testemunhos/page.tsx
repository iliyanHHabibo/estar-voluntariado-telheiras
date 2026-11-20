import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";
import { getTestemunhos } from "@/lib/publico";

export const metadata: Metadata = {
  title: "Testemunhos",
  description: "Histórias de quem já esteve: testemunhos de voluntários do ESTAR.",
};

export default async function Testemunhos() {
  const testemunhos = await getTestemunhos();
  return (
    <>
      <PageHeader titulo="Testemunhos" subtitulo="Histórias de quem já esteve." />
      <Section>
        <Container>
          {testemunhos.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-3xl bg-cinza p-8 text-center sm:p-12">
              <p className="titulo text-xl">Ainda não há testemunhos</p>
              <p className="mt-4 text-lg text-tinta-suave">
                Os testemunhos dos voluntários vão aparecer aqui. Já foste a alguma visita? Conta-nos como foi.
              </p>
              <div className="mt-8">
                <ButtonLink href="/conta/testemunhos" variante="escuro">
                  Enviar o meu testemunho
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              <ul className="grid gap-6 md:grid-cols-2">
                {testemunhos.map((t) => (
                  <li key={t.id}>
                    <figure className="h-full rounded-3xl bg-cinza p-7 sm:p-9">
                      <blockquote className="whitespace-pre-line text-lg">“{t.texto}”</blockquote>
                      <figcaption className="mt-5 text-sm font-semibold text-tinta-suave">
                        {t.autor}
                        {t.atividade ? ` · ${t.atividade}` : ""}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
              <div className="mt-12 text-center">
                <p className="text-lg">Já estiveste connosco? Conta-nos como foi.</p>
                <div className="mt-4">
                  <ButtonLink href="/conta/testemunhos" variante="escuro">
                    Enviar o meu testemunho
                  </ButtonLink>
                </div>
              </div>
            </>
          )}
          <p className="mt-10 text-center text-sm text-tinta-suave">
            Também podes escrever-nos para {SITE.email}.
          </p>
        </Container>
      </Section>
    </>
  );
}
