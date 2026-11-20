"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarOff, CalendarPlus, Repeat, Trash2 } from "lucide-react";
import {
  adicionarDisponibilidade,
  guardarObservacao,
  removerDisponibilidade,
  repetirTodasAsSemanas,
  type EstadoDisp,
} from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import { janelasDoDiaDaSemana, type Dia, type Janela } from "@/lib/disponibilidade";
import { DIAS_SEMANA_CURTO, opcoesDeHora, rotuloHora, hhmm } from "@/lib/tempo";

export type MinhaDisp = { id: string; data: string; inicio: number; fim: number; atividade_id: string | null };
export type AtividadeUI = { id: string; nome: string };

const DURACAO_MIN = 60;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const SELECT = `${CAMPO} !mt-0 !w-auto min-w-24`;

/** Dois seletores de hora ("das … às …"), que nunca deixam escolher menos de 1 hora. */
function SeletorHoras({ lo, hi, id }: { lo: number; hi: number; id: string }) {
  const [inicioSel, setInicioSel] = useState<number | null>(null);
  const [fimSel, setFimSel] = useState<number | null>(null);
  const inicio = clamp(inicioSel ?? lo, lo, hi - DURACAO_MIN);
  const fim = clamp(fimSel ?? Math.min(inicio + 120, hi), inicio + DURACAO_MIN, hi);
  return (
    <>
      <div>
        <Rotulo htmlFor={`${id}-inicio`}>das</Rotulo>
        <select
          id={`${id}-inicio`}
          name="inicio"
          value={hhmm(inicio)}
          onChange={(e) => setInicioSel(Number(e.target.value.slice(0, 2)) * 60 + Number(e.target.value.slice(3)))}
          className={SELECT}
        >
          {opcoesDeHora(lo, hi - DURACAO_MIN).map((t) => (
            <option key={t} value={hhmm(t)}>
              {rotuloHora(t)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Rotulo htmlFor={`${id}-fim`}>às</Rotulo>
        <select
          id={`${id}-fim`}
          name="fim"
          value={hhmm(fim)}
          onChange={(e) => setFimSel(Number(e.target.value.slice(0, 2)) * 60 + Number(e.target.value.slice(3)))}
          className={SELECT}
        >
          {opcoesDeHora(inicio + DURACAO_MIN, hi).map((t) => (
            <option key={t} value={hhmm(t)}>
              {rotuloHora(t)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function intervaloDe(janelas: Janela[]) {
  return { lo: Math.min(...janelas.map((j) => j.abre)), hi: Math.max(...janelas.map((j) => j.fecha)) };
}

// ------------------------------------------------------------------ um intervalo já indicado
function Chip({ d, nome, editavel }: { d: MinhaDisp; nome: string; editavel: boolean }) {
  const [estado, acao] = useActionState<EstadoDisp, FormData>(removerDisponibilidade, {});
  return (
    <li className="flex flex-col">
      <form action={acao} className="inline-flex items-center gap-2 rounded-full bg-verde px-4 py-2 text-sm text-white">
        <input type="hidden" name="id" value={d.id} />
        <span>
          <strong>
            {rotuloHora(d.inicio)}–{rotuloHora(d.fim)}
          </strong>{" "}
          · {nome}
        </span>
        {editavel && (
          <button type="submit" aria-label={`Apagar ${rotuloHora(d.inicio)} às ${rotuloHora(d.fim)}`} className="-mr-1 rounded-full p-1 hover:bg-white/20">
            <Trash2 aria-hidden className="size-4" />
          </button>
        )}
      </form>
      {estado.erro && <span className="mt-1 text-sm text-erro">{estado.erro}</span>}
    </li>
  );
}

// ------------------------------------------------------------------ adicionar num dia
function AdicionarNoDia({ dia }: { dia: Dia }) {
  const [estado, acao] = useActionState<EstadoDisp, FormData>(adicionarDisponibilidade, {});
  const [atividade, setAtividade] = useState("");
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (estado.ok && ref.current) ref.current.open = false;
  }, [estado]);

  const escolhidas = atividade ? dia.janelas.filter((j) => j.atividade_id === atividade) : dia.janelas;
  const { lo, hi } = intervaloDe(escolhidas.length ? escolhidas : dia.janelas);

  return (
    <details ref={ref} className="group">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border-2 border-verde px-4 text-sm font-semibold text-verde hover:bg-verde hover:text-white [&::-webkit-details-marker]:hidden">
        <CalendarPlus aria-hidden className="size-4" /> Adicionar
      </summary>
      <form action={acao} className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-cinza-claro p-4">
        <input type="hidden" name="data" value={dia.data} />
        <div className="min-w-48 flex-1">
          <Rotulo htmlFor={`atv-${dia.data}`}>Atividade</Rotulo>
          <select
            id={`atv-${dia.data}`}
            name="atividade_id"
            value={atividade}
            onChange={(e) => setAtividade(e.target.value)}
            className={`${CAMPO} !mt-1`}
          >
            <option value="">Qualquer atividade</option>
            {dia.janelas.map((j) => (
              <option key={j.atividade_id} value={j.atividade_id}>
                {j.nome}
              </option>
            ))}
          </select>
        </div>
        <SeletorHoras key={`${lo}-${hi}`} id={`h-${dia.data}`} lo={lo} hi={hi} />
        <BotaoSubmeter variante="escuro" pendente="A guardar…" className="min-h-11 !py-2">
          Guardar
        </BotaoSubmeter>
        <p className="w-full text-sm text-tinta-suave">
          Abertas neste dia: {dia.janelas.map((j) => `${j.nome} (${rotuloHora(j.abre)}–${rotuloHora(j.fecha)})`).join(" · ")}
        </p>
        {estado.erro && (
          <div className="w-full">
            <Alerta tipo="erro">{estado.erro}</Alerta>
          </div>
        )}
      </form>
    </details>
  );
}

// ------------------------------------------------------------------ repetir todas as semanas
const SEMANAS = ["segundas-feiras", "terças-feiras", "quartas-feiras", "quintas-feiras", "sextas-feiras", "sábados", "domingos"];

function Repetir({ mes, dias, abertoPorOmissao }: { mes: string; dias: Dia[]; abertoPorOmissao: boolean }) {
  const [estado, acao] = useActionState<EstadoDisp, FormData>(repetirTodasAsSemanas, {});
  const [diaSemana, setDiaSemana] = useState(2);
  const [atividade, setAtividade] = useState("");
  // Aberto à partida se ainda não há disponibilidades; depois, só se fecha se a pessoa o fechar
  // (antes fechava-se sozinho ao adicionar a primeira, e escondia a mensagem do resultado)
  const [aberto, setAberto] = useState(abertoPorOmissao);

  // Só oferecemos o que existe nesse dia da semana (ao domingo, p.ex., não há Centro de Dia)
  const doDia = janelasDoDiaDaSemana(dias, diaSemana);
  const atividadeEfetiva = doDia.some((x) => x.atividade_id === atividade) ? atividade : "";
  const escolhidas = atividadeEfetiva ? doDia.filter((x) => x.atividade_id === atividadeEfetiva) : doDia;
  const { lo, hi } = escolhidas.length ? intervaloDe(escolhidas) : { lo: 600, hi: 1080 };

  return (
    <details open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)} className="rounded-3xl border-2 border-verde/30 bg-white p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold [&::-webkit-details-marker]:hidden">
        <Repeat aria-hidden className="size-5 text-verde" />
        <span>
          Atalho: repetir todas as semanas
          <span className="block text-sm font-normal text-tinta-suave">Por exemplo, “todas as terças das 14h às 16h”, num só passo.</span>
        </span>
      </summary>
      <form action={acao} className="mt-5 flex flex-wrap items-end gap-3">
        <input type="hidden" name="mes" value={mes} />
        <div>
          <Rotulo htmlFor="rep-dia">Todas as</Rotulo>
          <select
            id="rep-dia"
            name="dia_semana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(Number(e.target.value))}
            className={`${CAMPO} !mt-1 !w-auto`}
          >
            {SEMANAS.map((s, i) => (
              <option key={s} value={i + 1}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {doDia.length === 0 ? (
          <p className="min-w-48 flex-1 pb-3 text-tinta-suave">Nenhuma atividade funciona nesse dia da semana neste mês.</p>
        ) : (
          <>
            <div className="min-w-48 flex-1">
              <Rotulo htmlFor="rep-atv">Atividade</Rotulo>
              <select
                id="rep-atv"
                name="atividade_id"
                value={atividadeEfetiva}
                onChange={(e) => setAtividade(e.target.value)}
                className={`${CAMPO} !mt-1`}
              >
                <option value="">Qualquer atividade</option>
                {doDia.map((x) => (
                  <option key={x.atividade_id} value={x.atividade_id}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </div>
            <SeletorHoras key={`${lo}-${hi}`} id="rep" lo={lo} hi={hi} />
            <BotaoSubmeter variante="escuro" pendente="A adicionar…" className="min-h-11 !py-2">
              Adicionar a todas
            </BotaoSubmeter>
          </>
        )}
        {estado.erro && (
          <div className="w-full">
            <Alerta tipo="erro">{estado.erro}</Alerta>
          </div>
        )}
        {estado.ok && (
          <div className="w-full space-y-2">
            <Alerta tipo="sucesso">{estado.ok}</Alerta>
            {estado.aviso && <Alerta tipo="aviso">{estado.aviso}</Alerta>}
          </div>
        )}
      </form>
    </details>
  );
}

// ------------------------------------------------------------------ observações
function Observacao({ mes, nota }: { mes: string; nota: string }) {
  const [estado, acao] = useActionState<EstadoDisp, FormData>(guardarObservacao, {});
  return (
    <form action={acao} className="space-y-3 rounded-3xl bg-cinza-claro p-5 sm:p-6">
      <input type="hidden" name="mes" value={mes} />
      <Rotulo htmlFor="obs" opcional>
        Observações para este mês
      </Rotulo>
      <textarea
        id="obs"
        name="texto"
        rows={3}
        maxLength={500}
        defaultValue={nota}
        placeholder="Por exemplo: “Este mês só consigo fazer 2 visitas.”"
        className={CAMPO}
      />
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      <BotaoSubmeter variante="escuro" pendente="A guardar…">
        Guardar observação
      </BotaoSubmeter>
    </form>
  );
}

// ------------------------------------------------------------------ o calendário todo
export function Calendario({
  mes,
  dias,
  atividades,
  minhas,
  nota,
  hoje,
  editavel,
}: {
  mes: string;
  dias: Dia[];
  atividades: AtividadeUI[];
  minhas: MinhaDisp[];
  nota: string;
  hoje: string;
  editavel: boolean;
}) {
  const nomeDe = (id: string | null) => (id ? (atividades.find((a) => a.id === id)?.nome ?? "—") : "Qualquer atividade");

  return (
    <div className="space-y-8">
      {editavel && <Repetir mes={mes} dias={dias} abertoPorOmissao={minhas.length === 0} />}

      <ol className="divide-y divide-black/10 rounded-3xl border-2 border-black/10">
        {dias.map((dia) => {
          const dasMinhas = minhas.filter((m) => m.data === dia.data).sort((a, b) => a.inicio - b.inicio);
          const passado = dia.data < hoje;
          const dd = Number(dia.data.slice(8));
          const podeAdicionar = editavel && !passado && dia.janelas.length > 0;
          return (
            <li
              key={dia.data}
              className={`grid gap-3 px-4 py-4 sm:grid-cols-[8rem_1fr] sm:px-6 ${dia.diaSemana === 1 ? "border-t-4 border-t-black/10" : ""} ${
                dasMinhas.length ? "bg-verde/5" : ""
              } ${passado ? "opacity-50" : ""}`}
            >
              <div className="flex items-baseline gap-2 sm:block">
                <span className="titulo text-xl">{dd}</span>
                <span className="text-tinta-suave"> {DIAS_SEMANA_CURTO[dia.diaSemana - 1]}</span>
              </div>
              <div className="space-y-3">
                {dia.fechos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {dia.fechos.map((f, i) => (
                      <li
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-aviso"
                      >
                        <CalendarOff aria-hidden className="size-4 shrink-0" />
                        <span>
                          {f.motivo ?? "Fechado"} · {f.nome ? `${f.nome} fechado` : "tudo fechado"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {dasMinhas.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {dasMinhas.map((m) => (
                      <Chip key={m.id} d={m} nome={nomeDe(m.atividade_id)} editavel={editavel && !passado} />
                    ))}
                  </ul>
                )}
                {dia.janelas.length === 0 && !dasMinhas.length && dia.fechos.length === 0 && (
                  <p className="text-sm text-tinta-suave">Sem atividades neste dia.</p>
                )}
                {podeAdicionar && <AdicionarNoDia dia={dia} />}
              </div>
            </li>
          );
        })}
      </ol>

      {editavel && <Observacao mes={mes} nota={nota} />}
      {!editavel && nota && (
        <div className="rounded-3xl bg-cinza-claro p-5">
          <p className="font-semibold">Observações para este mês</p>
          <p className="mt-1 whitespace-pre-wrap">{nota}</p>
        </div>
      )}
    </div>
  );
}
