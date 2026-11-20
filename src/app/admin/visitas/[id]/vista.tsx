import Link from "next/link";
import { ArrowLeft, Clock, Mail, MapPin, Phone, TriangleAlert } from "lucide-react";
import { dataPorExtensoMaiuscula, horaTexto, rotuloMes, primeiroDiaDoMes } from "@/lib/tempo";
import {
  ACOES_DO_ESTADO,
  ESTADOS_ALOCACAO,
  ESTADOS_VISITA,
  contarAlocacoes,
  lotacao,
  motivoParaNaoMudar,
  textoParaResponsavel,
  type EstadoAlocacao,
  type EstadoVisita,
} from "@/lib/visitas";
import {
  AcaoEstado,
  Alocar,
  AlocarOutra,
  ApagarVisita,
  CopiarTexto,
  EditarVisita,
  Presenca,
  RemoverAlocacao,
} from "./partes";

export type AlocadoUI = {
  id: string;
  estado: EstadoAlocacao;
  presenca: "presente" | "faltou" | null;
  motivo: string | null;
  voluntarioId: string;
  nome: string;
  telefone: string;
  email: string;
  menor: boolean;
  encarregado: { nome: string | null; telefone: string | null } | null;
  aviso: { texto: string; grave: boolean } | null;
};
export type DisponivelUI = {
  voluntarioId: string;
  nome: string;
  telefone: string;
  menor: boolean;
  soEstaAtividade: boolean;
  visitasNoMes: number;
  aviso: { texto: string; grave: boolean } | null;
};
export type OutraUI = { id: string; nome: string; telefone: string; aviso: { texto: string; grave: boolean } | null };

export type DetalheProps = {
  visita: {
    id: string;
    atividadeId: string;
    data: string;
    inicio: string;
    fim: string;
    estado: EstadoVisita;
    notas: string | null;
    atividade: { nome: string; morada: string | null; min: number; max: number };
  };
  atividades: { id: string; nome: string }[];
  alocados: AlocadoUI[];
  disponiveis: DisponivelUI[];
  outras: OutraUI[];
  hoje: string;
};

const tel = (t: string) => t.replace(/[^\d+]/g, "");

