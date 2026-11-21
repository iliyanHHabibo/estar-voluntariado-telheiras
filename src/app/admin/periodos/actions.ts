"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { criarCarteiro, urlDoSite } from "@/lib/emails/enviar";
import { emailPeriodoAberto } from "@/lib/emails/modelos";
import type { EstadoAdmin } from "@/lib/estado-admin";

export type { EstadoAdmin };

const dia = z.iso.date();
const periodoSchema = z
  .object({ mes: dia, abre_em: dia, fecha_em: dia })
  .refine((p) => p.mes.slice(8) === "01", { message: "O mês tem de ser o primeiro dia (AAAA-MM-01).", path: ["mes"] })
  .refine((p) => p.fecha_em >= p.abre_em, { message: "A recolha não pode fechar antes de abrir.", path: ["fecha_em"] });

function ler(fd: FormData) {
  return periodoSchema.safeParse({ mes: fd.get("mes"), abre_em: fd.get("abre_em"), fecha_em: fd.get("fecha_em") });
}

function atualizarEcras() {
  revalidatePath("/admin/periodos");
  revalidatePath("/admin/planeamento");
  revalidatePath("/admin");
  revalidatePath("/conta/disponibilidades");
  revalidatePath("/conta");
}

export async function criarPeriodo(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = ler(fd);
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica as datas." };
  const supabase = await createClient();
  const { error } = await supabase.from("periodos_disponibilidade").insert(r.data);
  if (error) {
    if (error.code === "23505") return { erro: "Já existe um período para esse mês. Edita esse." };
    console.error("[periodos] criar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras();
  return { ok: "Período criado." };
}

export async function atualizarPeriodo(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = ler(fd);
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica as datas." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("periodos_disponibilidade")
    .update({ abre_em: r.data.abre_em, fecha_em: r.data.fecha_em })
    .eq("mes", r.data.mes);
  if (error) {
    console.error("[periodos] atualizar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras();
  return { ok: "Datas guardadas." };
}

const mesSchema = z.object({ mes: dia });

/** Abrir a recolha já (hoje). Se já tinha fechado, volta a abrir até à data de fecho (ou, no mínimo, hoje). */
export async function abrirAgora(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const m = mesSchema.safeParse({ mes: fd.get("mes") });
  if (!m.success) return { erro: "Pedido inválido." };
  const hoje = hojeLisboa();
  const supabase = await createClient();
  const { data: p } = await supabase.from("periodos_disponibilidade").select("fecha_em").eq("mes", m.data.mes).maybeSingle();
  if (!p) return { erro: "Período não encontrado." };
  const fecha = (p.fecha_em as string) < hoje ? somarDias(hoje, 7) : (p.fecha_em as string);
  const { error } = await supabase.from("periodos_disponibilidade").update({ abre_em: hoje, fecha_em: fecha }).eq("mes", m.data.mes);
  if (error) return { erro: mensagemDeErro(error) };
  atualizarEcras();
  return { ok: `Aberto hoje, até ${fecha.split("-").reverse().join("/")}.` };
}

/** Fechar a recolha já: passa a ter fechado ontem. */
export async function fecharAgora(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const m = mesSchema.safeParse({ mes: fd.get("mes") });
  if (!m.success) return { erro: "Pedido inválido." };
  const ontem = somarDias(hojeLisboa(), -1);
  const supabase = await createClient();
  const { data: p } = await supabase.from("periodos_disponibilidade").select("abre_em").eq("mes", m.data.mes).maybeSingle();
  if (!p) return { erro: "Período não encontrado." };
  const abre = (p.abre_em as string) > ontem ? ontem : (p.abre_em as string);
  const { error } = await supabase.from("periodos_disponibilidade").update({ abre_em: abre, fecha_em: ontem }).eq("mes", m.data.mes);
  if (error) return { erro: mensagemDeErro(error) };
  atualizarEcras();
  return { ok: "Recolha fechada." };
}

export async function apagarPeriodo(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const m = mesSchema.safeParse({ mes: fd.get("mes") });
  if (!m.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  // As disponibilidades que os voluntários já indicaram NÃO se apagam: só deixa de haver período.
  const { error } = await supabase.from("periodos_disponibilidade").delete().eq("mes", m.data.mes);
  if (error) {
    console.error("[periodos] apagar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras();
  return { ok: "Período apagado." };
}

/**
 * Avisar todos os voluntários ativos de que a recolha está aberta. Vai em cópia oculta (ninguém vê
 * os endereços dos outros), em grupos de 50 para respeitar os limites do Gmail.
 */
export async function avisarVoluntarios(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const m = mesSchema.safeParse({ mes: fd.get("mes") });
  if (!m.success) return { erro: "Pedido inválido." };
  const hoje = hojeLisboa();
  const supabase = await createClient();
  const { data: p } = await supabase.from("periodos_disponibilidade").select("abre_em, fecha_em").eq("mes", m.data.mes).maybeSingle();
  if (!p) return { erro: "Período não encontrado." };
  if (hoje < (p.abre_em as string) || hoje > (p.fecha_em as string)) return { erro: "Só se avisa quando a recolha está aberta." };

  const { data: vols, error } = await supabase.from("voluntarios").select("email").eq("estado", "ativo");
  if (error) return { erro: mensagemDeErro(error) };
  const emails = [...new Set((vols ?? []).map((v) => (v.email as string).trim()).filter(Boolean))];
  if (emails.length === 0) return { erro: "Não há voluntários ativos para avisar." };

  const carteiro = criarCarteiro();
  if (!carteiro) return { aviso: "O envio de emails não está configurado. Avisa os voluntários por outra via." };
  const email = emailPeriodoAberto({ mes: m.data.mes, fechaEm: p.fecha_em as string, url: urlDoSite("/conta/disponibilidades") });
  let enviados = 0;
  try {
    for (let i = 0; i < emails.length; i += 50) {
      const grupo = emails.slice(i, i + 50);
      if (await carteiro.enviar({ bcc: grupo }, email, "período aberto")) enviados += grupo.length;
    }
  } finally {
    carteiro.fechar();
  }
  if (enviados === 0) return { erro: "Não foi possível enviar os emails. Tenta mais tarde." };

  const { error: e2 } = await supabase.from("periodos_disponibilidade").update({ avisados_em: new Date().toISOString() }).eq("mes", m.data.mes);
  if (e2) console.error("[periodos] avisados_em:", e2.code, e2.message);
  atualizarEcras();
  const falhados = emails.length - enviados;
  return {
    ok: `Avisámos ${enviados} ${enviados === 1 ? "voluntário" : "voluntários"} por email.`,
    aviso: falhados ? `${falhados} não ${falhados === 1 ? "recebeu" : "receberam"} o email (falha no envio). Tenta outra vez mais tarde.` : undefined,
  };
}
