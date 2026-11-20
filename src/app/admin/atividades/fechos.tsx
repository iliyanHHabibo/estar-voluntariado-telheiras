"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { adicionarFecho, removerFecho } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";

export function NovoFecho({ atividades }: { atividades: { id: string; nome: string }[] }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(adicionarFecho, {});
  return (
    <form action={acao} className="flex flex-wrap items-end gap-4">
      <div>
        <Rotulo htmlFor="fe-data">Dia</Rotulo>
        <input id="fe-data" name="data" type="date" required className={`${CAMPO} !mt-1 !w-auto`} />
      </div>
      <div className="min-w-48 flex-1">
        <Rotulo htmlFor="fe-motivo" opcional>
          Motivo
        </Rotulo>
        <input id="fe-motivo" name="motivo" maxLength={200} placeholder="Ex.: Natal" className={`${CAMPO} !mt-1`} />
      </div>
      <div>
        <Rotulo htmlFor="fe-atv">Fecha</Rotulo>
        <select id="fe-atv" name="atividade_id" defaultValue="todas" className={`${CAMPO} !mt-1 !w-auto`}>
          <option value="todas">Todas as atividades</option>
          {atividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>
      <BotaoSubmeter variante="escuro" pendente="A adicionar…" className="mb-0.5">
        Adicionar
      </BotaoSubmeter>
      {estado.erro && <div className="w-full"><Alerta tipo="erro">{estado.erro}</Alerta></div>}
      {estado.ok && <div className="w-full"><Alerta tipo="sucesso">{estado.ok}</Alerta></div>}
    </form>
  );
}

export function RemoverFecho({ id, descricao }: { id: string; descricao: string }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(removerFecho, {});
  return (
    <form action={acao} onSubmit={(e) => { if (!confirm(`Remover o fecho ${descricao}?`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={`Remover o fecho ${descricao}`} className="rounded-full p-2 text-erro hover:bg-red-50">
        <Trash2 aria-hidden className="size-5" />
      </button>
      {estado.erro && <span className="text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}
