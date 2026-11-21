"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import type { EstadoAdmin } from "@/lib/estado-admin";
import { hojeLisboa } from "@/lib/tempo";
import { contarAlocacoes, erroDeVisita, motivoParaNaoMudar, type EstadoVisita } from "@/lib/visitas";
import {
  avisarAlocados,
  avisarAlteracao,
  avisarCancelamento,
  avisarRemocao,
  lerVisitaParaEmail,
  mudouParaOsVoluntarios,
  resumoDoEnvio,
} from "@/lib/emails/avisos-visitas";

/** Junta a mensagem principal com o resultado do envio de emails. */
function comEnvio(ok: string, envio?: { ok?: string; aviso?: string }): EstadoAdmin {
  return { ok: envio?.ok ? `${ok} ${envio.ok}` : ok, aviso: envio?.aviso };
}

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");
const visitaSchema = z.object({
  atividade_id: z.uuid("Escolhe a atividade."),
  data: z.iso.date("Escolhe o dia."),
  inicio: hora,
  fim: hora,
  notas: z
    .string()
    .trim()
    .max(2000, "As notas são demasiado longas.")
    .transform((v) => v || null),
});

function atualizarEcras(id?: string) {
  revalidatePath("/admin/planeamento");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/visitas/${id}`);
  // O que os voluntários veem
  revalidatePath("/conta/visitas");
  revalidatePath("/conta");
}

function lerVisita(fd: FormData) {
  return visitaSchema.safeParse({
    atividade_id: fd.get("atividade_id"),
    data: fd.get("data"),
    inicio: fd.get("inicio"),
    fim: fd.get("fim"),
    notas: fd.get("notas") ?? "",
  });
}

// ------------------------------------------------------------------ criar / editar / apagar
export async function criarVisita(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = lerVisita(fd);
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica os dados." };
  const e = erroDeVisita(r.data.inicio, r.data.fim);
  if (e) return { erro: e };

  const supabase = await createClient();
  const { data, error } = await supabase.from("visitas").insert(r.data).select("id").single();
  if (error || !data) {
    console.error("[visitas] criar:", error?.code, error?.message);
    return { erro: mensagemDeErro(error, "Não foi possível criar a visita.") };
  }
  atualizarEcras();
  redirect(`/admin/visitas/${data.id}`);
}

export async function atualizarVisita(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  const r = lerVisita(fd);
  if (!id.success) return { erro: "Pedido inválido." };
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica os dados." };
  const e = erroDeVisita(r.data.inicio, r.data.fim);
  if (e) return { erro: e };

  const supabase = await createClient();
  const antes = await lerVisitaParaEmail(supabase, id.data);
  const { error } = await supabase.from("visitas").update(r.data).eq("id", id.data);
  if (error) {
    console.error("[visitas] atualizar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras(id.data);
  // Se os voluntários já sabiam da visita e mudou o dia, a hora ou o local, avisamo-los
  if (antes?.estado === "comunicada") {
    const depois = await lerVisitaParaEmail(supabase, id.data);
    if (depois && mudouParaOsVoluntarios(antes.visita, depois.visita)) {
      return comEnvio("Alterações guardadas.", resumoDoEnvio(await avisarAlteracao(supabase, id.data, antes.visita)));
    }
  }
  return { ok: "Alterações guardadas." };
}

export async function apagarVisita(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { data: v } = await supabase.from("visitas").select("estado").eq("id", id.data).maybeSingle();
  if (!v) return { erro: "Visita não encontrada." };
  // Uma visita que os voluntários já viram ou que já aconteceu cancela-se (fica o registo), não se apaga
  if (v.estado !== "rascunho" && v.estado !== "cancelada") {
    return { erro: "Só se apagam visitas em rascunho ou canceladas. Para as outras, usa “Cancelar visita”." };
  }
  const { error } = await supabase.from("visitas").delete().eq("id", id.data);
  if (error) {
    console.error("[visitas] apagar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras();
  redirect("/admin/planeamento");
}

// ------------------------------------------------------------------ mudar de estado
const estadoSchema = z.object({
  id: z.uuid(),
  para: z.enum(["rascunho", "confirmada_responsavel", "comunicada", "realizada", "cancelada"]),
});

export async function mudarEstadoVisita(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = estadoSchema.safeParse({ id: fd.get("id"), para: fd.get("para") });
  if (!r.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("visitas")
    .select("estado, data, alocacoes(estado)")
    .eq("id", r.data.id)
    .maybeSingle();
  if (!v) return { erro: "Visita não encontrada." };

  const ativas = contarAlocacoes(((v.alocacoes ?? []) as { estado: string }[]).map((a) => a.estado)).ativas;
  const motivo = motivoParaNaoMudar({
    de: v.estado as EstadoVisita,
    para: r.data.para,
    data: v.data as string,
    hoje: hojeLisboa(),
    alocacoesAtivas: ativas,
  });
  if (motivo) return { erro: motivo };

  const { error } = await supabase.from("visitas").update({ estado: r.data.para }).eq("id", r.data.id);
  if (error) {
    console.error("[visitas] estado:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras(r.data.id);
  if (r.data.para === "comunicada") {
    return comEnvio("Visita comunicada.", resumoDoEnvio(await avisarAlocados(supabase, r.data.id)));
  }
  if (r.data.para === "cancelada") {
    const envio = await avisarCancelamento(supabase, r.data.id);
    return comEnvio("Visita cancelada.", envio.enviados || envio.falhados ? resumoDoEnvio(envio) : undefined);
  }
  return { ok: "Estado atualizado." };
}

// ------------------------------------------------------------------ alocar / remover / presença
const alocarSchema = z.object({ visita_id: z.uuid(), voluntario_id: z.uuid() });

export async function alocarVoluntario(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = alocarSchema.safeParse({ visita_id: fd.get("visita_id"), voluntario_id: fd.get("voluntario_id") });
  if (!r.success) return { erro: "Escolhe uma pessoa." };

  const supabase = await createClient();
  const [{ data: v }, { data: p }, { data: existente }] = await Promise.all([
    supabase.from("visitas").select("estado").eq("id", r.data.visita_id).maybeSingle(),
    supabase.from("voluntarios").select("estado").eq("id", r.data.voluntario_id).maybeSingle(),
    supabase.from("alocacoes").select("id, estado").eq("visita_id", r.data.visita_id).eq("voluntario_id", r.data.voluntario_id).maybeSingle(),
  ]);
  if (!v) return { erro: "Visita não encontrada." };
  if (v.estado === "cancelada" || v.estado === "realizada") return { erro: "Esta visita já não aceita alterações." };
  if (!p || p.estado !== "ativo") return { erro: "Essa pessoa não está ativa." };

  let alocacaoId: string;
  if (existente) {
    if (existente.estado === "proposta" || existente.estado === "confirmada") return { erro: "Essa pessoa já está alocada a esta visita." };
    // Tinha recusado ou cancelado: voltamos a propor (e a avisar, se a visita já foi comunicada)
    const { error } = await supabase
      .from("alocacoes")
      .update({ estado: "proposta", motivo: null, respondido_em: null, notificada_em: null })
      .eq("id", existente.id);
    if (error) return { erro: mensagemDeErro(error) };
    alocacaoId = existente.id as string;
  } else {
    const { data: nova, error } = await supabase.from("alocacoes").insert(r.data).select("id").single();
    if (error || !nova) {
      console.error("[visitas] alocar:", error?.code, error?.message);
      return { erro: error?.code === "23505" ? "Essa pessoa já está alocada a esta visita." : mensagemDeErro(error) };
    }
    alocacaoId = nova.id as string;
  }
  atualizarEcras(r.data.visita_id);
  if (v.estado === "comunicada") {
    return comEnvio("Alocado.", resumoDoEnvio(await avisarAlocados(supabase, r.data.visita_id, alocacaoId)));
  }
  return { ok: "Alocado." };
}

const idSchema = z.object({ id: z.uuid(), visita_id: z.uuid() });

export async function removerAlocacao(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = idSchema.safeParse({ id: fd.get("id"), visita_id: fd.get("visita_id") });
  if (!r.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  const antes = await lerVisitaParaEmail(supabase, r.data.visita_id);
  const a = antes?.alocacoes.find((x) => x.id === r.data.id);
  const { error } = await supabase.from("alocacoes").delete().eq("id", r.data.id).eq("visita_id", r.data.visita_id);
  if (error) return { erro: mensagemDeErro(error) };
  atualizarEcras(r.data.visita_id);
  // Só avisamos quem já sabia da visita e ainda contava ir
  if (antes?.estado === "comunicada" && a?.notificada_em && ["proposta", "confirmada"].includes(a.estado) && a.voluntarios) {
    return comEnvio("Removido.", resumoDoEnvio(await avisarRemocao(a.voluntarios, antes.visita)));
  }
  return { ok: "Removido." };
}

const presencaSchema = z.object({ id: z.uuid(), visita_id: z.uuid(), presenca: z.enum(["presente", "faltou", ""]) });

export async function registarPresenca(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = presencaSchema.safeParse({ id: fd.get("id"), visita_id: fd.get("visita_id"), presenca: fd.get("presenca") ?? "" });
  if (!r.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("alocacoes").update({ presenca: r.data.presenca || null }).eq("id", r.data.id);
  if (error) return { erro: mensagemDeErro(error) };
  atualizarEcras(r.data.visita_id);
  return { ok: "Guardado." };
}
