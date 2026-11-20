"use client";

import { useActionState, useState } from "react";
import { moderarTestemunho } from "./actions";
import { Alerta, CAMPO, Rotulo } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";

export type TestemunhoAdmin = {
  id: string;
  estado: "pendente" | "aprovado" | "rejeitado";
  textoOriginal: string;
  textoPublicado: string | null;
  anonimo: boolean;
  nomeExibido: string;
  destaque: boolean;
  autorNome: string;
  autorEmail: string;
  atividade: string | null;
  criadoEm: string;
  revistoEm: string | null;
};

const ESTADOS = {
  pendente: { texto: "À espera de revisão", cor: "bg-amber-100 text-aviso" },
  aprovado: { texto: "Publicado", cor: "bg-green-100 text-verde" },
  rejeitado: { texto: "Não publicado", cor: "bg-cinza text-tinta-suave" },
} as const;

const BOTAO = "inline-flex min-h-11 items-center justify-center rounded-full px-5 font-semibold transition-colors disabled:cursor-wait disabled:opacity-60";

/** Um testemunho para moderar. Todos os botões enviam também o texto que está na caixa. */
export function CartaoTestemunho({ t }: { t: TestemunhoAdmin }) {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(moderarTestemunho, {});
  const [texto, setTexto] = useState(t.textoPublicado ?? t.textoOriginal);
  const editado = texto.trim() !== t.textoOriginal.trim();
  const semAlteracao = texto.trim() === (t.textoPublicado ?? t.textoOriginal).trim();

  return (
    <article className="space-y-4 rounded-3xl bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            {t.autorNome} <span className="text-sm font-normal text-tinta-suave">· {t.autorEmail}</span>
          </p>
          <p className="text-sm text-tinta-suave">
            Aparece como <strong>{t.nomeExibido}</strong>
            {t.atividade ? ` · ${t.atividade}` : ""} · enviado a {t.criadoEm}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {t.destaque && <span className="rounded-full bg-verde px-3 py-1 text-sm font-semibold text-white">Destaque</span>}
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ESTADOS[t.estado].cor}`}>{ESTADOS[t.estado].texto}</span>
        </div>
      </div>

      {editado && (
        <details className="rounded-xl bg-cinza-claro p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Ver o texto original do voluntário</summary>
          <p className="mt-2 whitespace-pre-wrap">{t.textoOriginal}</p>
        </details>
      )}

      <form action={acao} className="space-y-4">
        <input type="hidden" name="id" value={t.id} />
        <div>
          <Rotulo htmlFor={`txt-${t.id}`}>Texto a publicar</Rotulo>
          <textarea
            id={`txt-${t.id}`}
            name="texto_publicado"
            rows={5}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${CAMPO} !mt-1`}
          />
          <p className="mt-1 text-sm text-tinta-suave">
            Tira nomes e dados de utentes. {editado ? "Editaste o texto: o original do voluntário fica guardado." : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {t.estado === "pendente" && (
            <>
              <button type="submit" name="acao" value="aprovar" disabled={pendente} className={`${BOTAO} bg-verde-vivo text-tinta hover:bg-verde-vivo-hover`}>
                Aprovar e publicar
              </button>
              <button type="submit" name="acao" value="rejeitar" disabled={pendente} className={`${BOTAO} border-2 border-erro/40 text-erro hover:bg-red-50`}>
                Rejeitar
              </button>
            </>
          )}
          {t.estado === "aprovado" && (
            <>
              <button type="submit" name="acao" value="guardar" disabled={pendente || semAlteracao} className={`${BOTAO} bg-verde text-white hover:bg-verde-escuro`}>
                Guardar texto
              </button>
              <button type="submit" name="acao" value={t.destaque ? "tirar_destaque" : "destacar"} disabled={pendente} className={`${BOTAO} border-2 border-verde text-verde hover:bg-verde hover:text-white`}>
                {t.destaque ? "Tirar destaque" : "Destacar"}
              </button>
              <button type="submit" name="acao" value="pendente" disabled={pendente} className={`${BOTAO} border-2 border-black/15 hover:bg-cinza`}>
                Tirar do site
              </button>
            </>
          )}
          {t.estado === "rejeitado" && (
            <button type="submit" name="acao" value="pendente" disabled={pendente} className={`${BOTAO} border-2 border-verde text-verde hover:bg-verde hover:text-white`}>
              Voltar a rever
            </button>
          )}
        </div>
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      </form>
    </article>
  );
}
