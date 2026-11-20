import { adminParaApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { CABECALHO_VOLUNTARIOS, linhasVoluntarios } from "@/lib/exportar";
import { hojeLisboa, idadeEm } from "@/lib/tempo";
import { estatisticaVazia, estatisticasPorVoluntario, type AlocacaoParaEstatistica } from "@/lib/voluntarios";

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

/** Ficheiro CSV (abre no Excel) com todos os voluntários. Só para admins (com 2FA). */
export async function GET() {
  if (!(await adminParaApi())) return new Response("Não encontrado", { status: 404 });

  const supabase = await createClient();
  const hoje = hojeLisboa();
  const [{ data: vols, error }, { data: interesses }, { data: aloc }] = await Promise.all([
    supabase
      .from("voluntarios")
      .select("id, nome, email, telefone, data_nascimento, estado, encarregado_nome, encarregado_telefone, encarregado_email, criado_em")
      .order("nome")
      .limit(5000),
    supabase.from("voluntario_interesses").select("voluntario_id, atividades(nome)").limit(20000),
    supabase.from("alocacoes").select("voluntario_id, estado, presenca, visitas!inner(data, inicio, fim, estado)").limit(20000),
  ]);
  if (error) return new Response("Não foi possível gerar o ficheiro.", { status: 500 });

  const stats = estatisticasPorVoluntario(
    ((aloc ?? []) as unknown as { voluntario_id: string; estado: string; presenca: string | null; visitas: Rel<AlocacaoParaEstatistica["visita"]> }[])
      .map((a) => ({ voluntario_id: a.voluntario_id, estado: a.estado, presenca: a.presenca, visita: um(a.visitas)! }))
      .filter((a) => a.visita),
    hoje,
  );
  const interessesDe = new Map<string, string[]>();
  for (const i of (interesses ?? []) as unknown as { voluntario_id: string; atividades: Rel<{ nome: string }> }[]) {
    const nome = um(i.atividades)?.nome;
    if (nome) interessesDe.set(i.voluntario_id, [...(interessesDe.get(i.voluntario_id) ?? []), nome]);
  }

  const csv = gerarCsv(
    CABECALHO_VOLUNTARIOS,
    linhasVoluntarios(
      (vols ?? []).map((v) => ({
        nome: v.nome as string,
        email: v.email as string,
        telefone: v.telefone as string,
        data_nascimento: v.data_nascimento as string,
        idade: idadeEm(v.data_nascimento as string, hoje),
        estado: v.estado as string,
        encarregado_nome: v.encarregado_nome as string | null,
        encarregado_telefone: v.encarregado_telefone as string | null,
        encarregado_email: v.encarregado_email as string | null,
        criado_em: v.criado_em as string,
        interesses: interessesDe.get(v.id as string) ?? [],
        stats: stats.get(v.id as string) ?? estatisticaVazia(),
      })),
    ),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voluntarios-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
