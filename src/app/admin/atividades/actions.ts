"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import type { EstadoAdmin } from "@/lib/estado-admin";
import { DIAS_SEMANA_LONGO, minutos } from "@/lib/tempo";
import { gerarSlug, linhasParaLista } from "@/lib/texto";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");

const schema = z
  .object({
    nome: z.string().trim().min(2, "O nome tem de ter pelo menos 2 letras.").max(120, "O nome é demasiado longo."),
    resumo: z.string().trim().max(300, "O resumo pode ter no máximo 300 letras."),
    descricao: z.string().trim().max(4000, "A descrição é demasiado longa."),
    morada: z
      .string()
      .trim()
      .max(300, "A morada é demasiado longa.")
      .transform((v) => v || null),
    regras: z.string(),
    o_que_esperar: z.string(),
    min_voluntarios: z.coerce.number().int("O mínimo tem de ser um número inteiro.").min(0).max(50),
    max_voluntarios: z.coerce.number().int("O máximo tem de ser um número inteiro.").min(0).max(50),
    ordem: z.coerce.number().int().min(0).max(999),
    ativa: z.boolean(),
    responsavel_nome: z.string().trim().max(120, "O nome do responsável é demasiado longo.").transform((v) => v || null),
    responsavel_contacto: z.string().trim().max(200, "O contacto do responsável é demasiado longo.").transform((v) => v || null),
    notas: z.string().trim().max(2000, "As notas são demasiado longas.").transform((v) => v || null),
  })
  .refine((a) => a.max_voluntarios >= a.min_voluntarios, { message: "O máximo de voluntários não pode ser menor que o mínimo.", path: ["max_voluntarios"] });

function atualizarEcras() {
  updateTag("atividades");
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/planeamento");
  revalidatePath("/atividades");
  revalidatePath("/");
  revalidatePath("/conta/disponibilidades");
}

/** Lê os 7 dias do horário semanal do formulário. */
function lerHorarios(fd: FormData): { horarios: { dia_semana: number; abre: string; fecha: string }[]; inativos: number[]; erro?: string } {
  const horarios: { dia_semana: number; abre: string; fecha: string }[] = [];
  const inativos: number[] = [];
  for (let d = 1; d <= 7; d++) {
    if (fd.get(`h${d}_ativo`) !== "on") {
      inativos.push(d);
      continue;
    }
    const abre = hora.safeParse(fd.get(`h${d}_abre`));
    const fecha = hora.safeParse(fd.get(`h${d}_fecha`));
    if (!abre.success || !fecha.success) return { horarios, inativos, erro: `Horas inválidas em ${DIAS_SEMANA_LONGO[d - 1]}.` };
    if (minutos(fecha.data) - minutos(abre.data) < 60) {
      return { horarios, inativos, erro: `Em ${DIAS_SEMANA_LONGO[d - 1]}, a atividade tem de estar aberta pelo menos 1 hora.` };
    }
    horarios.push({ dia_semana: d, abre: abre.data, fecha: fecha.data });
  }
  return { horarios, inativos };
}

