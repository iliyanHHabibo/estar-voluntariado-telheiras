import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminParaApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { CABECALHO_VISITAS, linhasVisitas, prepararVisitas, type VisitaBruta } from "@/lib/exportar";
import { hojeLisboa, mesSeguinte, primeiroDiaDoMes } from "@/lib/tempo";

/** Ficheiro CSV (abre no Excel) com as visitas de um mês (?mes=AAAA-MM-01) e quem foi alocado. Só para admins (com 2FA). */
export async function GET(req: NextRequest) {
  if (!(await adminParaApi())) return new Response("Não encontrado", { status: 404 });

  const pedido = z.iso.date().safeParse(req.nextUrl.searchParams.get("mes"));
  const mes = pedido.success ? primeiroDiaDoMes(pedido.data) : null;
  const falhou = () => NextResponse.redirect(new URL(`/admin/planeamento?${mes ? `mes=${mes}&` : ""}erro=exportar`, req.url));

  try {
    const hoje = hojeLisboa();
    const supabase = await createClient();
    let q = supabase
      .from("visitas")
      .select("data, inicio, fim, estado, atividades(nome), alocacoes(estado, presenca, motivo, voluntarios(nome, telefone, email))")
      .order("data")
      .limit(5000);
    if (mes) q = q.gte("data", mes).lt("data", mesSeguinte(mes));
    const { data, error } = await q;
    if (error) {
      console.error("[exportar/visitas] falha a ler as visitas:", error.code, error.message);
      return falhou();
    }

    const csv = gerarCsv(CABECALHO_VISITAS, linhasVisitas(prepararVisitas((data ?? []) as unknown as VisitaBruta[])));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="visitas-${mes ? mes.slice(0, 7) : `todas-${hoje}`}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[exportar/visitas] erro inesperado:", e);
    return falhou();
  }
}
