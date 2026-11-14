import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Quem somos",
  description: "O ESTAR é o projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras.",
};

export default function QuemSomos() {
  return (
    <>
      <PageHeader titulo="Quem somos" subtitulo={`O ESTAR é um projeto do ${SITE.organizacao}.`} />
      <Section>
        <Container narrow className="prosa text-lg">
          <p>
            Somos jovens da Paróquia de Telheiras que acreditam que o tempo e a presença são dos melhores
            presentes que podemos dar. O ESTAR nasceu para aproximar gerações: jovens que têm tempo e
            vontade, e pessoas que muitas vezes passam o dia sem companhia.
          </p>
          <h2>A nossa ideia</h2>
          <p>
            Num mundo que nos ensina constantemente a <em>fazer</em>, queremos voltar a aprender a <strong>estar</strong>.
            Não vamos resolver tudo — vamos ouvir, conversar, jogar uma cartada e ficar. Às vezes, basta isso.
          </p>
          <h2>Quem pode participar</h2>
          <p>
            Qualquer pessoa com {SITE.idadeMinima} anos ou mais, da paróquia ou não. Não é preciso experiência
            nem fazer parte do grupo de jovens. Estamos a iniciar um grupo de voluntários na zona de Telheiras.
          </p>
          <h2>Fala connosco</h2>
          <p>
            Tens dúvidas, sugestões ou queres propor uma nova atividade? Escreve-nos para{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </Container>
        <Container narrow className="mt-10">
          <ButtonLink href="/atividades" variante="escuro">
            Ver atividades
          </ButtonLink>
        </Container>
      </Section>
    </>
  );
}
