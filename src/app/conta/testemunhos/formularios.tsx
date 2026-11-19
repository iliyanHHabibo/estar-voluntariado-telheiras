"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { apagarTestemunho, enviarTestemunho, type EstadoApagarTestemunho, type EstadoTestemunho } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

export function NovoTestemunho({ atividades }: { atividades: { id: string; nome: string }[] }) {
  const [estado, acao] = useActionState<EstadoTestemunho, FormData>(enviarTestemunho, {});
  const [escrito, setEscrito] = useState<string | null>(null);
  const texto = escrito ?? estado.campos?.texto ?? "";

  // Depois de enviado com sucesso, o formulário limpa-se (key muda) e mostra o agradecimento
  if (estado.ok) {
    return (
      <div className="space-y-4">
        <Alerta tipo="sucesso">{estado.ok}</Alerta>
        <a href="/conta/testemunhos" className="inline-block font-semibold text-verde underline underline-offset-4">
          Escrever outro
        </a>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-6">
      <div>
        <Rotulo htmlFor="atividade" opcional>
          Sobre que atividade?
        </Rotulo>
        <select id="atividade" name="atividade_id" defaultValue={estado.campos?.atividade_id ?? ""} className={`${CAMPO} max-w-md`}>
          <option value="">Não indicar</option>
          {atividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Rotulo htmlFor="texto">O teu testemunho</Rotulo>
        <textarea
          id="texto"
          name="texto"
          required
          minLength={20}
          maxLength={2000}
          rows={7}
          value={texto}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder="Como foi a tua experiência? O que levaste contigo?"
          className={CAMPO}
        />
        <p className="mt-1 text-right text-sm text-tinta-suave">{texto.length}/2000</p>
      </div>

      <div className="rounded-2xl border-2 border-aviso/30 bg-amber-50 p-4">
        <p className="font-semibold">Antes de enviares</p>
        <p className="mt-1">
          Não escrevas <strong>nomes</strong> nem <strong>informação que identifique</strong> as pessoas que visitaste. Respeita a
          privacidade delas — é por isso que também não publicamos fotografias.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-cinza-claro">
          <input type="checkbox" name="anonimo" defaultChecked={estado.campos?.anonimo} className="mt-1 size-5 shrink-0 accent-verde" />
          <span>
            <strong>Publicar como “Anónimo”.</strong> Se não marcares, aparece só o teu primeiro nome.
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-cinza-claro">
          <input type="checkbox" name="consentimento" required className="mt-1 size-5 shrink-0 accent-verde" />
          <span>
            Autorizo o ESTAR a publicar este testemunho no site, depois de revisto pela equipa (que pode fazer pequenas
            correções).
          </span>
        </label>
      </div>

      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter pendente="A enviar…">Enviar testemunho</BotaoSubmeter>
    </form>
  );
}

export function ApagarTestemunho({ id }: { id: string }) {
  const [estado, acao] = useActionState<EstadoApagarTestemunho, FormData>(apagarTestemunho, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm("Apagar este testemunho?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="inline-flex items-center gap-2 text-sm font-semibold text-erro underline underline-offset-4">
        <Trash2 aria-hidden className="size-4" /> Apagar
      </button>
      {estado.erro && <span className="ml-3 text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}
