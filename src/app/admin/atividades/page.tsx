import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { descreverHorario } from "@/lib/horario";
import { dataCurta, hojeLisboa } from "@/lib/tempo";
import { NovoFecho, RemoverFecho } from "./fechos";
import { Alerta } from "@/components/forms";

export const metadata: Metadata = { title: "Atividades" };

export default async function Atividades({ searchParams }: PageProps<"/admin/atividades">) {
  await exigirAdmin();
  const { apagada } = await searchParams;
  const supabase = await createClient();
  const hoje = hojeLisboa();
  const [{ data: atividades }, { data: horarios }, { data: fechos }] = await Promise.all([
    supabase.from("atividades").select("id, nome, resumo, ativa, min_voluntarios, max_voluntarios, ordem").order("ordem").order("nome"),
    supabase.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
    supabase.from("atividade_fechos").select("id, atividade_id, data, motivo").gte("data", hoje).order("data").limit(100),
  ]);

  const nomeDe = new Map((atividades ?? []).map((a) => [a.id as string, a.nome as string]));
  const ativas = (atividades ?? []).filter((a) => a.ativa).map((a) => ({ id: a.id as string, nome: a.nome as string }));

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="titulo text-3xl">Atividades</h1>
          <p className="mt-2 text-tinta-suave">O que aparece no site, os horários e os feriados. As alterações aparecem logo.</p>
        </div>
        <Link href="/admin/atividades/nova" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-verde px-5 font-semibold text-white hover:bg-verde-escuro">
          <Plus aria-hidden className="size-5" /> Nova atividade
        </Link>
      </div>

      {apagada && <Alerta tipo="sucesso">Atividade apagada.</Alerta>}

      <section className="space-y-4">
        {(atividades ?? []).map((a) => (
          <article key={a.id as string} className="flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-white p-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold">{a.nome as string}</h2>
                {!a.ativa && <span className="rounded-full bg-cinza px-3 py-1 text-sm font-semibold text-tinta-suave">Escondida</span>}
              </div>
              <p className="text-tinta-suave">{a.resumo as string}</p>
              <p>
                {descreverHorario((horarios ?? []).filter((h) => h.atividade_id === a.id))} · {a.min_voluntarios as number} a {a.max_voluntarios as number} voluntários
              </p>
            </div>
            <Link href={`/admin/atividades/${a.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-verde px-5 font-semibold text-verde hover:bg-verde hover:text-white">
              <Pencil aria-hidden className="size-4" /> Editar
            </Link>
          </article>
        ))}
      </section>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <div>
          <h2 className="titulo text-xl">Feriados e dias de fecho</h2>
          <p className="mt-2 text-tinta-suave">
            Nestes dias a atividade não aparece para os voluntários indicarem disponibilidade, e o planeamento avisa. Os feriados
            nacionais até 2027 já vêm preenchidos para o Centro de Dia.
          </p>
        </div>
        <NovoFecho atividades={ativas} />
        {(fechos ?? []).length === 0 ? (
          <p className="text-tinta-suave">Não há fechos marcados daqui para a frente.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {(fechos ?? []).map((f) => (
              <li key={f.id as string} className="flex items-center justify-between gap-4 py-2">
                <span>
                  <strong>{dataCurta(f.data as string)}</strong> · {(f.motivo as string | null) ?? "Fechado"} ·{" "}
                  <span className="text-tinta-suave">{f.atividade_id ? `${nomeDe.get(f.atividade_id as string) ?? "?"} fechado` : "tudo fechado"}</span>
                </span>
                <RemoverFecho id={f.id as string} descricao={dataCurta(f.data as string)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
