"use client";

import { useActionState } from "react";
import { guardarAtividade } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import type { EstadoAdmin } from "@/lib/estado-admin";
import { DIAS_SEMANA_LONGO, hhmm, opcoesDeHora, rotuloHora } from "@/lib/tempo";

export type AtividadeForm = {
  id?: string;
  slug?: string;
  nome: string;
  resumo: string;
  descricao: string;
  morada: string;
  regras: string;
  oQueEsperar: string;
  min: number;
  max: number;
  ordem: number;
  ativa: boolean;
  responsavelNome: string;
  responsavelContacto: string;
  notas: string;
  /** dia da semana (1–7) → horas "HH:MM" */
  horarios: Record<number, { abre: string; fecha: string }>;
};

const HORAS = opcoesDeHora(6 * 60, 22 * 60);

export function FormAtividade({ inicial }: { inicial: AtividadeForm }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(guardarAtividade, {});
  const editar = Boolean(inicial.id);

  return (
    <form action={acao} className="max-w-3xl space-y-10">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <h2 className="titulo text-xl">O que aparece no site</h2>
        <div>
          <Rotulo htmlFor="nome">Nome</Rotulo>
          <input id="nome" name="nome" required minLength={2} maxLength={120} defaultValue={inicial.nome} className={CAMPO} />
          {inicial.slug && <p className="mt-1 text-sm text-tinta-suave">Endereço: /atividades#{inicial.slug} (não muda)</p>}
        </div>
        <div>
          <Rotulo htmlFor="resumo">Resumo (uma frase)</Rotulo>
          <input id="resumo" name="resumo" maxLength={300} defaultValue={inicial.resumo} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="descricao">Descrição</Rotulo>
          <textarea id="descricao" name="descricao" rows={5} maxLength={4000} defaultValue={inicial.descricao} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="morada" opcional>
            Morada
          </Rotulo>
          <input id="morada" name="morada" maxLength={300} defaultValue={inicial.morada} className={CAMPO} placeholder="Se estiver vazia, o site diz que é enviada na confirmação" />
        </div>
        <div>
          <Rotulo htmlFor="o_que_esperar">O que esperar (uma linha por ponto)</Rotulo>
          <textarea id="o_que_esperar" name="o_que_esperar" rows={4} defaultValue={inicial.oQueEsperar} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="regras">Regras desta atividade (uma linha por regra)</Rotulo>
          <textarea id="regras" name="regras" rows={4} defaultValue={inicial.regras} className={CAMPO} />
        </div>
      </section>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <div>
          <h2 className="titulo text-xl">Horário semanal</h2>
          <p className="mt-2 text-tinta-suave">
            Os voluntários só podem indicar disponibilidade nos dias e horas em que a atividade funciona. Mudar isto não altera as
            disponibilidades já indicadas.
          </p>
        </div>
        <ul className="divide-y divide-black/10">
          {DIAS_SEMANA_LONGO.map((nome, i) => {
            const d = i + 1;
            const h = inicial.horarios[d];
            return (
              <li key={d} className="flex flex-wrap items-center gap-4 py-3">
                <label className="flex min-w-48 cursor-pointer items-center gap-3 font-semibold">
                  <input type="checkbox" name={`h${d}_ativo`} defaultChecked={Boolean(h)} className="size-5 accent-verde" />
                  <span className="first-letter:uppercase">{nome}</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  das
                  <select name={`h${d}_abre`} defaultValue={h?.abre ?? "10:00"} className={`${CAMPO} !mt-0 !w-auto`} aria-label={`${nome}: abre`}>
                    {HORAS.map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {rotuloHora(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  às
                  <select name={`h${d}_fecha`} defaultValue={h?.fecha ?? "18:00"} className={`${CAMPO} !mt-0 !w-auto`} aria-label={`${nome}: fecha`}>
                    {HORAS.map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {rotuloHora(t)}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <h2 className="titulo text-xl">Voluntários por visita</h2>
        <p className="text-tinta-suave">Só servem de referência: o planeamento avisa, mas deixa alocar como quiseres.</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <Rotulo htmlFor="min_voluntarios">Mínimo</Rotulo>
            <input id="min_voluntarios" name="min_voluntarios" type="number" min={0} max={50} required defaultValue={inicial.min} className={`${CAMPO} !w-28`} />
          </div>
          <div>
            <Rotulo htmlFor="max_voluntarios">Máximo</Rotulo>
            <input id="max_voluntarios" name="max_voluntarios" type="number" min={0} max={50} required defaultValue={inicial.max} className={`${CAMPO} !w-28`} />
          </div>
          <div>
            <Rotulo htmlFor="ordem">Ordem no site</Rotulo>
            <input id="ordem" name="ordem" type="number" min={0} max={999} required defaultValue={inicial.ordem} className={`${CAMPO} !w-28`} />
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <div>
          <h2 className="titulo text-xl">Responsável do local</h2>
          <p className="mt-2 text-tinta-suave">Só os admins veem isto. Nunca aparece no site.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="responsavel_nome" opcional>
              Nome
            </Rotulo>
            <input id="responsavel_nome" name="responsavel_nome" maxLength={120} defaultValue={inicial.responsavelNome} className={CAMPO} />
          </div>
          <div>
            <Rotulo htmlFor="responsavel_contacto" opcional>
              Telefone ou email
            </Rotulo>
            <input id="responsavel_contacto" name="responsavel_contacto" maxLength={200} defaultValue={inicial.responsavelContacto} className={CAMPO} />
          </div>
        </div>
        <div>
          <Rotulo htmlFor="notas" opcional>
            Notas
          </Rotulo>
          <textarea id="notas" name="notas" rows={3} maxLength={2000} defaultValue={inicial.notas} className={CAMPO} />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 sm:p-8">
        <label className="flex cursor-pointer gap-3">
          <input type="checkbox" name="ativa" defaultChecked={inicial.ativa} className="mt-1 size-5 shrink-0 accent-verde" />
          <span>
            <strong>Ativa.</strong> Aparece no site e os voluntários podem indicar disponibilidade. Desmarca para a esconder (as visitas
            que já existem mantêm-se).
          </span>
        </label>
      </section>

      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      <BotaoSubmeter variante="escuro" pendente="A guardar…">
        {editar ? "Guardar alterações" : "Criar atividade"}
      </BotaoSubmeter>
    </form>
  );
}
