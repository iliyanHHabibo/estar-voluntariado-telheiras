"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import type { EstadoAdmin } from "@/lib/estado-admin";

const schema = z.object({
  id: z.uuid(),
  acao: z.enum(["aprovar", "rejeitar", "pendente", "guardar", "destacar", "tirar_destaque"]),
  texto_publicado: z.string().optional(),
});
const textoSchema = z.string().trim().min(20, "O texto a publicar tem de ter pelo menos 20 letras.").max(2000, "O texto a publicar é demasiado longo.");

/** Moderação de um testemunho: aprovar (com o texto que o admin editou), rejeitar, destacar… */
export async function moderarTestemunho(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = schema.safeParse({
    id: fd.get("id"),
    acao: fd.get("acao"),
    texto_publicado: fd.get("texto_publicado") ? String(fd.get("texto_publicado")) : undefined,
  });
  if (!r.success) return { erro: "Pedido inválido." };
  const { id, acao } = r.data;

  // O texto só interessa (e só se valida) quando vai ser publicado ou guardado
  let texto_publicado: string | undefined;
  if (acao === "aprovar" || acao === "guardar") {
    const t = textoSchema.safeParse(r.data.texto_publicado ?? "");
    if (!t.success) return { erro: t.error.issues[0]?.message ?? "Verifica o texto." };
    texto_publicado = t.data;
  }

  // O que muda em cada ação. (O texto ORIGINAL do voluntário nunca se altera: a base de dados garante-o.)
  let alteracoes: Record<string, unknown>;
  switch (acao) {
    case "aprovar":
      alteracoes = { estado: "aprovado", texto_publicado };
      break;
    case "guardar":
      alteracoes = { texto_publicado };
      break;
    case "rejeitar":
      alteracoes = { estado: "rejeitado", destaque: false };
      break;
    case "pendente":
      alteracoes = { estado: "pendente", destaque: false };
      break;
    case "destacar":
      alteracoes = { destaque: true };
      break;
    case "tirar_destaque":
      alteracoes = { destaque: false };
      break;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("testemunhos").update(alteracoes).eq("id", id).select("id");
  if (error) {
    console.error("[testemunhos] moderar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  if (!data?.length) return { erro: "Testemunho não encontrado." };

  // As páginas públicas passam a mostrar a alteração já
  updateTag("testemunhos");
  revalidatePath("/admin/testemunhos");
  revalidatePath("/admin");
  const mensagens = {
    aprovar: "Aprovado e publicado no site.",
    guardar: "Texto guardado.",
    rejeitar: "Rejeitado: não aparece no site.",
    pendente: "Voltou a estar à espera de revisão.",
    destacar: "Destacado: aparece primeiro.",
    tirar_destaque: "Já não está destacado.",
  } as const;
  return { ok: mensagens[acao] };
}
