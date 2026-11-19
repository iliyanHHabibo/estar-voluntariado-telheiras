import { NextResponse } from "next/server";
import { obterUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** RGPD: descarregar todos os meus dados em JSON. */
export async function GET() {
  const u = await obterUtilizador();
  if (!u) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("os_meus_dados");
  if (error) return NextResponse.json({ erro: "não foi possível exportar" }, { status: 500 });

  return new NextResponse(JSON.stringify({ email: u.email, exportado_em: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="os-meus-dados-estar.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
