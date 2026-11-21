"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import { emailEquipa, enviarEmail, urlDoSite } from "@/lib/emails/enviar";
import { emailEquipaResposta } from "@/lib/emails/modelos";

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
  const { perfil } = await exigirVoluntario("/conta/visitas");
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

  // Recusou ou cancelou: avisamos a equipa por email (depois de responder, para não atrasar a pessoa)
  const resposta = r.data.resposta;
  if (resposta !== "confirmada") {
    const { data: a } = await supabase
      .from("alocacoes")
      .select("visita_id, visitas(data, inicio, fim, atividades(nome, morada))")
      .eq("id", r.data.alocacao)
      .maybeSingle();
    const v = a?.visitas as unknown as { data: string; inicio: string; fim: string; atividades: { nome: string; morada: string | null } | null } | null;
    const para = emailEquipa();
    // Limite diário por pessoa (na base de dados), para ninguém encher a caixa da equipa
    const { data: podeAvisar } = a && v && para ? await supabase.rpc("registar_aviso_equipa", { p_tipo: "resposta" }) : { data: false };
    if (a && v && para && podeAvisar === true) {
      const email = emailEquipaResposta({
        voluntario: perfil.nome,
        resposta,
        motivo: r.data.motivo ?? null,
        visita: { atividade: v.atividades?.nome ?? "Visita", morada: v.atividades?.morada ?? null, data: v.data, inicio: v.inicio, fim: v.fim },
        urlVisita: urlDoSite(`/admin/visitas/${a.visita_id}`),
      });
      after(() => enviarEmail({ para }, email, `resposta ${resposta}`).then(() => undefined));
    }
  }

  return {
    ok:
      r.data.resposta === "confirmada"
        ? "Confirmado. Obrigado!"
        : r.data.resposta === "recusada"
          ? "Registado. Vamos alocar outra pessoa."
          : "Visita cancelada. A equipa foi avisada.",
  };
}
