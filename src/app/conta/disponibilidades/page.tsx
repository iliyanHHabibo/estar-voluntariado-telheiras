import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { diasComJanelas } from "@/lib/disponibilidade";
import { dataCurta, hojeLisboa, mesSeguinte, minutos, primeiroDiaDoMes, rotuloMes } from "@/lib/tempo";
import { ContaNav } from "../conta-nav";
import { Calendario } from "./calendario";

export const metadata: Metadata = { title: "As minhas disponibilidades", robots: { index: false } };

export default function Disponibilidades({ searchParams }: PageProps<"/conta/disponibilidades">) {
  return (
    <>
      <PageHeader titulo="Disponibilidades" subtitulo="Diz-nos, uma vez por mês, quando podes ir." />
      <Section>
        <Container>
          <ContaNav />
          <Suspense fallback={<p>A carregar…</p>}>
            <Conteudo searchParams={searchParams} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

type Periodo = { mes: string; abre_em: string; fecha_em: string };

async function Conteudo({ searchParams }: { searchParams: PageProps<"/conta/disponibilidades">["searchParams"] }) {
  const { perfil, u } = await exigirVoluntario("/conta/disponibilidades");
  const supabase = await createClient();
  const hoje = hojeLisboa();

  // Meses com período ainda por fechar (abertos agora ou a abrir em breve), mais o mês atual
  const { data: periodosBrutos } = await supabase
    .from("periodos_disponibilidade")
    .select("mes, abre_em, fecha_em")
    .gte("mes", primeiroDiaDoMes(hoje))
    .order("mes");
  const periodos = (periodosBrutos ?? []) as Periodo[];
  const abertos = periodos.filter((p) => p.abre_em <= hoje && hoje <= p.fecha_em);
  const aAbrir = periodos.filter((p) => p.abre_em > hoje);

  const { mes: mesPedido } = await searchParams;
  const escolhido =
    periodos.find((p) => p.mes === mesPedido) ?? abertos[0] ?? periodos.find((p) => p.mes >= hoje.slice(0, 8) + "01" && p.fecha_em < hoje);

  if (perfil.estado !== "ativo") {
    return <p className="text-lg">A tua inscrição está inativa. Fala com a equipa se quiseres voltar a participar.</p>;
  }

  if (!escolhido) {
    return (
      <div className="max-w-2xl space-y-4 rounded-3xl bg-cinza-claro p-7">
        <h2 className="titulo text-xl">Ainda não há nenhum período aberto</h2>
        <p className="text-lg">
          {aAbrir[0]
            ? `A recolha de disponibilidades para ${rotuloMes(aAbrir[0].mes)} abre a ${dataCurta(aAbrir[0].abre_em)}.`
            : "Quando a equipa abrir a recolha do próximo mês, podes indicar aqui os dias e as horas em que estás disponível."}
        </p>
        <p className="text-tinta-suave">Normalmente a recolha decorre entre os dias 15 e 25 de cada mês, para o mês seguinte.</p>
      </div>
    );
  }

  const editavel = escolhido.abre_em <= hoje && hoje <= escolhido.fecha_em;
  const mes = escolhido.mes;
  const fimDoMes = mesSeguinte(mes);

  const [{ data: atividades }, { data: horarios }, { data: fechos }, { data: minhas }, { data: nota }] = await Promise.all([
    supabase.from("atividades").select("id, nome").eq("ativa", true).order("ordem"),
    supabase.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
    supabase.from("atividade_fechos").select("atividade_id, data").gte("data", mes).lt("data", fimDoMes),
    supabase
      .from("disponibilidades")
      .select("id, data, inicio, fim, atividade_id")
      .eq("voluntario_id", u.id)
      .gte("data", mes)
      .lt("data", fimDoMes)
      .order("data"),
    supabase.from("disponibilidade_notas").select("texto").eq("voluntario_id", u.id).eq("mes", mes).maybeSingle(),
  ]);

  const dias = diasComJanelas(mes, atividades ?? [], horarios ?? [], fechos ?? []);
  const lista = (minhas ?? []).map((m) => ({
    id: m.id as string,
    data: m.data as string,
    inicio: minutos(m.inicio),
    fim: minutos(m.fim),
    atividade_id: m.atividade_id as string | null,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="titulo text-2xl">{rotuloMes(mes)}</h2>
        {editavel ? (
          <p className="text-lg">
            Podes alterar até <strong>{dataCurta(escolhido.fecha_em)}</strong>. Cada visita dura pelo menos 1 hora.
          </p>
        ) : escolhido.abre_em > hoje ? (
          <p className="text-lg">A recolha para este mês abre a {dataCurta(escolhido.abre_em)}.</p>
        ) : (
          <p className="text-lg">
            A recolha deste mês fechou a {dataCurta(escolhido.fecha_em)}. Para mudar algo, fala com a equipa.
          </p>
        )}
        <p className="text-tinta-suave">
          {lista.length === 0
            ? "Ainda não indicaste nenhuma disponibilidade."
            : `Indicaste ${lista.length} ${lista.length === 1 ? "disponibilidade" : "disponibilidades"}.`}{" "}
          Depois, a equipa trata de confirmar tudo e envia-te as visitas.
        </p>
        {periodos.length > 1 && (
          <p className="flex flex-wrap gap-2 pt-1">
            {periodos.map((p) => (
              <Link
                key={p.mes}
                href={`/conta/disponibilidades?mes=${p.mes}`}
                aria-current={p.mes === mes ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${p.mes === mes ? "bg-verde text-white" : "bg-cinza-claro hover:bg-cinza"}`}
              >
                {rotuloMes(p.mes)}
              </Link>
            ))}
          </p>
        )}
      </div>

      <Calendario
        mes={mes}
        dias={dias}
        atividades={atividades ?? []}
        minhas={lista}
        nota={(nota?.texto as string | undefined) ?? ""}
        hoje={hoje}
        editavel={editavel}
      />
    </div>
  );
}
