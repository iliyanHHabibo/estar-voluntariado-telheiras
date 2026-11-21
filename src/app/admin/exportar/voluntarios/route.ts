import { NextResponse, type NextRequest } from "next/server";
import { adminParaApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarExcel, TIPO_EXCEL } from "@/lib/excel";
import { COLUNAS_VOLUNTARIOS, linhasVoluntarios, prepararVoluntarios, type AlocacaoBruta, type InteresseBruto, type VoluntarioBruto } from "@/lib/exportar";
import { hojeLisboa } from "@/lib/tempo";

/** Ficheiro Excel com todos os voluntários. Só para admins (com 2FA). */
export async function GET(req: NextRequest) {
  if (!(await adminParaApi())) return new Response("Não encontrado", { status: 404 });

  // Se algo falhar, voltamos à lista com um aviso (em vez de uma página de erro do browser)
  const falhou = () => NextResponse.redirect(new URL("/admin/voluntarios?erro=exportar", req.url));

  try {
    const supabase = await createClient();
    const hoje = hojeLisboa();
    const [vols, interesses, aloc] = await Promise.all([
      supabase
        .from("voluntarios")
        .select("id, nome, email, telefone, data_nascimento, estado, encarregado_nome, encarregado_telefone, encarregado_email, criado_em")
        .order("nome")
        .limit(5000),
      supabase.from("voluntario_interesses").select("voluntario_id, atividades(nome)").limit(20000),
      supabase.from("alocacoes").select("voluntario_id, estado, presenca, visitas!inner(data, inicio, fim, estado)").limit(20000),
    ]);

    // Se alguma leitura falhar, não geramos um ficheiro incompleto
    for (const [nome, r] of [["voluntarios", vols], ["interesses", interesses], ["alocacoes", aloc]] as const) {
      if (r.error) {
        console.error(`[exportar/voluntarios] falha a ler ${nome}:`, r.error.code, r.error.message);
        return falhou();
      }
    }

    const linhas = prepararVoluntarios(
      (vols.data ?? []) as unknown as VoluntarioBruto[],
      (interesses.data ?? []) as unknown as InteresseBruto[],
      (aloc.data ?? []) as unknown as AlocacaoBruta[],
      hoje,
    );

    const ficheiro = await gerarExcel(COLUNAS_VOLUNTARIOS, linhasVoluntarios(linhas), "Voluntários");
    return new Response(new Uint8Array(ficheiro), {
      headers: {
        "Content-Type": TIPO_EXCEL,
        "Content-Disposition": `attachment; filename="voluntarios-${hoje}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[exportar/voluntarios] erro inesperado:", e);
    return falhou();
  }
}