/** Cria ou atualiza uma atividade (se vier `id`, atualiza). */
export async function guardarAtividade(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const idPedido = fd.get("id") ? z.uuid().safeParse(fd.get("id")) : null;
  if (idPedido && !idPedido.success) return { erro: "Pedido inválido." };
  const id = idPedido?.success ? idPedido.data : null;

  const r = schema.safeParse({
    nome: fd.get("nome") ?? "",
    resumo: fd.get("resumo") ?? "",
    descricao: fd.get("descricao") ?? "",
    morada: fd.get("morada") ?? "",
    regras: String(fd.get("regras") ?? ""),
    o_que_esperar: String(fd.get("o_que_esperar") ?? ""),
    min_voluntarios: fd.get("min_voluntarios"),
    max_voluntarios: fd.get("max_voluntarios"),
    ordem: fd.get("ordem") ?? 0,
    ativa: fd.get("ativa") === "on",
    responsavel_nome: fd.get("responsavel_nome") ?? "",
    responsavel_contacto: fd.get("responsavel_contacto") ?? "",
    notas: fd.get("notas") ?? "",
  });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica os dados." };

  const regras = linhasParaLista(r.data.regras);
  if (regras.erro) return { erro: `Regras: ${regras.erro}` };
  const esperar = linhasParaLista(r.data.o_que_esperar);
  if (esperar.erro) return { erro: `O que esperar: ${esperar.erro}` };
  const h = lerHorarios(fd);
  if (h.erro) return { erro: h.erro };

  const campos = {
    nome: r.data.nome,
    resumo: r.data.resumo,
    descricao: r.data.descricao,
    morada: r.data.morada,
    regras: regras.itens,
    o_que_esperar: esperar.itens,
    min_voluntarios: r.data.min_voluntarios,
    max_voluntarios: r.data.max_voluntarios,
    ordem: r.data.ordem,
    ativa: r.data.ativa,
  };
  const contacto = { responsavel_nome: r.data.responsavel_nome, responsavel_contacto: r.data.responsavel_contacto, notas: r.data.notas };
  const supabase = await createClient();

  // ---------------------------------------------------------------- atualizar
  if (id) {
    const { data: ok, error } = await supabase.from("atividades").update(campos).eq("id", id).select("id");
    if (error) {
      console.error("[atividades] atualizar:", error.code, error.message);
      return { erro: mensagemDeErro(error) };
    }
    if (!ok?.length) return { erro: "Atividade não encontrada." };

    const c = await supabase.from("atividade_contactos").upsert({ atividade_id: id, ...contacto }, { onConflict: "atividade_id" });
    if (c.error) return { erro: mensagemDeErro(c.error) };

    // Primeiro grava os dias com horário (se falhar, não se perde nada); depois retira os que deixaram de funcionar
    if (h.horarios.length) {
      const u = await supabase
        .from("atividade_horarios")
        .upsert(h.horarios.map((x) => ({ atividade_id: id, ...x })), { onConflict: "atividade_id,dia_semana" });
      if (u.error) return { erro: mensagemDeErro(u.error) };
    }
    if (h.inativos.length) {
      const d = await supabase.from("atividade_horarios").delete().eq("atividade_id", id).in("dia_semana", h.inativos);
      if (d.error) return { erro: mensagemDeErro(d.error) };
    }
    atualizarEcras();
    return { ok: "Guardado. O site já mostra as alterações." };
  }

  // ---------------------------------------------------------------- criar
  const base = gerarSlug(r.data.nome);
  if (base.length < 2) return { erro: "O nome precisa de ter letras ou números." };
  let criada: string | null = null;
  for (let i = 1; i <= 6 && !criada; i++) {
    const slug = i === 1 ? base : `${base.slice(0, 56)}-${i}`;
    const ins = await supabase.from("atividades").insert({ slug, ...campos }).select("id").single();
    if (ins.data) criada = ins.data.id as string;
    else if (ins.error?.code !== "23505") {
      console.error("[atividades] criar:", ins.error?.code, ins.error?.message);
      return { erro: mensagemDeErro(ins.error) };
    }
  }
  if (!criada) return { erro: "Já existe uma atividade com um nome muito parecido. Muda o nome." };

  const c = await supabase.from("atividade_contactos").insert({ atividade_id: criada, ...contacto });
  const hs = h.horarios.length ? await supabase.from("atividade_horarios").insert(h.horarios.map((x) => ({ atividade_id: criada!, ...x }))) : { error: null };
  if (c.error || hs.error) {
    // Não deixar uma atividade a meio
    await supabase.from("atividades").delete().eq("id", criada);
    return { erro: mensagemDeErro(c.error ?? hs.error) };
  }
  atualizarEcras();
  redirect(`/admin/atividades/${criada}`);
}

// ------------------------------------------------------------------ apagar
/**
 * Só se apagam atividades SEM visitas (senão perdia-se o histórico; a base de dados também o impede).
 * Com visitas, esconde-se (desmarcar "Ativa"). Ao apagar, vão também os horários, os feriados próprios,
 * o contacto do responsável e as disponibilidades que os voluntários indicaram para ela.
 */
export async function apagarAtividade(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { count, error: e1 } = await supabase.from("visitas").select("id", { count: "exact", head: true }).eq("atividade_id", id.data);
  if (e1) return { erro: mensagemDeErro(e1) };
  const esconder = 'Para a tirar do site, desmarca "Ativa" e guarda.';
  if ((count ?? 0) > 0) {
    return { erro: `Esta atividade tem ${count} ${count === 1 ? "visita" : "visitas"}, por isso não se pode apagar (perdia-se o histórico). ${esconder}` };
  }

  const { data, error } = await supabase.from("atividades").delete().eq("id", id.data).select("id");
  if (error) {
    if (error.code === "23503") return { erro: `Esta atividade tem visitas associadas, por isso não se pode apagar. ${esconder}` };
    console.error("[atividades] apagar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  if (!data?.length) return { erro: "Atividade não encontrada." };
  atualizarEcras();
  redirect("/admin/atividades?apagada=1");
}

// ------------------------------------------------------------------ feriados e dias de fecho
const fechoSchema = z.object({
  data: z.iso.date("Escolhe o dia."),
  motivo: z.string().trim().max(200, "O motivo é demasiado longo.").transform((v) => v || null),
  atividade_id: z
    .string()
    .transform((v) => (v === "" || v === "todas" ? null : v))
    .pipe(z.uuid().nullable()),
});

export async function adicionarFecho(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const r = fechoSchema.safeParse({ data: fd.get("data"), motivo: fd.get("motivo") ?? "", atividade_id: fd.get("atividade_id") ?? "" });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica os dados." };
  const supabase = await createClient();
  const { error } = await supabase.from("atividade_fechos").insert(r.data);
  if (error) {
    if (error.code === "23505") return { erro: "Já existe um fecho para esse dia." };
    console.error("[fechos] adicionar:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  atualizarEcras();
  return { ok: "Fecho adicionado." };
}

export async function removerFecho(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  await exigirAdmin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { erro: "Pedido inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("atividade_fechos").delete().eq("id", id.data);
  if (error) return { erro: mensagemDeErro(error) };
  atualizarEcras();
  return { ok: "Removido." };
}
