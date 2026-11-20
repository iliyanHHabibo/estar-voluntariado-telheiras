import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminParaApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { CABECALHO_VISITAS, linhasVisitas, type VisitaParaExportar } from "@/lib/exportar";
import { hojeLisboa, mesSeguinte, primeiroDiaDoMes } from "@/lib/tempo";

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

/** Ficheiro CSV (abre no Excel) com as visitas de um mês (?mes=AAAA-MM-01) e quem foi alocado. Só para admins (com 2FA). */
export async function GET(req: NextRequest) {
  if (!(await adminParaApi())) return new Response("Não encontrado", { status: 404 });

  const hoje = hojeLisboa();
  const pedido = z.iso.date().safeParse(req.nextUrl.searchParams.get("mes"));
  const mes = pedido.success ? primeiroDiaDoMes(pedido.data) : null;

  const supabase = await createClient();
  let q = supabase
    .from("visitas")
    .select("data, inicio, fim, estado, atividades(nome), alocacoes(estado, presenca, motivo, voluntarios(nome, telefone, email))")
    .order("data")
    .limit(5000);
  if (mes) q = q.gte("data", mes).lt("data", mesSeguinte(mes));
  const { data, error } = await q;
  if (error) return new Response("Não foi possível gerar o ficheiro.", { status: 500 });

  const visitas: VisitaParaExportar[] = ((data ?? []) as unknown as {
    data: string;
    inicio: string;
    fim: string;
    estado: VisitaParaExportar["estado"];
    atividades: Rel<{ nome: string }>;
    alocacoes: { estado: VisitaParaExportar["alocacoes"][number]["estado"]; presenca: string | null; motivo: string | null; voluntarios: Rel<{ nome: string; telefone: string; email: string }> }[] | null;
  }[]).map((v) => ({
    data: v.data,
    inicio: v.inicio,
    fim: v.fim,
    estado: v.estado,
    atividade: um(v.atividades)?.nome ?? "Visita",
    alocacoes: (v.alocacoes ?? []).map((a) => ({
      nome: um(a.voluntarios)?.nome ?? "(conta apagada)",
      telefone: um(a.voluntarios)?.telefone ?? "",
      email: um(a.voluntarios)?.email ?? "",
      estado: a.estado,
      presenca: a.presenca,
      motivo: a.motivo,
    })),
  }));

  return new Response(gerarCsv(CABECALHO_VISITAS, linhasVisitas(visitas)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitas-${mes ? mes.slice(0, 7) : "todas-" + hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
