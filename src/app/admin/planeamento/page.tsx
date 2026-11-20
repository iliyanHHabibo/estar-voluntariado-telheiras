import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { diasComJanelas } from "@/lib/disponibilidade";
import { hojeLisboa, mesSeguinte, primeiroDiaDoMes } from "@/lib/tempo";
import type { EstadoVisita } from "@/lib/visitas";
import { contarAlocacoes } from "@/lib/visitas";
import { PlaneamentoMes, type VisitaPlan } from "./vista";

export const metadata: Metadata = { title: "Planeamento" };

export default function Planeamento({ searchParams }: PageProps<"/admin/planeamento">) {
  return (
    <Suspense fallback={<p>A carregar…</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/planeamento">["searchParams"] }) {
  await exigirAdmin();
  const supabase = await createClient();
  const hoje = hojeLisboa();

  // Que mês mostrar? O pedido; senão, o primeiro período aberto ou a abrir; senão, o mês seguinte
  const { mes: mesPedido } = await searchParams;
  let mes = z.iso.date().safeParse(mesPedido).success ? primeiroDiaDoMes(mesPedido as string) : null;
  if (!mes) {
    const { data: p } = await supabase
      .from("periodos_disponibilidade")
      .select("mes")
      .gte("fecha_em", hoje)
      .order("mes")
      .limit(1)
      .maybeSingle();
    mes = (p?.mes as string | undefined) ?? mesSeguinte(hoje);
  }
  const fimDoMes = mesSeguinte(mes);

  const [{ data: visitasBrutas }, { data: disps }, { data: atividades }, { data: horarios }, { data: fechos }, { data: periodo }, { count: ativos }] =
    await Promise.all([
      supabase
        .from("visitas")
        .select("id, data, inicio, fim, estado, atividade_id, atividades(nome, min_voluntarios, max_voluntarios), alocacoes(estado)")
        .gte("data", mes)
        .lt("data", fimDoMes)
        .order("data"),
      supabase.from("disponibilidades").select("voluntario_id, data, atividade_id").gte("data", mes).lt("data", fimDoMes).limit(5000),
      supabase.from("atividades").select("id, nome").eq("ativa", true).order("ordem"),
      supabase.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
      supabase.from("atividade_fechos").select("atividade_id, data, motivo").gte("data", mes).lt("data", fimDoMes),
      supabase.from("periodos_disponibilidade").select("abre_em, fecha_em").eq("mes", mes).maybeSingle(),
      supabase.from("voluntarios").select("*", { count: "exact", head: true }).eq("estado", "ativo"),
    ]);

  const dias = diasComJanelas(mes, atividades ?? [], horarios ?? [], fechos ?? []);

  const visitas: VisitaPlan[] = ((visitasBrutas ?? []) as unknown as {
    id: string;
    data: string;
    inicio: string;
    fim: string;
    estado: EstadoVisita;
    atividade_id: string;
    atividades: Rel<{ nome: string; min_voluntarios: number; max_voluntarios: number }>;
    alocacoes: { estado: string }[] | null;
  }[]).map((v) => {
    const a = um(v.atividades);
    return {
      id: v.id,
      data: v.data,
      inicio: v.inicio,
      fim: v.fim,
      estado: v.estado,
      atividadeId: v.atividade_id,
      atividade: a?.nome ?? "Visita",
      ativas: contarAlocacoes((v.alocacoes ?? []).map((x) => x.estado)).ativas,
      min: a?.min_voluntarios ?? 2,
      max: a?.max_voluntarios ?? 5,
    };
  });

  // Voluntários distintos disponíveis por dia e atividade ("qualquer" conta para todas as que estão abertas)
  const conj = new Map<string, Map<string, Set<string>>>();
  const registar = (data: string, atividade: string, voluntario: string) => {
    if (!conj.has(data)) conj.set(data, new Map());
    const m = conj.get(data)!;
    if (!m.has(atividade)) m.set(atividade, new Set());
    m.get(atividade)!.add(voluntario);
  };
  const abertasNoDia = new Map(dias.map((d) => [d.data, d.janelas.map((j) => j.atividade_id)]));
  const responderam = new Set<string>();
  for (const d of (disps ?? []) as { voluntario_id: string; data: string; atividade_id: string | null }[]) {
    responderam.add(d.voluntario_id);
    if (d.atividade_id) registar(d.data, d.atividade_id, d.voluntario_id);
    else for (const a of abertasNoDia.get(d.data) ?? []) registar(d.data, a, d.voluntario_id);
  }
  const disponiveis: Record<string, Record<string, number>> = {};
  for (const [data, porAtividade] of conj) {
    disponiveis[data] = Object.fromEntries([...porAtividade].map(([a, s]) => [a, s.size]));
  }


  return (
    <PlaneamentoMes
      mes={mes}
      hoje={hoje}
      dias={dias}
      visitas={visitas}
      disponiveis={disponiveis}
      periodo={(periodo as { abre_em: string; fecha_em: string } | null) ?? null}
      voluntarios={{ ativos: ativos ?? 0, responderam: responderam.size }}
    />
  );
}
