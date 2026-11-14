"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";

export type EstadoAdmins = { erro?: string; ok?: string };

export async function adicionarAdmin(_prev: EstadoAdmins, formData: FormData): Promise<EstadoAdmins> {
  await exigirAdmin();
  const email = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { erro: "Escreve um email válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adicionar_admin", { p_email: email.data });
  if (error) return { erro: mensagemDeErro(error) };
  revalidatePath("/admin/admins");
  return { ok: `${email.data} é agora admin. Na próxima vez que entrar, vai configurar o 2FA.` };
}

export async function removerAdmin(_prev: EstadoAdmins, formData: FormData): Promise<EstadoAdmins> {
  await exigirAdmin();
  const id = z.uuid().safeParse(formData.get("user_id"));
  if (!id.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remover_admin", { p_user_id: id.data });
  if (error) return { erro: mensagemDeErro(error) };
  revalidatePath("/admin/admins");
  return { ok: "Admin removido." };
}
