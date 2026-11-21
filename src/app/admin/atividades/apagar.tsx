"use client";

import { useActionState } from "react";
import { apagarAtividade } from "./actions";
import { Alerta, BotaoSubmeter } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";

export function ApagarAtividade({ id, nome, visitas, disponibilidades }: { id: string; nome: string; visitas: number; disponibilidades: number }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(apagarAtividade, {});

  if (visitas > 0) {
    return (
      <p className="text-tinta-suave">
        Esta atividade tem {visitas} {visitas === 1 ? "visita" : "visitas"}, por isso não se pode apagar: perdia-se o histórico.
        Para a tirar do site, desmarca <strong>Ativa</strong> acima e guarda.
      </p>
    );
  }

  const extra = disponibilidades > 0 ? ` Também se apagam ${disponibilidades} ${disponibilidades === 1 ? "disponibilidade indicada" : "disponibilidades indicadas"} pelos voluntários para ela.` : "";
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(`Apagar «${nome}» definitivamente? Apagam-se também os horários, os feriados próprios e o contacto do responsável.${extra}`)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-tinta-suave">
        Ainda não tem visitas, por isso pode ser apagada.{extra} Se só a quiseres esconder, desmarca <strong>Ativa</strong>.
      </p>
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter variante="perigo" pendente="A apagar…">
        Apagar atividade
      </BotaoSubmeter>
    </form>
  );
}
