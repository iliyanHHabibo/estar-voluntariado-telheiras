import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarIcs } from "@/lib/ics";

/** Descarrega o ficheiro .ics (calendário do iPhone, Android ou computador) de uma das minhas visitas. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/conta/visitas/[id]/calendario">) {
  const u = await obterUtilizador();
  if (!u) return new Response("Sem sessão", { status: 401 });

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Não encontrado", { status: 404 });

  // Só lê as visitas do próprio (as regras RLS garantem-no, mesmo que alguém mude o id)
  const supabase = await createClient();
  const { data } = await supabase
    .from("alocacoes")
    .select("id, estado, visitas!inner(data, inicio, fim, estado, atividades(nome, morada))")
    .eq("id", id)
    .eq("voluntario_id", u.id)
    .maybeSingle();

  const v = data?.visitas as unknown as
    | { data: string; inicio: string; fim: string; estado: string; atividades: { nome: string; morada: string | null } | null }
    | undefined;
  if (!data || !v || v.estado === "cancelada" || !["proposta", "confirmada"].includes(data.estado as string)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const nome = v.atividades?.nome ?? "Visita";
  const ics = gerarIcs({
    uid: data.id as string,
    titulo: `ESTAR — ${nome}`,
    data: v.data,
    inicio: v.inicio,
    fim: v.fim,
    local: v.atividades?.morada,
    descricao: "Visita de voluntariado ESTAR. Se não puderes ir, avisa a equipa o mais cedo possível.",
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visita-estar.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
