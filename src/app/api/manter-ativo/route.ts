import { connection } from "next/server";
import { clientePublico } from "@/lib/supabase/publico";

/**
 * Chamado uma vez por dia pelo Vercel (ver vercel.json). O Supabase grátis "adormece" um projeto
 * ao fim de 7 dias sem uso; uma leitura pública por dia evita isso (útil no verão ou nas férias).
 * Só lê o que já é público (os nomes das atividades). Se CRON_SECRET existir, só o Vercel o pode chamar.
 */
export async function GET(req: Request) {
  await connection();
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não encontrado", { status: 404 });
  }
  const { error } = await clientePublico().from("atividades").select("id").limit(1);
  if (error) {
    console.error("[manter-ativo] falhou:", error.code, error.message);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
