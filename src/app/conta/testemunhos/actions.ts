"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";

export type EstadoTestemunho = { ok?: string; erro?: string; campos?: { texto?: string; atividade_id?: string; anonimo?: boolean } };

const schema = z.object({
  texto: z.string().trim().min(20, "Escreve pelo menos 20 letras.").max(2000, "No máximo 2000 letras."),
  atividade_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
  anonimo: z.boolean(),
  consentimento: z.literal(true, "Tens de autorizar a publicação para enviares o testemunho."),
});

export async function enviarTestemunho(_prev: EstadoTestemunho, fd: FormData): Promise<EstadoTestemunho> {
  const { u } = await exigirVoluntario("/conta/testemunhos");
  const bruto = {
    texto: String(fd.get("texto") ?? ""),
    atividade_id: String(fd.get("atividade_id") ?? ""),
    anonimo: fd.get("anonimo") === "on",
    consentimento: fd.get("consentimento") === "on",
  };
  const campos = { texto: bruto.texto, atividade_id: bruto.atividade_id, anonimo: bruto.anonimo };

  const r = schema.safeParse(bruto);
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica o texto.", campos };

  const supabase = await createClient();
  const { error } = await supabase.from("testemunhos").insert({
    autor_id: u.id,
    texto: r.data.texto,
    atividade_id: r.data.atividade_id,
    anonimo: r.data.anonimo,
    consentimento_publicacao: true,
  });
  if (error) {
    console.error("[testemunhos] enviar:", error.code, error.message);
    return { erro: mensagemDeErro(error, "Não foi possível enviar. Tenta outra vez."), campos };
  }
  revalidatePath("/conta/testemunhos");
  return { ok: "Obrigado por partilhares! A equipa vai ler o teu testemunho e decidir se o publica no site." };
}

export type EstadoApagarTestemunho = { erro?: string };

export async function apagarTestemunho(_prev: EstadoApagarTestemunho, fd: FormData): Promise<EstadoApagarTestemunho> {
  await exigirVoluntario("/conta/testemunhos");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  // As regras RLS só deixam apagar os teus, e só enquanto estão à espera de revisão
  const { data, error } = await supabase.from("testemunhos").delete().eq("id", id.data).select("id");
  if (error) return { erro: mensagemDeErro(error) };
  if (!data?.length) return { erro: "Já não é possível apagar este testemunho." };
  revalidatePath("/conta/testemunhos");
  return {};
}
