import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { ROTA_INSCRICAO, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Do registo à primeira visita: como funciona o voluntariado no ESTAR.",
};

const { de, ate } = SITE.janelaDisponibilidades;

const PASSOS = [
  {
    titulo: "1. Inscreves-te",
    texto: `Preenches os teus dados (nome, contactos e data de nascimento) e escolhes as atividades que te interessam. É preciso ter ${SITE.idadeMinima} anos ou mais; se ainda és menor de idade, precisamos também do contacto e da autorização do teu encarregado de educação.`,
  },
  {
    titulo: `2. Indicas as tuas disponibilidades (dias ${de} a ${ate})`,
    texto: "Uma vez por mês, escolhes no calendário os dias e as horas em que podes ir no mês seguinte, e para que atividade. Podes repetir um horário todas as semanas com um clique. Cada visita dura pelo menos 1 hora.",
  },
  {
    titulo: "3. Nós tratamos do resto",
    texto: "A equipa fala com os responsáveis de cada atividade, confirma as visitas e distribui os voluntários. Não tens de falar com ninguém do local.",
  },
  {
    titulo: "4. Recebes a confirmação",
    texto: "Antes do início do mês recebes um email com as visitas em que estás incluído — atividade, dia, hora e contacto. Confirmas com um clique. Se não puderes ir a alguma, é só dizeres.",
  },
  {
    titulo: "5. Vais ESTAR",
    texto: "Apareces, ficas à conversa, ouves, jogas às cartas… O importante é estares presente. Depois, se quiseres, conta-nos como foi.",
  },
];

export default function ComoFunciona() {
  return (
    <>
      <PageHeader titulo="Como funciona" subtitulo="Simples, e sem estares dependente de grupos de mensagens." />
      <Section>
        <Container narrow>
          <ol className="space-y-10">
            {PASSOS.map((p) => (
              <li key={p.titulo} className="border-l-4 border-verde-vivo pl-6">
                <h2 className="titulo text-lg sm:text-xl">{p.titulo}</h2>
                <p className="mt-3 text-lg text-tinta-suave">{p.texto}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 rounded-3xl bg-cinza p-7 sm:p-9">
            <h2 className="titulo text-xl">E se eu não puder ir?</h2>
            <p className="mt-3 text-lg">
              Acontece a todos. Avisa-nos o mais cedo possível, no teu perfil ou respondendo ao email, e
              alocamos outra pessoa. O que não queremos é que alguém fique à espera de uma visita que não vai
              acontecer.
            </p>
          </div>

          <div className="mt-12">
            <ButtonLink href={ROTA_INSCRICAO}>Quero ser voluntário</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
