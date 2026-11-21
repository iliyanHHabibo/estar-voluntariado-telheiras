"use client";

import { useActionState, useState } from "react";
import { abrirAgora, apagarPeriodo, atualizarPeriodo, avisarVoluntarios, criarPeriodo, fecharAgora, type EstadoAdmin } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

/** Por omissão a recolha de um mês decorre entre os dias 15 e 25 do mês anterior. */
function datasPorOmissao(mes: string): { abre: string; fecha: string } {
  const [a, m] = mes.split("-").map(Number);
  const [ya, ym] = m === 1 ? [a - 1, 12] : [a, m - 1];
  const base = `${ya}-${String(ym).padStart(2, "0")}`;
  return { abre: `${base}-15`, fecha: `${base}-25` };
}

export function NovoPeriodo({ meses }: { meses: { valor: string; rotulo: string }[] }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(criarPeriodo, {});
  const [mes, setMes] = useState(meses[0]?.valor ?? "");
  const omissao = mes ? datasPorOmissao(mes) : { abre: "", fecha: "" };
  const [abre, setAbre] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);

  if (meses.length === 0) return <p className="text-tinta-suave">Já existem períodos para os próximos meses.</p>;

  return (
    <form action={acao} className="flex flex-wrap items-end gap-4">
      <div>
        <Rotulo htmlFor="np-mes">Recolha para o mês de</Rotulo>
        <select
          id="np-mes"
          name="mes"
          value={mes}
          onChange={(e) => {
            setMes(e.target.value);
            setAbre(null);
            setFecha(null);
          }}
          className={`${CAMPO} !w-auto`}
        >
          {meses.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Rotulo htmlFor="np-abre">Abre a</Rotulo>
        <input id="np-abre" name="abre_em" type="date" required value={abre ?? omissao.abre} onChange={(e) => setAbre(e.target.value)} className={`${CAMPO} !w-auto`} />
      </div>
      <div>
        <Rotulo htmlFor="np-fecha">Fecha a</Rotulo>
        <input id="np-fecha" name="fecha_em" type="date" required value={fecha ?? omissao.fecha} onChange={(e) => setFecha(e.target.value)} className={`${CAMPO} !w-auto`} />
      </div>
      <BotaoSubmeter variante="escuro" pendente="A criar…" className="mb-0.5">
        Criar período
      </BotaoSubmeter>
      {estado.erro && (
        <div className="w-full">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.ok && (
        <div className="w-full">
          <Alerta tipo="sucesso">{estado.ok}</Alerta>
        </div>
      )}
    </form>
  );
}

function BotaoPequeno({ acaoServidor, mes, rotulo, perigo }: { acaoServidor: (p: EstadoAdmin, fd: FormData) => Promise<EstadoAdmin>; mes: string; rotulo: string; perigo?: boolean }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(acaoServidor, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (perigo && !confirm("Apagar este período? As disponibilidades que os voluntários já indicaram não se perdem.")) e.preventDefault();
      }}
      className="inline-flex flex-col"
    >
      <input type="hidden" name="mes" value={mes} />
      <button
        type="submit"
        className={`min-h-10 rounded-full border-2 px-4 text-sm font-semibold ${
          perigo ? "border-erro/40 text-erro hover:bg-red-50" : "border-verde text-verde hover:bg-verde hover:text-white"
        }`}
      >
        {rotulo}
      </button>
      {estado.erro && <span className="mt-1 text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}

function AvisarVoluntarios({ mes, avisadosEm, ativos }: { mes: string; avisadosEm: string | null; ativos: number | null }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(avisarVoluntarios, {});
  const pergunta = avisadosEm
    ? `Já avisaste os voluntários a ${new Date(avisadosEm).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}. Enviar outra vez a todos?`
    : `Enviar um email a ${ativos ?? "todos os"} voluntários ativos a dizer que a recolha está aberta?`;
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(pergunta)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="mes" value={mes} />
      <BotaoSubmeter variante="escuro" pendente="A enviar…" className="min-h-10 !py-2 text-sm">
        {avisadosEm ? "Avisar outra vez por email" : "Avisar voluntários por email"}
      </BotaoSubmeter>
      {avisadosEm && !estado.ok && (
        <p className="text-sm text-tinta-suave">
          Avisados a {new Date(avisadosEm).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}.
        </p>
      )}
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      {estado.aviso && <Alerta tipo="aviso">{estado.aviso}</Alerta>}
    </form>
  );
}

export function AcoesPeriodo({
  mes,
  abreEm,
  fechaEm,
  estado,
  avisadosEm,
  ativos,
}: {
  mes: string;
  abreEm: string;
  fechaEm: string;
  estado: "a_abrir" | "aberto" | "fechado";
  avisadosEm: string | null;
  ativos: number | null;
}) {
  const [res, acao] = useActionState<EstadoAdmin, FormData>(atualizarPeriodo, {});
  return (
    <div className="space-y-3">
      {estado === "aberto" && <AvisarVoluntarios mes={mes} avisadosEm={avisadosEm} ativos={ativos} />}
      <div className="flex flex-wrap gap-2">
        {estado !== "aberto" && <BotaoPequeno acaoServidor={abrirAgora} mes={mes} rotulo="Abrir agora" />}
        {estado === "aberto" && <BotaoPequeno acaoServidor={fecharAgora} mes={mes} rotulo="Fechar agora" />}
        <BotaoPequeno acaoServidor={apagarPeriodo} mes={mes} rotulo="Apagar" perigo />
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-verde underline underline-offset-4">Mudar as datas</summary>
        <form action={acao} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="mes" value={mes} />
          <div>
            <Rotulo htmlFor={`ab-${mes}`}>Abre a</Rotulo>
            <input id={`ab-${mes}`} name="abre_em" type="date" required defaultValue={abreEm} className={`${CAMPO} !w-auto`} />
          </div>
          <div>
            <Rotulo htmlFor={`fe-${mes}`}>Fecha a</Rotulo>
            <input id={`fe-${mes}`} name="fecha_em" type="date" required defaultValue={fechaEm} className={`${CAMPO} !w-auto`} />
          </div>
          <BotaoSubmeter variante="escuro" pendente="A guardar…" className="mb-0.5">
            Guardar
          </BotaoSubmeter>
          {res.erro && <div className="w-full"><Alerta tipo="erro">{res.erro}</Alerta></div>}
          {res.ok && <div className="w-full"><Alerta tipo="sucesso">{res.ok}</Alerta></div>}
        </form>
      </details>
    </div>
  );
}
