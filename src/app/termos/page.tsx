import type { Metadata } from "next";
import { Container, PageHeader, Section } from "@/components/ui";
import { REGRAS_GERAIS } from "@/lib/atividades";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de utilização",
  description: "Regras de utilização do site e de participação no voluntariado ESTAR.",
};

export default function Termos() {
  return (
    <>
      <PageHeader titulo="Termos de utilização" />
      <Section>
        <Container narrow className="prosa">
          {/* RASCUNHO: rever com a paróquia antes de o site ser público. */}
          <p className="rounded-2xl bg-cinza p-4 text-sm">
            <strong>Rascunho.</strong> Este texto ainda vai ser revisto pela equipa e pela paróquia antes de o
            site abrir ao público.
          </p>

          <h2>O que é este site</h2>
          <p>
            Este site serve para organizar o voluntariado do ESTAR, o projeto do {SITE.organizacao}. Permite
            inscreveres-te, indicares as tuas disponibilidades e consultares as tuas visitas.
          </p>

          <h2>Quem pode ser voluntário</h2>
          <p>
            Pessoas com {SITE.idadeMinima} anos ou mais. Menores de 18 anos precisam da autorização do
            encarregado de educação.
          </p>

          <h2>O que te pedimos</h2>
          <ul>
            {REGRAS_GERAIS.map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>Dar informação verdadeira na inscrição e manter os teus dados atualizados.</li>
          </ul>

          <h2>Testemunhos</h2>
          <p>
            Ao enviares um testemunho, autorizas a sua publicação neste site, depois de revisto pela nossa
            equipa. Podemos fazer pequenas correções ou recusar a publicação, por exemplo se o texto incluir
            dados de pessoas que visitámos. Não incluas nomes nem informação que permita identificar utentes.
          </p>

          <h2>Participação</h2>
          <p>
            O voluntariado é gratuito e voluntário, e podes deixar de participar quando quiseres. A equipa do
            ESTAR pode deixar de alocar voluntários que não cumpram as regras acima.
          </p>

          <h2>Contacto</h2>
          <p>
            Qualquer questão: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </Container>
      </Section>
    </>
  );
}
