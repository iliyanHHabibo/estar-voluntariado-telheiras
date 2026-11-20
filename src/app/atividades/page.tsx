import type { Metadata } from "next";
import { CheckCircle2, Clock, MapPin, ShieldAlert } from "lucide-react";
import { ButtonLink, Container, PageHeader, Section } from "@/components/ui";
import { REGRAS_GERAIS } from "@/lib/atividades";
import { getAtividades } from "@/lib/publico";
import { ROTA_INSCRICAO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Atividades",
  description: "As atividades de voluntariado do ESTAR: Clínica de S. José (Unidade 4) e Centro de Dia.",
};

export default async function Atividades() {
  const atividades = await getAtividades();
  return (
    <>
      <PageHeader
        titulo="Atividades"
        subtitulo="Cada visita dura pelo menos 1 hora. Escolhes o que preferes — ou as duas."
      />

      <Section>
        <Container className="space-y-16">
          {atividades.length === 0 && <p className="text-lg text-tinta-suave">De momento não há atividades abertas. Volta em breve.</p>}
          {atividades.map((a) => (
            <article key={a.slug} id={a.slug} className="scroll-mt-28 grid gap-8 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <h2 className="titulo text-2xl sm:text-3xl">{a.nome}</h2>
                <p className="mt-5 flex items-start gap-2 text-lg font-medium">
                  <Clock aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
                  {a.horario}
                </p>
                <p className="mt-2 flex items-start gap-2 text-tinta-suave">
                  <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
                  {a.morada ?? "A morada e como chegar são enviados na confirmação da visita."}
                </p>
              </div>

              <div className="space-y-8 lg:col-span-3">
                <p className="text-lg">{a.descricao}</p>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-verde">O que esperar</h3>
                  <ul className="mt-3 space-y-2">
                    {a.oQueEsperar.map((t) => (
                      <li key={t} className="flex gap-3">
                        <CheckCircle2 aria-hidden className="mt-1 size-5 shrink-0 text-verde-vivo" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-verde">Para esta atividade</h3>
                  <ul className="mt-3 space-y-2">
                    {a.regras.map((t) => (
                      <li key={t} className="flex gap-3">
                        <ShieldAlert aria-hidden className="mt-1 size-5 shrink-0 text-aviso" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </Container>
      </Section>

      <Section tom="cinza">
        <Container narrow>
          <h2 className="titulo text-2xl sm:text-3xl">Regras para todas as visitas</h2>
          <ul className="mt-6 space-y-3">
            {REGRAS_GERAIS.map((r) => (
              <li key={r} className="flex gap-3 text-lg">
                <ShieldAlert aria-hidden className="mt-1 size-5 shrink-0 text-aviso" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-tinta-suave">
            Estas regras existem para proteger a privacidade e o bem-estar de quem visitamos. Por isso
            também <strong>não publicamos fotografias das atividades</strong>.
          </p>
          <div className="mt-10">
            <ButtonLink href={ROTA_INSCRICAO}>Quero ser voluntário</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
