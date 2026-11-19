"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";

export type EstadoVisita = { ok?: string; erro?: string };

const schema = z.object({
  alocacao: z.uuid(),
  resposta: z.enum(["confirmada", "recusada", "cancelada"]),
  motivo: z.string().trim().max(500).optional(),
});

/**
 * Confirmar, recusar ou cancelar uma visita. As regras (quem pode fazer o quê, e até quando)
 * vivem na base de dados (função responder_alocacao): aqui só pedimos e traduzimos o resultado.
 */
export async function responderVisita(_prev: EstadoVisita, fd: FormData): Promise<EstadoVisita> {
  await exigirVoluntario("/conta/visitas");
  const r = schema.safeParse({
    alocacao: fd.get("alocacao"),
    resposta: fd.get("resposta"),
    motivo: (fd.get("motivo") as string | null) || undefined,
  });
  if (!r.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("responder_alocacao", {
    p_alocacao: r.data.alocacao,
    p_resposta: r.data.resposta,
    p_motivo: r.data.motivo ?? null,
  });
  if (error) {
    console.error("[visitas] responder:", error.code, error.message);
    return { erro: mensagemDeErro(error, "Não foi possível guardar a resposta. Tenta outra vez.") };
  }
  revalidatePath("/conta/visitas");
  revalidatePath("/conta");
  return {
    ok:
      r.data.resposta === "confirmada"
        ? "Confirmado. Obrigado!"
        : r.data.resposta === "recusada"
          ? "Registado. Vamos alocar outra pessoa."
          : "Visita cancelada. A equipa foi avisada.",
  };
}
