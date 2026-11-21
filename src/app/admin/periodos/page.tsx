import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, hojeLisboa, mesSeguinte, primeiroDiaDoMes, rotuloMes } from "@/lib/tempo";
import { AcoesPeriodo, NovoPeriodo } from "./forms";

export const metadata: Metadata = { title: "Períodos de disponibilidades" };

type Periodo = { mes: string; abre_em: string; fecha_em: string; avisados_em: string | null };

const ESTADO = {
  a_abrir: { texto: "Ainda não abriu", cor: "bg-cinza text-tinta" },
  aberto: { texto: "Aberto", cor: "bg-green-100 text-verde" },
  fechado: { texto: "Fechado", cor: "bg-red-50 text-erro" },
} as const;

export default async function Periodos() {
  await exigirAdmin();
  const supabase = await createClient();
  const hoje = hojeLisboa();

  const { data } = await supabase.from("periodos_disponibilidade").select("mes, abre_em, fecha_em, avisados_em").order("mes", { ascending: false }).limit(12);
  const periodos = (data ?? []) as Periodo[];

  // Quantos voluntários já indicaram disponibilidades em cada mês?
  const primeiro = periodos.length ? periodos[periodos.length - 1].mes : primeiroDiaDoMes(hoje);
  const { data: disps } = await supabase.from("disponibilidades").select("voluntario_id, data").gte("data", primeiro).limit(5000);
  const porMes = new Map<string, Set<string>>();
  for (const d of (disps ?? []) as { voluntario_id: string; data: string }[]) {
    const m = primeiroDiaDoMes(d.data);
    if (!porMes.has(m)) porMes.set(m, new Set());
    porMes.get(m)!.add(d.voluntario_id);
  }
  const { count: ativos } = await supabase.from("voluntarios").select("*", { count: "exact", head: true }).eq("estado", "ativo");

  // Meses que ainda não têm período (do mês atual aos próximos 6)
  const existentes = new Set(periodos.map((p) => p.mes));
  const meses: { valor: string; rotulo: string }[] = [];
  let m = primeiroDiaDoMes(hoje);
  for (let i = 0; i < 7; i++) {
    if (!existentes.has(m)) meses.push({ valor: m, rotulo: rotuloMes(m) });
    m = mesSeguinte(m);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="titulo text-3xl">Períodos de disponibilidades</h1>
        <p className="mt-3 max-w-3xl text-lg text-tinta-suave">
          É nestas datas que os voluntários podem indicar quando estão disponíveis para o mês seguinte. Normalmente
          abre no dia 15 e fecha no dia 25.
        </p>
      </div>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Abrir uma nova recolha</h2>
        <NovoPeriodo meses={meses} />
      </section>

      <section className="space-y-4">
        {periodos.length === 0 && <p className="text-tinta-suave">Ainda não há períodos.</p>}
        {periodos.map((p) => {
          const estado = hoje < p.abre_em ? "a_abrir" : hoje > p.fecha_em ? "fechado" : "aberto";
          const entregaram = porMes.get(p.mes)?.size ?? 0;
          return (
            <article key={p.mes} className="grid gap-5 rounded-3xl bg-white p-6 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="titulo text-xl">{rotuloMes(p.mes)}</h3>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ESTADO[estado].cor}`}>{ESTADO[estado].texto}</span>
                </div>
                <p>
                  De <strong>{dataCurta(p.abre_em)}</strong> a <strong>{dataCurta(p.fecha_em)}</strong>
                </p>
                <p className="text-tinta-suave">
                  {entregaram} {entregaram === 1 ? "voluntário indicou" : "voluntários indicaram"} disponibilidades
                  {ativos != null ? ` (de ${ativos} ativos)` : ""}.
                </p>
              </div>
              <AcoesPeriodo mes={p.mes} abreEm={p.abre_em} fechaEm={p.fecha_em} estado={estado} avisadosEm={p.avisados_em} ativos={ativos} />
            </article>
          );
        })}
      </section>
    </div>
  );
}
