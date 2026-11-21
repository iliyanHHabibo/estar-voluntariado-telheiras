import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminParaApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarExcel, TIPO_EXCEL } from "@/lib/excel";
import { COLUNAS_VISITAS, linhasVisitas, prepararVisitas, type VisitaBruta } from "@/lib/exportar";
import { hojeLisboa, mesSeguinte, primeiroDiaDoMes, rotuloMes } from "@/lib/tempo";

/** Ficheiro Excel com as visitas de um mês (?mes=AAAA-MM-01) e quem foi alocado. Só para admins (com 2FA). */
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

    // Fica registado quem exportou dados pessoais e quando (sem os dados). Sem registo, não há ficheiro.
    const reg = await supabase.rpc("registar_exportacao", { p_o_que: "visitas" });
    if (reg.error) {
      console.error("[exportar/visitas] falha a registar:", reg.error.code, reg.error.message);
      return falhou();
    }

    const folha = mes ? `Visitas ${rotuloMes(mes)}` : "Visitas";
    const ficheiro = await gerarExcel(COLUNAS_VISITAS, linhasVisitas(prepararVisitas((data ?? []) as unknown as VisitaBruta[])), folha);
    return new Response(new Uint8Array(ficheiro), {
      headers: {
        "Content-Type": TIPO_EXCEL,
        "Content-Disposition": `attachment; filename="visitas-${mes ? mes.slice(0, 7) : `todas-${hoje}`}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[exportar/visitas] erro inesperado:", e);
    return falhou();
  }
}
