import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeLisboa, idadeEm } from "@/lib/tempo";
import { conflito, descreverConflito, type EstadoAlocacao, type EstadoVisita, type Ocupacao } from "@/lib/visitas";
import { DetalheVisita, type AlocadoUI, type DisponivelUI, type OutraUI } from "./vista";

export const metadata: Metadata = { title: "Visita" };

export default function Visita({ params }: PageProps<"/admin/visitas/[id]">) {
  return (
    <Suspense fallback={<p>A carregar…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

async function Conteudo({ params }: { params: PageProps<"/admin/visitas/[id]">["params"] }) {
  await exigirAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("visitas")
    .select("id, atividade_id, data, inicio, fim, estado, notas, atividades(nome, morada, min_voluntarios, max_voluntarios)")
    .eq("id", id)
    .maybeSingle();
  if (!v) notFound();

  const hoje = hojeLisboa();
  const ativ = um(v.atividades as Rel<{ nome: string; morada: string | null; min_voluntarios: number; max_voluntarios: number }>);

  const [{ data: aloc }, { data: disp }, { data: todos }, { data: mesmoDia }, { data: atividades }] = await Promise.all([
    supabase
      .from("alocacoes")
      .select("id, estado, presenca, motivo, voluntario_id, voluntarios(nome, telefone, email, data_nascimento, encarregado_nome, encarregado_telefone)")
      .eq("visita_id", id)
      .order("criado_em"),
    supabase.rpc("disponiveis_para_visita", { p_visita: id }),
    supabase.from("voluntarios").select("id, nome, telefone").eq("estado", "ativo").order("nome"),
    // O que cada pessoa já tem nesse dia (para avisar de conflitos)
    supabase
      .from("alocacoes")
      .select("voluntario_id, visitas!inner(id, data, inicio, fim, estado, atividades(nome))")
      .in("estado", ["proposta", "confirmada"])
      .eq("visitas.data", v.data)
      .neq("visitas.estado", "cancelada")
      .neq("visitas.id", id),
    supabase.from("atividades").select("id, nome").eq("ativa", true).order("ordem"),
  ]);

  // voluntário → outras visitas no mesmo dia
  const ocupacoes = new Map<string, Ocupacao[]>();
  for (const o of (mesmoDia ?? []) as unknown as { voluntario_id: string; visitas: Rel<{ inicio: string; fim: string; atividades: Rel<{ nome: string }> }> }[]) {
    const vis = um(o.visitas);
    if (!vis) continue;
    const lista = ocupacoes.get(o.voluntario_id) ?? [];
    lista.push({ inicio: vis.inicio, fim: vis.fim, atividade: um(vis.atividades)?.nome ?? "outra atividade" });
    ocupacoes.set(o.voluntario_id, lista);
  }
  const avisoDe = (voluntarioId: string) => {
    const c = conflito({ inicio: v.inicio as string, fim: v.fim as string }, ocupacoes.get(voluntarioId) ?? []);
    return c ? { texto: descreverConflito(c), grave: c.tipo === "sobrepoe" } : null;
  };

  const alocados: AlocadoUI[] = ((aloc ?? []) as unknown as {
    id: string;
    estado: EstadoAlocacao;
    presenca: "presente" | "faltou" | null;
    motivo: string | null;
    voluntario_id: string;
    voluntarios: Rel<{ nome: string; telefone: string; email: string; data_nascimento: string; encarregado_nome: string | null; encarregado_telefone: string | null }>;
  }[]).map((a) => {
    const p = um(a.voluntarios);
    const menor = p ? idadeEm(p.data_nascimento, v.data as string) < 18 : false;
    return {
      id: a.id,
      estado: a.estado,
      presenca: a.presenca,
      motivo: a.motivo,
      voluntarioId: a.voluntario_id,
      nome: p?.nome ?? "(sem nome)",
      telefone: p?.telefone ?? "",
      email: p?.email ?? "",
      menor,
      encarregado: menor && p ? { nome: p.encarregado_nome, telefone: p.encarregado_telefone } : null,
      aviso: avisoDe(a.voluntario_id),
    };
  });
  const jaNaVisita = new Set(alocados.map((a) => a.voluntarioId));

  const disponiveis: DisponivelUI[] = ((disp ?? []) as {
    voluntario_id: string;
    nome: string;
    telefone: string;
    menor: boolean;
    so_esta_atividade: boolean;
    ja_alocado: boolean;
    visitas_no_mes: number;
  }[])
    .filter((d) => !d.ja_alocado && !jaNaVisita.has(d.voluntario_id))
    .map((d) => ({
      voluntarioId: d.voluntario_id,
      nome: d.nome,
      telefone: d.telefone,
      menor: d.menor,
      soEstaAtividade: d.so_esta_atividade,
      visitasNoMes: d.visitas_no_mes,
      aviso: avisoDe(d.voluntario_id),
    }));
  const jaListados = new Set([...jaNaVisita, ...disponiveis.map((d) => d.voluntarioId)]);
  const outras: OutraUI[] = ((todos ?? []) as { id: string; nome: string; telefone: string }[])
    .filter((t) => !jaListados.has(t.id))
    .map((t) => ({ id: t.id, nome: t.nome, telefone: t.telefone, aviso: avisoDe(t.id) }));

  return (
    <DetalheVisita
      visita={{
        id: v.id as string,
        atividadeId: v.atividade_id as string,
        data: v.data as string,
        inicio: v.inicio as string,
        fim: v.fim as string,
        estado: v.estado as EstadoVisita,
        notas: v.notas as string | null,
        atividade: { nome: ativ?.nome ?? "Visita", morada: ativ?.morada ?? null, min: ativ?.min_voluntarios ?? 2, max: ativ?.max_voluntarios ?? 5 },
      }}
      atividades={atividades ?? []}
      alocados={alocados}
      disponiveis={disponiveis}
      outras={outras}
      hoje={hoje}
    />
  );
}
