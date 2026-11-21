"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import {
  alocarVoluntario,
  apagarVisita,
  atualizarVisita,
  mudarEstadoVisita,
  registarPresenca,
  removerAlocacao,
} from "../actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";
import { hhmm, minutos, opcoesDeHora, rotuloHora } from "@/lib/tempo";

type AcaoServidor = (prev: EstadoAdmin, fd: FormData) => Promise<EstadoAdmin>;

/**
 * Mensagens de sucesso/aviso das ações (p.ex. "Visita comunicada. Enviámos 3 emails.").
 * O botão que fez a ação muitas vezes desaparece logo a seguir (o estado da visita muda),
 * por isso a mensagem vai para uma faixa fixa no topo da página.
 */
const EVENTO = "estar:resultado-acao";
function anunciar(e: EstadoAdmin) {
  if (e.ok || e.aviso) window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ok: e.ok, aviso: e.aviso } }));
}
function useAnunciar(estado: EstadoAdmin) {
  useEffect(() => anunciar(estado), [estado]);
}

export function ResultadoDasAcoes() {
  const [msg, setMsg] = useState<EstadoAdmin | null>(null);
  useEffect(() => {
    const ouvir = (ev: Event) => setMsg((ev as CustomEvent<EstadoAdmin>).detail);
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
  if (!msg) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      {msg.ok && <Alerta tipo="sucesso">{msg.ok}</Alerta>}
      {msg.aviso && <Alerta tipo="aviso">{msg.aviso}</Alerta>}
    </div>
  );
}

const ESTILOS = {
  primario: "bg-verde-vivo text-tinta hover:bg-verde-vivo-hover min-h-11 px-5 font-semibold",
  escuro: "bg-verde text-white hover:bg-verde-escuro min-h-11 px-5 font-semibold",
  contorno: "border-2 border-verde text-verde hover:bg-verde hover:text-white min-h-10 px-4 text-sm font-semibold",
  perigo: "border-2 border-erro/40 text-erro hover:bg-red-50 min-h-10 px-4 text-sm font-semibold",
  ativo: "bg-verde text-white min-h-9 px-3 text-sm font-semibold",
  neutro: "border-2 border-black/15 hover:bg-cinza min-h-9 px-3 text-sm font-semibold",
} as const;

/** Um botão que chama uma ação do servidor com campos escondidos e mostra o erro por baixo. */
export function BotaoAcao({
  acao,
  campos,
  rotulo,
  estilo = "contorno",
  confirmar,
  desativado,
  dica,
}: {
  acao: AcaoServidor;
  campos: Record<string, string>;
  rotulo: string;
  estilo?: keyof typeof ESTILOS;
  confirmar?: string;
  desativado?: boolean;
  dica?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAdmin, FormData>(acao, {});
  useAnunciar(estado);
  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className="inline-flex flex-col"
    >
      {Object.entries(campos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={desativado}
        title={dica}
        className={`inline-flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ESTILOS[estilo]}`}
      >
        {rotulo}
      </button>
      {estado.erro && <span role="alert" className="mt-1 max-w-xs text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}

// ------------------------------------------------------------------ estado da visita
export function AcaoEstado({
  id,
  para,
  rotulo,
  perigo,
  primaria,
  desativado,
  dica,
}: {
  id: string;
  para: string;
  rotulo: string;
  perigo?: boolean;
  primaria?: boolean;
  desativado?: boolean;
  dica?: string;
}) {
  return (
    <BotaoAcao
      acao={mudarEstadoVisita}
      campos={{ id, para }}
      rotulo={rotulo}
      estilo={perigo ? "perigo" : primaria ? "primario" : "contorno"}
      confirmar={perigo ? "Cancelar esta visita? Os voluntários alocados vão ver que foi cancelada." : undefined}
      desativado={desativado}
      dica={dica}
    />
  );
}

export function ApagarVisita({ id }: { id: string }) {
  return (
    <BotaoAcao acao={apagarVisita} campos={{ id }} rotulo="Apagar visita" estilo="perigo" confirmar="Apagar esta visita definitivamente?" />
  );
}

// ------------------------------------------------------------------ alocações
export function Alocar({ visitaId, voluntarioId, rotulo = "Alocar", confirmar }: { visitaId: string; voluntarioId: string; rotulo?: string; confirmar?: string }) {
  return (
    <BotaoAcao acao={alocarVoluntario} campos={{ visita_id: visitaId, voluntario_id: voluntarioId }} rotulo={rotulo} estilo="escuro" confirmar={confirmar} />
  );
}

export function RemoverAlocacao({ id, visitaId, nome }: { id: string; visitaId: string; nome: string }) {
  return (
    <BotaoAcao acao={removerAlocacao} campos={{ id, visita_id: visitaId }} rotulo="Remover" estilo="perigo" confirmar={`Remover ${nome} desta visita?`} />
  );
}

export function Presenca({ id, visitaId, valor }: { id: string; visitaId: string; valor: "presente" | "faltou" | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-tinta-suave">Presença:</span>
      {(["presente", "faltou"] as const).map((p) => (
        <BotaoAcao
          key={p}
          acao={registarPresenca}
          campos={{ id, visita_id: visitaId, presenca: valor === p ? "" : p }}
          rotulo={p === "presente" ? "Presente" : "Faltou"}
          estilo={valor === p ? "ativo" : "neutro"}
        />
      ))}
    </div>
  );
}

export function AlocarOutra({ visitaId, opcoes }: { visitaId: string; opcoes: { id: string; rotulo: string; confirmar?: string }[] }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(alocarVoluntario, {});
  useAnunciar(estado);
  const [escolhido, setEscolhido] = useState("");
  const confirmar = opcoes.find((o) => o.id === escolhido)?.confirmar;
  if (opcoes.length === 0) return <p className="text-tinta-suave">Não há mais voluntários ativos.</p>;
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="visita_id" value={visitaId} />
      <div className="min-w-56 flex-1">
        <Rotulo htmlFor="outra">Voluntário</Rotulo>
        <select id="outra" name="voluntario_id" required value={escolhido} onChange={(e) => setEscolhido(e.target.value)} className={`${CAMPO} !mt-1`}>
          <option value="">Escolhe…</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <BotaoSubmeter variante="escuro" pendente="A alocar…" className="min-h-11 !py-2">
        Alocar
      </BotaoSubmeter>
      {estado.erro && <div className="w-full"><Alerta tipo="erro">{estado.erro}</Alerta></div>}
    </form>
  );
}

// ------------------------------------------------------------------ editar a visita
export function EditarVisita({
  visita,
  atividades,
  jaComunicada,
}: {
  visita: { id: string; atividadeId: string; data: string; inicio: string; fim: string; notas: string | null };
  atividades: { id: string; nome: string }[];
  jaComunicada: boolean;
}) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(atualizarVisita, {});
  const [inicioSel, setInicioSel] = useState<number | null>(null);
  const [fimSel, setFimSel] = useState<number | null>(null);
  const DE = 7 * 60;
  const ATE = 22 * 60;
  const inicio = Math.min(Math.max(inicioSel ?? minutos(visita.inicio), DE), ATE - 60);
  const fim = Math.min(Math.max(fimSel ?? minutos(visita.fim), inicio + 60), ATE);

  return (
    <details className="rounded-2xl border-2 border-black/10 p-4">
      <summary className="cursor-pointer font-semibold text-verde">Editar dia, hora, atividade ou notas</summary>
      <form action={acao} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={visita.id} />
        {jaComunicada && (
          <Alerta tipo="aviso">Os voluntários já viram esta visita. Se mudares o dia, a hora ou a atividade, enviamos-lhes um email a avisar.</Alerta>
        )}
        <div>
          <Rotulo htmlFor="ed-atv">Atividade</Rotulo>
          <select id="ed-atv" name="atividade_id" defaultValue={visita.atividadeId} className={`${CAMPO} !mt-1 max-w-md`}>
            {atividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Rotulo htmlFor="ed-data">Dia</Rotulo>
            <input id="ed-data" name="data" type="date" required defaultValue={visita.data} className={`${CAMPO} !mt-1 !w-auto`} />
          </div>
          <div>
            <Rotulo htmlFor="ed-ini">Das</Rotulo>
            <select id="ed-ini" name="inicio" value={hhmm(inicio)} onChange={(e) => setInicioSel(minutos(e.target.value))} className={`${CAMPO} !mt-1 !w-auto`}>
              {opcoesDeHora(DE, ATE - 60).map((t) => (
                <option key={t} value={hhmm(t)}>{rotuloHora(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="ed-fim">Às</Rotulo>
            <select id="ed-fim" name="fim" value={hhmm(fim)} onChange={(e) => setFimSel(minutos(e.target.value))} className={`${CAMPO} !mt-1 !w-auto`}>
              {opcoesDeHora(inicio + 60, ATE).map((t) => (
                <option key={t} value={hhmm(t)}>{rotuloHora(t)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Rotulo htmlFor="ed-notas" opcional>Notas (só os admins veem)</Rotulo>
          <textarea id="ed-notas" name="notas" rows={2} maxLength={2000} defaultValue={visita.notas ?? ""} className={`${CAMPO} !mt-1`} />
        </div>
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
        {estado.aviso && <Alerta tipo="aviso">{estado.aviso}</Alerta>}
        <BotaoSubmeter variante="escuro" pendente="A guardar…">Guardar alterações</BotaoSubmeter>
      </form>
    </details>
  );
}

// ------------------------------------------------------------------ texto para o responsável
export function CopiarTexto({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Alguns browsers/ligações não deixam: usamos o método antigo
      const t = document.createElement("textarea");
      t.value = texto;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="space-y-3">
      <textarea readOnly value={texto} rows={Math.min(texto.split("\n").length + 1, 12)} aria-label="Mensagem para o responsável" className={`${CAMPO} !mt-0 font-mono text-sm`} />
      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-verde px-5 font-semibold text-white hover:bg-verde-escuro"
      >
        {copiado ? <Check aria-hidden className="size-5" /> : <ClipboardCopy aria-hidden className="size-5" />}
        {copiado ? "Copiado!" : "Copiar mensagem"}
      </button>
    </div>
  );
}
