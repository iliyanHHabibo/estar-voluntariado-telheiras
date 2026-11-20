"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { adicionarNota, apagarNota, atualizarVoluntario, mudarEstadoVoluntario } from "../actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";

export function EditarDados({
  v,
}: {
  v: { id: string; nome: string; telefone: string; menor: boolean; encarregadoNome: string; encarregadoTelefone: string; encarregadoEmail: string };
}) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(atualizarVoluntario, {});
  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="id" value={v.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="vn">Nome</Rotulo>
          <input id="vn" name="nome" required minLength={2} maxLength={120} defaultValue={v.nome} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="vt">Telemóvel</Rotulo>
          <input id="vt" name="telefone" type="tel" required defaultValue={v.telefone} className={CAMPO} />
        </div>
      </div>
      {v.menor && (
        <div className="space-y-5 rounded-2xl border-2 border-aviso/30 bg-amber-50 p-4">
          <p className="font-semibold">Encarregado de educação (menor de 18 anos)</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="en">Nome</Rotulo>
              <input id="en" name="encarregado_nome" maxLength={120} defaultValue={v.encarregadoNome} className={CAMPO} />
            </div>
            <div>
              <Rotulo htmlFor="et">Telemóvel</Rotulo>
              <input id="et" name="encarregado_telefone" type="tel" defaultValue={v.encarregadoTelefone} className={CAMPO} />
            </div>
          </div>
          <div>
            <Rotulo htmlFor="ee" opcional>
              Email
            </Rotulo>
            <input id="ee" name="encarregado_email" type="email" defaultValue={v.encarregadoEmail} className={`${CAMPO} sm:max-w-md`} />
          </div>
        </div>
      )}
      {!v.menor && (
        <>
          <input type="hidden" name="encarregado_nome" value={v.encarregadoNome} />
          <input type="hidden" name="encarregado_telefone" value={v.encarregadoTelefone} />
          <input type="hidden" name="encarregado_email" value={v.encarregadoEmail} />
        </>
      )}
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      <BotaoSubmeter variante="escuro" pendente="A guardar…">
        Guardar
      </BotaoSubmeter>
    </form>
  );
}

export function MudarEstado({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(mudarEstadoVoluntario, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (ativo && !confirm(`Desativar ${nome}? Deixa de poder indicar disponibilidades e de aparecer nas listas de disponíveis. Podes reativar quando quiseres.`)) e.preventDefault();
      }}
      className="inline-flex flex-col"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={ativo ? "inativo" : "ativo"} />
      <button
        type="submit"
        className={`min-h-11 rounded-full border-2 px-5 font-semibold ${ativo ? "border-erro/40 text-erro hover:bg-red-50" : "border-verde text-verde hover:bg-verde hover:text-white"}`}
      >
        {ativo ? "Desativar voluntário" : "Reativar voluntário"}
      </button>
      {estado.erro && <span className="mt-1 text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}

export function NovaNota({ voluntarioId }: { voluntarioId: string }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(adicionarNota, {});
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="voluntario_id" value={voluntarioId} />
      <Rotulo htmlFor="nova-nota">Nova nota (só os admins veem)</Rotulo>
      <textarea key={estado.ok ?? "n"} id="nova-nota" name="texto" rows={3} maxLength={2000} required className={`${CAMPO} !mt-1`} placeholder="Ex.: prefere visitas de manhã; só tem carro às sextas." />
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter variante="escuro" pendente="A guardar…">
        Guardar nota
      </BotaoSubmeter>
    </form>
  );
}

export function ApagarNota({ id, voluntarioId }: { id: string; voluntarioId: string }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(apagarNota, {});
  return (
    <form action={acao} onSubmit={(e) => { if (!confirm("Apagar esta nota?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="voluntario_id" value={voluntarioId} />
      <button type="submit" aria-label="Apagar nota" className="rounded-full p-2 text-erro hover:bg-red-50">
        <Trash2 aria-hidden className="size-4" />
      </button>
      {estado.erro && <span className="text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}
