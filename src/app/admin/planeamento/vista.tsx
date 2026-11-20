import Link from "next/link";
import { CalendarOff, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import type { Dia } from "@/lib/disponibilidade";
import { DIAS_SEMANA_CURTO, dataCurta, horaTexto, mesAnterior, mesSeguinte, rotuloMes } from "@/lib/tempo";
import { ESTADOS_VISITA, lotacao, type EstadoVisita } from "@/lib/visitas";

export type VisitaPlan = {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  estado: EstadoVisita;
  atividadeId: string;
  atividade: string;
  ativas: number;
  min: number;
  max: number;
};

export type PlaneamentoProps = {
  mes: string;
  hoje: string;
  dias: Dia[];
  visitas: VisitaPlan[];
  /** data → atividade → nº de voluntários disponíveis */
  disponiveis: Record<string, Record<string, number>>;
  periodo: { abre_em: string; fecha_em: string } | null;
  voluntarios: { ativos: number; responderam: number };
};

/** "Clínica de S. José — Unidade 4" → "Clínica de S. José" */
export const nomeCurto = (n: string) => n.split(" — ")[0];

export function PlaneamentoMes({ mes, hoje, dias, visitas, disponiveis, periodo, voluntarios }: PlaneamentoProps) {
  const validas = visitas.filter((v) => v.estado !== "cancelada");
  const porCompletar = validas.filter((v) => v.ativas < v.min).length;
  const rascunhos = validas.filter((v) => v.estado === "rascunho" || v.estado === "confirmada_responsavel").length;
  const comunicadas = validas.filter((v) => v.estado === "comunicada" || v.estado === "realizada").length;

  const estadoPeriodo = !periodo ? null : hoje < periodo.abre_em ? "a_abrir" : hoje > periodo.fecha_em ? "fechado" : "aberto";

  return (
    <div className="space-y-8">
      {/* Mês */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="titulo text-3xl">Planeamento</h1>
        <nav aria-label="Mês" className="flex items-center gap-2">
          <Link href={`/admin/planeamento?mes=${mesAnterior(mes)}`} aria-label="Mês anterior" className="inline-flex size-11 items-center justify-center rounded-full bg-white hover:bg-cinza">
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <span className="titulo min-w-48 text-center text-lg">{rotuloMes(mes)}</span>
          <Link href={`/admin/planeamento?mes=${mesSeguinte(mes)}`} aria-label="Mês seguinte" className="inline-flex size-11 items-center justify-center rounded-full bg-white hover:bg-cinza">
            <ChevronRight aria-hidden className="size-5" />
          </Link>
        </nav>
      </div>

      {/* Resumo */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Visitas" valor={validas.length} nota={validas.length === 0 ? "Ainda nenhuma" : `${comunicadas} comunicadas`} />
        <Cartao titulo="Por completar" valor={porCompletar} nota="abaixo do mínimo de voluntários" alerta={porCompletar > 0} />
        <Cartao titulo="Por comunicar" valor={rascunhos} nota="rascunho ou à espera do responsável" alerta={rascunhos > 0} />
        <div className="rounded-3xl bg-white p-5">
          <p className="text-sm text-tinta-suave">Recolha de disponibilidades</p>
          {periodo ? (
            <>
              <p className="mt-1 font-semibold">
                {estadoPeriodo === "aberto" ? "Aberta" : estadoPeriodo === "a_abrir" ? `Abre a ${dataCurta(periodo.abre_em)}` : "Fechada"}
                {estadoPeriodo === "aberto" && ` até ${dataCurta(periodo.fecha_em)}`}
              </p>
              <p className="text-sm text-tinta-suave">
                {voluntarios.responderam} de {voluntarios.ativos} voluntários responderam
              </p>
            </>
          ) : (
            <p className="mt-1 font-semibold text-aviso">Sem período para este mês</p>
          )}
          <Link href="/admin/periodos" className="mt-2 inline-block text-sm font-semibold text-verde underline underline-offset-4">
            Gerir períodos
          </Link>
        </div>
      </section>

      {/* Dias */}
      <ol className="divide-y divide-black/10 overflow-hidden rounded-3xl bg-white">
        {dias.map((dia) => {
          const doDia = visitas.filter((v) => v.data === dia.data).sort((a, b) => a.inicio.localeCompare(b.inicio));
          const passado = dia.data < hoje;
          const disp = disponiveis[dia.data] ?? {};
          return (
            <li
              key={dia.data}
              className={`grid gap-3 px-4 py-4 sm:grid-cols-[6rem_1fr] sm:px-6 ${dia.diaSemana === 1 ? "border-t-4 border-t-black/10" : ""} ${passado ? "opacity-60" : ""} ${dia.data === hoje ? "bg-verde/5" : ""}`}
            >
              <div className="flex items-baseline gap-2 sm:block">
                <span className="titulo text-xl">{Number(dia.data.slice(8))}</span>
                <span className="text-tinta-suave"> {DIAS_SEMANA_CURTO[dia.diaSemana - 1]}</span>
                {dia.data === hoje && <span className="ml-2 rounded-full bg-verde px-2 py-0.5 text-xs font-semibold text-white sm:ml-0 sm:block sm:w-fit">hoje</span>}
              </div>

              <div className="space-y-3">
                {dia.fechos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {dia.fechos.map((f, i) => (
                      <li key={i} className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-aviso">
                        <CalendarOff aria-hidden className="size-4 shrink-0" />
                        {f.motivo ?? "Fechado"} · {f.nome ? `${nomeCurto(f.nome)} fechado` : "tudo fechado"}
                      </li>
                    ))}
                  </ul>
                )}

                {doDia.length > 0 && (
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {doDia.map((v) => {
                      const lot = lotacao(v.ativas, v.min, v.max);
                      const cancelada = v.estado === "cancelada";
                      return (
                        <li key={v.id}>
                          <Link
                            href={`/admin/visitas/${v.id}`}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 transition-colors hover:border-verde ${
                              cancelada ? "border-black/10 opacity-60" : lot.estado === "ok" ? "border-verde/30" : "border-aviso/50"
                            }`}
                          >
                            <span className="font-semibold">
                              {horaTexto(v.inicio)}–{horaTexto(v.fim)} · {nomeCurto(v.atividade)}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-sm">
                              {!cancelada && (
                                <span className={`inline-flex items-center gap-1 font-semibold ${lot.estado === "ok" ? "text-verde" : "text-aviso"}`}>
                                  <Users aria-hidden className="size-4" /> {v.ativas}/{v.max}
                                </span>
                              )}
                              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_VISITA[v.estado].cor}`}>{ESTADOS_VISITA[v.estado].texto}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {!passado && dia.janelas.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {dia.janelas.map((j) => {
                      const n = disp[j.atividade_id] ?? 0;
                      return (
                        <li key={j.atividade_id}>
                          <Link
                            href={`/admin/visitas/nova?data=${dia.data}&atividade=${j.atividade_id}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-dashed border-verde/50 px-3 text-sm font-medium text-verde hover:border-solid hover:bg-verde hover:text-white"
                            title={`Criar visita: ${j.nome}`}
                          >
                            <Plus aria-hidden className="size-4" /> {nomeCurto(j.nome)}
                            <span className={n === 0 ? "text-tinta-suave" : "font-semibold"}>
                              · {n} {n === 1 ? "disponível" : "disponíveis"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {dia.janelas.length === 0 && doDia.length === 0 && dia.fechos.length === 0 && <p className="text-sm text-tinta-suave">Sem atividades neste dia.</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Cartao({ titulo, valor, nota, alerta }: { titulo: string; valor: number; nota: string; alerta?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${alerta ? "bg-amber-50 ring-2 ring-aviso/40" : "bg-white"}`}>
      <p className="text-sm text-tinta-suave">{titulo}</p>
      <p className="titulo mt-1 text-3xl">{valor}</p>
      <p className="text-sm text-tinta-suave">{nota}</p>
    </div>
  );
}