function Etiqueta({ cor, children }: { cor: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cor}`}>{children}</span>;
}

function Aviso({ a }: { a: { texto: string; grave: boolean } }) {
  return (
    <p className={`flex items-start gap-1.5 text-sm ${a.grave ? "font-semibold text-erro" : "text-aviso"}`}>
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {a.texto}
    </p>
  );
}

export function DetalheVisita({ visita: v, atividades, alocados, disponiveis, outras, hoje }: DetalheProps) {
  const fechada = v.estado === "cancelada" || v.estado === "realizada";
  const contagem = contarAlocacoes(alocados.map((a) => a.estado));
  const lot = lotacao(contagem.ativas, v.atividade.min, v.atividade.max);
  const ativos = alocados.filter((a) => a.estado === "proposta" || a.estado === "confirmada");

  const texto = textoParaResponsavel({
    atividade: v.atividade.nome,
    data: v.data,
    inicio: v.inicio,
    fim: v.fim,
    pessoas: ativos.map((a) => ({ nome: a.nome, telefone: a.telefone, menor: a.menor })),
  });

  return (
    <div className="space-y-8">
      <Link href={`/admin/planeamento?mes=${primeiroDiaDoMes(v.data)}`} className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Planeamento de {rotuloMes(primeiroDiaDoMes(v.data))}
      </Link>

      {/* Cabeçalho da visita */}
      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="titulo text-2xl sm:text-3xl">{v.atividade.nome}</h1>
          <Etiqueta cor={ESTADOS_VISITA[v.estado].cor}>{ESTADOS_VISITA[v.estado].texto}</Etiqueta>
        </div>
        <p className="flex items-start gap-2 text-xl">
          <Clock aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
          <span>
            {dataPorExtensoMaiuscula(v.data)}, das {horaTexto(v.inicio)} às {horaTexto(v.fim)}
          </span>
        </p>
        {v.atividade.morada && (
          <p className="flex items-start gap-2 text-tinta-suave">
            <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
            {v.atividade.morada}
          </p>
        )}
        {v.notas && <p className="rounded-xl bg-cinza-claro p-3 text-sm"><strong>Notas:</strong> {v.notas}</p>}

        <p className="flex flex-wrap items-center gap-2">
          <Etiqueta cor={lot.estado === "ok" ? "bg-green-100 text-verde" : "bg-amber-100 text-aviso"}>
            {contagem.ativas} {contagem.ativas === 1 ? "pessoa" : "pessoas"} · {lot.texto}
          </Etiqueta>
          <span className="text-sm text-tinta-suave">
            {contagem.confirmadas} confirmada{contagem.confirmadas === 1 ? "" : "s"} · {contagem.propostas} por responder
          </span>
        </p>

        {/* Passos */}
        <div className="space-y-3 border-t border-black/10 pt-5">
          <p className="font-semibold">Próximo passo</p>
          <div className="flex flex-wrap items-start gap-3">
            {ACOES_DO_ESTADO[v.estado].map((a, i) => {
              const motivo = motivoParaNaoMudar({ de: v.estado, para: a.para, data: v.data, hoje, alocacoesAtivas: contagem.ativas });
              return (
                <AcaoEstado key={a.para} id={v.id} para={a.para} rotulo={a.rotulo} perigo={a.perigo} primaria={i === 0 && !a.perigo} desativado={Boolean(motivo)} dica={motivo ?? undefined} />
              );
            })}
          </div>
          {ACOES_DO_ESTADO[v.estado][0]?.ajuda && <p className="max-w-2xl text-sm text-tinta-suave">{ACOES_DO_ESTADO[v.estado][0].ajuda}</p>}
          {(() => {
            const principal = ACOES_DO_ESTADO[v.estado][0];
            const m = principal && motivoParaNaoMudar({ de: v.estado, para: principal.para, data: v.data, hoje, alocacoesAtivas: contagem.ativas });
            return m ? <p className="text-sm font-semibold text-aviso">{m}</p> : null;
          })()}
        </div>

        {!fechada && <EditarVisita visita={{ id: v.id, atividadeId: v.atividadeId, data: v.data, inicio: v.inicio.slice(0, 5), fim: v.fim.slice(0, 5), notas: v.notas }} atividades={atividades} jaComunicada={v.estado === "comunicada"} />}
        {(v.estado === "rascunho" || v.estado === "cancelada") && (
          <div>
            <ApagarVisita id={v.id} />
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Quem vai */}
        <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
          <h2 className="titulo text-xl">Quem vai</h2>
          {alocados.length === 0 ? (
            <p className="text-tinta-suave">Ainda ninguém. Escolhe nas listas {fechada ? "" : "ao lado"}.</p>
          ) : (
            <ul className="divide-y divide-black/10">
              {alocados.map((a) => (
                <li key={a.id} className="space-y-2 py-4 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-semibold">
                      {a.nome} {a.menor && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-aviso">menor</span>}
                    </p>
                    <Etiqueta cor={ESTADOS_ALOCACAO[a.estado].cor}>{ESTADOS_ALOCACAO[a.estado].texto}</Etiqueta>
                  </div>
                  <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <a href={`tel:${tel(a.telefone)}`} className="inline-flex items-center gap-1.5 underline underline-offset-4"><Phone aria-hidden className="size-4" />{a.telefone}</a>
                    <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 break-all underline underline-offset-4"><Mail aria-hidden className="size-4 shrink-0" />{a.email}</a>
                  </p>
                  {a.encarregado?.nome && (
                    <p className="text-sm text-tinta-suave">Encarregado de educação: {a.encarregado.nome}{a.encarregado.telefone ? ` · ${a.encarregado.telefone}` : ""}</p>
                  )}
                  {a.motivo && (a.estado === "recusada" || a.estado === "cancelada") && <p className="text-sm text-tinta-suave">Motivo: “{a.motivo}”</p>}
                  {a.aviso && (a.estado === "proposta" || a.estado === "confirmada") && <Aviso a={a.aviso} />}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {!fechada && (a.estado === "recusada" || a.estado === "cancelada") && <Alocar visitaId={v.id} voluntarioId={a.voluntarioId} rotulo="Voltar a propor" />}
                    {!fechada && <RemoverAlocacao id={a.id} visitaId={v.id} nome={a.nome} />}
                    {(v.estado === "comunicada" || v.estado === "realizada") && v.data <= hoje && (a.estado === "confirmada" || a.estado === "proposta") && (
                      <Presenca id={a.id} visitaId={v.id} valor={a.presenca} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-black/10 pt-5">
            <h3 className="font-semibold">Mensagem para o responsável do local</h3>
            <p className="text-sm text-tinta-suave">Copia e cola no WhatsApp ou no email. Inclui só as pessoas que ainda vão (não as que recusaram).</p>
            <CopiarTexto texto={texto} />
          </div>
        </section>

        {/* Quem pode ir */}
        {!fechada && (
          <section className="space-y-6 rounded-3xl bg-white p-6 sm:p-8">
            <div>
              <h2 className="titulo text-xl">Disponíveis para esta visita</h2>
              <p className="mt-2 text-sm text-tinta-suave">
                Pessoas que indicaram estar livres durante toda a visita, para esta atividade ou para qualquer. Aparecem primeiro
                as que têm menos visitas este mês.
              </p>
            </div>
            {disponiveis.length === 0 ? (
              <p className="text-tinta-suave">Ninguém indicou disponibilidade para este horário. Podes alocar outra pessoa abaixo.</p>
            ) : (
              <ul className="divide-y divide-black/10">
                {disponiveis.map((d) => (
                  <li key={d.voluntarioId} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        {d.nome} {d.menor && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-aviso">menor</span>}
                      </p>
                      <p className="text-sm text-tinta-suave">
                        {d.telefone} · {d.visitasNoMes === 0 ? "sem visitas este mês" : `${d.visitasNoMes} ${d.visitasNoMes === 1 ? "visita" : "visitas"} este mês`}
                        {d.soEstaAtividade && " · escolheu esta atividade"}
                      </p>
                      {d.aviso && <Aviso a={d.aviso} />}
                    </div>
                    <Alocar visitaId={v.id} voluntarioId={d.voluntarioId} confirmar={d.aviso?.grave ? `${d.nome}: ${d.aviso.texto}. Alocar mesmo assim?` : undefined} />
                  </li>
                ))}
              </ul>
            )}

            <details className="rounded-2xl border-2 border-black/10 p-4">
              <summary className="cursor-pointer font-semibold text-verde">Alocar outra pessoa (sem disponibilidade indicada)</summary>
              <div className="mt-4">
                <AlocarOutra
                  visitaId={v.id}
                  opcoes={outras.map((o) => ({ id: o.id, rotulo: `${o.nome} · ${o.telefone}${o.aviso ? ` — ${o.aviso.texto}` : ""}`, confirmar: o.aviso?.grave ? `${o.nome}: ${o.aviso.texto}. Alocar mesmo assim?` : undefined }))}
                />
              </div>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
