import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hojeLisboa } from "@/lib/tempo";
import { contarAlocacoes, lotacao } from "@/lib/visitas";

/**
 * Números para os "badges" da navegação. Todos passam pelas regras RLS: quem não é admin
 * (com 2FA) recebe 0 nas contagens de admin.
 */

/** As minhas visitas comunicadas, ainda por confirmar e que ainda não passaram. */
export async function visitasPorResponder(voluntarioId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("alocacoes")
    .select("id, visitas!inner(estado, data)", { count: "exact", head: true })
    .eq("voluntario_id", voluntarioId) // um admin vê as alocações de todos: contar só as minhas
    .eq("estado", "proposta")
    .eq("visitas.estado", "comunicada")
    .gte("visitas.data", hojeLisboa());
  return count ?? 0;
}

/** Testemunhos à espera de revisão. */
export async function testemunhosPendentes(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("testemunhos").select("id", { count: "exact", head: true }).eq("estado", "pendente");
  return count ?? 0;
}

/**
 * Visitas já combinadas com o responsável (ou comunicadas), ainda por acontecer, com menos pessoas
 * do que o mínimo da atividade — p.ex. porque alguém disse que não podia.
 */
export async function visitasComFalta(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visitas")
    .select("id, atividades(min_voluntarios, max_voluntarios), alocacoes(estado)")
    .in("estado", ["confirmada_responsavel", "comunicada"])
    .gte("data", hojeLisboa())
    .limit(500);
  type Linha = { atividades: { min_voluntarios: number; max_voluntarios: number } | null; alocacoes: { estado: string }[] | null };
  return ((data ?? []) as unknown as Linha[]).filter((v) => {
    const ativas = contarAlocacoes((v.alocacoes ?? []).map((a) => a.estado)).ativas;
    return lotacao(ativas, v.atividades?.min_voluntarios ?? 0, v.atividades?.max_voluntarios ?? 99).estado === "falta";
  }).length;
}
