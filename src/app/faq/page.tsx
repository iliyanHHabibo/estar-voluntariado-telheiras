import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description: "Respostas às dúvidas mais comuns sobre o voluntariado no ESTAR.",
};

const FAQ = [
  {
    p: "Preciso de experiência?",
    r: "Não. Basta vontade de ouvir e de passar tempo com os outros. Os responsáveis de cada local explicam-te o que precisas de saber.",
  },
  {
    p: "Qual é a idade mínima?",
    r: `${SITE.idadeMinima} anos. Se ainda não fizeste 18, precisamos do contacto e da autorização do teu encarregado de educação na inscrição.`,
  },
  {
    p: "Quanto tempo dura uma visita?",
    r: "Pelo menos 1 hora. Podes indicar que estás disponível durante mais tempo, e a equipa organiza as visitas em conformidade.",
  },
  {
    p: "Quantas vezes por mês tenho de ir?",
    r: "Tantas quantas puderes. Não há mínimo obrigatório. Cada mês indicas as tuas disponibilidades, e podes dizer que este mês só queres, por exemplo, uma visita.",
  },
  {
    p: "Como sei onde e quando devo ir?",
    r: "Recebes um email de confirmação com a atividade, o dia, a hora e um contacto. Também podes consultar as tuas visitas no site.",
  },
  {
    p: "E se não puder ir a uma visita?",
    r: "Avisa-nos o mais cedo possível. Alocamos outra pessoa. O importante é não faltar sem avisar.",
  },
  {
    p: "Posso tirar fotografias?",
    r: "Não. Para proteger a privacidade das pessoas que visitamos, não é permitido tirar fotografias nem fazer gravações durante as visitas, e não publicamos fotografias das atividades.",
  },
  {
    p: "Quem vê os meus dados?",
    r: "Os administradores do ESTAR e, para organizar cada visita, os responsáveis da atividade (o teu nome e contacto). Não vendemos nem partilhamos os teus dados com mais ninguém. Podes saber mais na Política de Privacidade.",
  },
  {
    p: "Tenho de ser da paróquia?",
    r: "Não. O ESTAR está aberto a quem quiser participar.",
  },
];

export default function Faq() {
  return (
    <>
      <PageHeader titulo="Perguntas frequentes" />
      <Section>
        <Container narrow>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {FAQ.map((item) => (
              <details key={item.p} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {item.p}
                  <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-lg text-tinta-suave">{item.r}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-lg">
            Não encontraste a resposta? Escreve-nos para{" "}
            <a href={`mailto:${SITE.email}`} className="font-semibold text-verde underline underline-offset-4">
              {SITE.email}
            </a>
            .
          </p>
          <div className="mt-8">
            <ButtonLink href="/como-funciona" variante="escuro">
              Ver como funciona
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
