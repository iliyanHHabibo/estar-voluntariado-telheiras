"use client";

import { useActionState } from "react";
import { responderVisita, type EstadoVisita } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

function Cancelar({ alocacaoId, resposta, rotulo, botao }: { alocacaoId: string; resposta: "recusada" | "cancelada"; rotulo: string; botao: string }) {
  const [estado, acao] = useActionState<EstadoVisita, FormData>(responderVisita, {});
  return (
    <details className="w-full">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border-2 border-erro/40 px-5 font-semibold text-erro hover:bg-red-50 [&::-webkit-details-marker]:hidden">
        {rotulo}
      </summary>
      <form action={acao} className="mt-3 max-w-md space-y-3 rounded-2xl bg-cinza-claro p-4">
        <input type="hidden" name="alocacao" value={alocacaoId} />
        <input type="hidden" name="resposta" value={resposta} />
        <div>
          <Rotulo htmlFor={`motivo-${alocacaoId}`} opcional>
            Queres dizer porquê?
          </Rotulo>
          <input id={`motivo-${alocacaoId}`} name="motivo" maxLength={500} className={CAMPO} placeholder="Ex.: fiquei doente" />
        </div>
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        <BotaoSubmeter variante="perigo" pendente="A guardar…">
          {botao}
        </BotaoSubmeter>
      </form>
    </details>
  );
}

function Confirmar({ alocacaoId, rotulo }: { alocacaoId: string; rotulo: string }) {
  const [estado, acao] = useActionState<EstadoVisita, FormData>(responderVisita, {});
  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="alocacao" value={alocacaoId} />
      <input type="hidden" name="resposta" value="confirmada" />
      <BotaoSubmeter pendente="A guardar…">{rotulo}</BotaoSubmeter>
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </form>
  );
}

/** Botões de resposta a uma visita, conforme o estado atual da alocação. */
export function Resposta({ alocacaoId, estado }: { alocacaoId: string; estado: "proposta" | "confirmada" | "recusada" | "cancelada" }) {
  if (estado === "proposta") {
    return (
      <div className="flex flex-wrap items-start gap-3">
        <Confirmar alocacaoId={alocacaoId} rotulo="Confirmo" />
        <Cancelar alocacaoId={alocacaoId} resposta="recusada" rotulo="Não posso" botao="Confirmar que não posso" />
      </div>
    );
  }
  if (estado === "confirmada") {
    return <Cancelar alocacaoId={alocacaoId} resposta="cancelada" rotulo="Não posso ir" botao="Cancelar a minha presença" />;
  }
  if (estado === "recusada") {
    return <Confirmar alocacaoId={alocacaoId} rotulo="Afinal posso ir" />;
  }
  return null;
}
