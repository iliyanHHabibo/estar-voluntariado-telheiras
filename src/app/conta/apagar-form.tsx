"use client";

import { useActionState } from "react";
import { apagarConta, type EstadoApagar } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

export function ApagarContaForm() {
  const [estado, acao] = useActionState<EstadoApagar, FormData>(apagarConta, {});
  return (
    <details className="rounded-2xl border-2 border-erro/20 p-5">
      <summary className="cursor-pointer font-semibold text-erro">Apagar a minha conta</summary>
      <form action={acao} className="mt-4 space-y-4">
        <p>
          Isto apaga <strong>todos</strong> os teus dados (perfil, disponibilidades, visitas e testemunhos) e não pode ser
          desfeito.
        </p>
        <div>
          <Rotulo htmlFor="confirmacao">Escreve APAGAR para confirmar</Rotulo>
          <input id="confirmacao" name="confirmacao" autoComplete="off" className={`${CAMPO} max-w-xs`} />
        </div>
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        <BotaoSubmeter variante="perigo" pendente="A apagar…">
          Apagar definitivamente
        </BotaoSubmeter>
      </form>
    </details>
  );
}
