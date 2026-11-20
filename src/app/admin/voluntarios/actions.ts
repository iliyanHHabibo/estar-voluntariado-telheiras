"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import type { EstadoAdmin } from "@/lib/estado-admin";

const telefone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{9,15}$/, "Telefone inválido."));
const opcional = <T extends z.ZodType>(s: T) => z.union([z.literal(""), s]).transform((v) => (v === "" ? null : v));

const editarSchema = z.object({
  id: z.uuid(),
  nome: z.string().trim().min(2, "O nome tem de ter pelo menos 2 letras.").max(120),
  telefone,
  encarregado_nome: z.string().trim().max(120, "O nome do encarregado é demasiado longo.").transform((v) => v || null),
  encarregado_telefone: opcional(telefone),
  encarregado_email: opcional(z.email("Email do encarregado inválido.").max(254)),
});

function atualizar(id: string) {
  revalidatePath(`/admin/voluntarios/${id}`);
  revalidatePath("/admin/voluntarios");
  revalidatePath("/admin");
}

export async function atualizarVoluntario(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = editarSchema.safeParse({
    id: fd.get("id"),
    nome: fd.get("nome") ?? "",
    telefone: fd.get("telefone") ?? "",
    encarregado_nome: fd.get("encarregado_nome") ?? "",
    encarregado_telefone: fd.get("encarregado_telefone") ?? "",
    encarregado_email: fd.get("encarregado_email") ?? "",
  });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica os dados." };
  const { id, ...campos } = r.data;

  const supabase = await createClient();
  const { data, error } = await supabase.from("voluntarios").update(campos).eq("id", id).select("id");
  if (error) {
    console.error("[voluntarios] atualizar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  if (!data?.length) return { erro: "Voluntário não encontrado." };
  atualizar(id);
  return { ok: "Dados guardados." };
}

const estadoSchema = z.object({ id: z.uuid(), estado: z.enum(["ativo", "inativo"]) });

export async function mudarEstadoVoluntario(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = estadoSchema.safeParse({ id: fd.get("id"), estado: fd.get("estado") });
  if (!r.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("voluntarios").update({ estado: r.data.estado }).eq("id", r.data.id).select("id");
  if (error) return { erro: mensagemDeErro(error) };
  if (!data?.length) return { erro: "Voluntário não encontrado." };
  atualizar(r.data.id);
  return { ok: r.data.estado === "ativo" ? "Reativado." : "Desativado." };
}

const notaSchema = z.object({ voluntario_id: z.uuid(), texto: z.string().trim().min(1, "Escreve a nota.").max(2000, "A nota é demasiado longa.") });

export async function adicionarNota(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = notaSchema.safeParse({ voluntario_id: fd.get("voluntario_id"), texto: fd.get("texto") ?? "" });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica a nota." };
  const supabase = await createClient();
  const { error } = await supabase.from("notas_admin").insert(r.data);
  if (error) {
    console.error("[voluntarios] nota:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizar(r.data.voluntario_id);
  return { ok: "Nota guardada." };
}

const apagarNotaSchema = z.object({ id: z.uuid(), voluntario_id: z.uuid() });

export async function apagarNota(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = apagarNotaSchema.safeParse({ id: fd.get("id"), voluntario_id: fd.get("voluntario_id") });
  if (!r.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("notas_admin").delete().eq("id", r.data.id);
  if (error) return { erro: mensagemDeErro(error) };
  atualizar(r.data.voluntario_id);
  return { ok: "Nota apagada." };
}
