import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, HeartHandshake, Hourglass, MailCheck } from "lucide-react";
import { ButtonLink, Container, Section } from "@/components/ui";
import { ROTA_INSCRICAO, SITE } from "@/lib/site";
import { getAtividades, getTestemunhos } from "@/lib/publico";

const PASSOS = [
  { icon: HeartHandshake, titulo: "Inscreve-te", texto: "Preenches os teus dados uma única vez." },
  { icon: CalendarDays, titulo: "Diz quando podes", texto: "Uma vez por mês, indicas os dias e as horas em que estás disponível." },
  { icon: MailCheck, titulo: "Recebes a confirmação", texto: "Nós falamos com os responsáveis e dizemos-te onde e quando vais." },
  { icon: Clock, titulo: "Vais ESTAR", texto: "Uma hora do teu tempo muda o dia de alguém — e o teu também." },
];

export default async function Inicio() {
  const [atividades, testemunhos] = await Promise.all([getAtividades(), getTestemunhos()]);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-verde text-white">
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[34rem] text-verde-escuro sm:-right-10 sm:size-[42rem]"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <circle cx="100" cy="100" r="100" />
        </svg>
        <svg
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-24 size-72 text-verde-vivo/25 sm:size-96"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <circle cx="100" cy="100" r="100" />
        </svg>
        <Container className="relative py-20 sm:py-32">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            Um projeto de voluntariado
          </p>
          <h1 className="titulo mt-5 text-6xl sm:text-8xl">ESTAR</h1>
          <p className="titulo mt-6 max-w-2xl text-xl text-white/95 sm:text-3xl">
            Às vezes,
            <br />
            basta <strong className="font-bold">ESTAR</strong>.
          </p>
          <p className="mt-8 max-w-xl text-lg text-white/85">
            Um projeto do {SITE.organizacao} que aproxima gerações através daquilo que temos de mais
            valioso para oferecer: o nosso tempo e a nossa presença.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <ButtonLink href={ROTA_INSCRICAO}>Quero ser voluntário</ButtonLink>
            <ButtonLink href="/atividades" variante="contorno">
              Ver atividades
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Frase */}
      <Section tom="preto" className="!py-14 sm:!py-20">
        <Container narrow>
          <p className="titulo text-center text-xl leading-snug sm:text-3xl">
            Num mundo que nos ensina constantemente a fazer, queremos voltar a aprender a ESTAR.
          </p>
        </Container>
      </Section>

      {/* O que é */}
      <Section tom="cinza">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <h2 className="titulo text-3xl sm:text-4xl">O que é o ESTAR?</h2>
          <div className="space-y-5 text-lg">
            <p>
              O ESTAR é o projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras. Visitamos
              pessoas que muitas vezes passam o dia sem companhia — numa clínica e num centro de dia.
            </p>
            <p>
              Não precisas de experiência nem de talentos especiais. Precisas só de uma hora do teu
              tempo, de vontade de ouvir e de ter {SITE.idadeMinima} anos ou mais.
            </p>
          </div>
        </Container>
      </Section>

      {/* Atividades */}
      <Section>
        <Container>
          <h2 className="titulo text-3xl sm:text-4xl">Onde podes ESTAR</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {atividades.map((a) => (
              <article key={a.slug} className="flex flex-col rounded-3xl border border-black/10 bg-cinza-claro p-7 sm:p-9">
                <h3 className="titulo text-xl leading-snug">{a.nome}</h3>
                <p className="mt-4 text-tinta-suave">{a.resumo}</p>
                <p className="mt-5 flex items-start gap-2 font-medium">
                  <Clock aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
                  {a.horario}
                </p>
                <p className="mt-2 flex items-start gap-2 text-tinta-suave">
                  <Hourglass aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
                  Visitas de 1 hora
                </p>
                <Link
                  href={`/atividades#${a.slug}`}
                  className="mt-7 inline-flex items-center gap-2 font-semibold text-verde hover:underline"
                >
                  Saber mais <ArrowRight aria-hidden className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* Como funciona */}
      <Section tom="verde">
        <Container>
          <h2 className="titulo text-3xl sm:text-4xl">Como funciona</h2>
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p, i) => (
              <li key={p.titulo}>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-verde-vivo text-tinta">
                    <p.icon aria-hidden className="size-6" />
                  </span>
                  <span className="titulo text-sm text-white/70">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-white/85">{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <ButtonLink href="/como-funciona" variante="contorno">
              Ver com mais detalhe
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/* Testemunhos (só aparece quando houver testemunhos publicados) */}
      {testemunhos.length > 0 && (
        <Section tom="cinza">
          <Container>
            <h2 className="titulo text-3xl sm:text-4xl">Quem já esteve</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {testemunhos.slice(0, 2).map((t) => (
                <figure key={t.id} className="rounded-3xl bg-white p-7 sm:p-9">
                  <blockquote className="whitespace-pre-line text-lg">“{t.texto}”</blockquote>
                  <figcaption className="mt-5 text-sm font-semibold text-tinta-suave">
                    {t.autor}{t.atividade ? ` · ${t.atividade}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-10">
              <ButtonLink href="/testemunhos" variante="escuro">
                Ler mais testemunhos
              </ButtonLink>
            </div>
          </Container>
        </Section>
      )}

      {/* Começa onde estás */}
      <Section tom="cinza">
        <Container className="grid gap-10 lg:grid-cols-2">
          <h2 className="titulo text-3xl sm:text-4xl">
            Ou podes começar exatamente onde estás.
          </h2>
          <div className="space-y-5 text-lg">
            <p>
              O <strong>ESTAR</strong> não acontece apenas quando nos juntamos para fazer voluntariado.
            </p>
            <p>
              Pode acontecer no <strong>café</strong> da tua rua, no <strong>banco do jardim</strong>,
              numa <strong>visita</strong> aos teus avós ou numa <strong>conversa</strong> com alguém
              que costuma estar sozinho.
            </p>
            <p>
              E, se quiseres, conta-nos como foi. Talvez a tua história inspire alguém a fazer o mesmo :)
            </p>
          </div>
        </Container>
      </Section>

      {/* CTA final */}
      <Section tom="preto">
        <Container className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="titulo text-3xl sm:text-5xl">Junta-te à equipa!</h2>
            <p className="mt-4 text-lg text-white/80">
              Estamos a iniciar um grupo de voluntários na zona de Telheiras. Inscreve-te!
            </p>
          </div>
          <ButtonLink href={ROTA_INSCRICAO}>Quero ser voluntário</ButtonLink>
        </Container>
      </Section>
    </>
  );
}
