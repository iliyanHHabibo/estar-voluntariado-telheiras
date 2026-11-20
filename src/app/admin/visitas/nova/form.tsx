"use client";

import { useActionState, useState } from "react";
import { criarVisita } from "../actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import type { AtividadeBase, FechoBase, HorarioBase } from "@/lib/disponibilidade";
import { hhmm, opcoesDeHora, rotuloHora, minutos } from "@/lib/tempo";
import { avisosDaVisita, erroDeVisita } from "@/lib/visitas";
import type { EstadoAdmin } from "@/lib/estado-admin";

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const DE = 7 * 60;
const ATE = 22 * 60;

export function NovaVisitaForm({
  atividades,
  horarios,
  fechos,
  hoje,
  dataInicial,
  atividadeInicial,
}: {
  atividades: AtividadeBase[];
  horarios: HorarioBase[];
  fechos: FechoBase[];
  hoje: string;
  dataInicial: string;
  atividadeInicial: string;
}) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(criarVisita, {});
  const [atividade, setAtividade] = useState(atividadeInicial);
  const [data, setData] = useState(dataInicial);
  const [inicioSel, setInicioSel] = useState(14 * 60);
  const [fimSel, setFimSel] = useState<number | null>(null);

  const inicio = clamp(inicioSel, DE, ATE - 60);
  const fim = clamp(fimSel ?? inicio + 60, inicio + 60, ATE);
  const avisos = data
    ? avisosDaVisita({ data, inicio: hhmm(inicio), fim: hhmm(fim), atividadeId: atividade, atividades, horarios, fechos, hoje })
    : [];
  const erro = erroDeVisita(hhmm(inicio), hhmm(fim));

  return (
    <form action={acao} className="max-w-2xl space-y-6 rounded-3xl bg-white p-6 sm:p-8">
      <div>
        <Rotulo htmlFor="nv-atv">Atividade</Rotulo>
        <select id="nv-atv" name="atividade_id" required value={atividade} onChange={(e) => setAtividade(e.target.value)} className={CAMPO}>
          {atividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Rotulo htmlFor="nv-data">Dia</Rotulo>
          <input id="nv-data" name="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} className={`${CAMPO} !w-auto`} />
        </div>
        <div>
          <Rotulo htmlFor="nv-ini">Das</Rotulo>
          <select id="nv-ini" name="inicio" value={hhmm(inicio)} onChange={(e) => setInicioSel(minutos(e.target.value))} className={`${CAMPO} !w-auto`}>
            {opcoesDeHora(DE, ATE - 60).map((t) => (
              <option key={t} value={hhmm(t)}>
                {rotuloHora(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Rotulo htmlFor="nv-fim">Às</Rotulo>
          <select id="nv-fim" name="fim" value={hhmm(fim)} onChange={(e) => setFimSel(minutos(e.target.value))} className={`${CAMPO} !w-auto`}>
            {opcoesDeHora(inicio + 60, ATE).map((t) => (
              <option key={t} value={hhmm(t)}>
                {rotuloHora(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Rotulo htmlFor="nv-notas" opcional>
          Notas (só os admins veem)
        </Rotulo>
        <textarea id="nv-notas" name="notas" rows={2} maxLength={2000} className={CAMPO} placeholder="Ex.: perguntar pela sala 3 à receção" />
      </div>

      {avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.map((a) => (
            <Alerta key={a} tipo="aviso">
              {a} Podes criar na mesma.
            </Alerta>
          ))}
        </div>
      )}
      {(erro || estado.erro) && <Alerta tipo="erro">{erro ?? estado.erro}</Alerta>}

      <BotaoSubmeter variante="escuro" pendente="A criar…">
        Criar visita (fica em rascunho)
      </BotaoSubmeter>
    </form>
  );
}
