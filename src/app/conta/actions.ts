"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { exigirUtilizador } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/erros";
import { SITE } from "@/lib/site";

export type EstadoInscricao = { erro?: string; campos?: Record<string, string> };

const telefone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{9,15}$/, "Telefone inválido."));

function idadeEm(nascimento: Date, hoje = new Date()) {
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

const inscricaoSchema = z
  .object({
    nome: z.string().trim().min(2, "Escreve o teu nome.").max(120),
    telefone,
    data_nascimento: z.iso.date("Data de nascimento inválida."),
    encarregado_nome: z.string().trim().max(120).optional(),
    encarregado_telefone: z.string().trim().max(30).optional(),
    encarregado_email: z.union([z.literal(""), z.email().max(254)]).optional(),
    autorizacao_encarregado: z.literal("on").optional(),
    interesses: z.array(z.uuid()).max(20),
    consent_privacidade: z.literal("on", "Tens de aceitar a Política de Privacidade."),
    consent_partilha: z.literal("on", "Tens de aceitar a partilha do teu contacto com o responsável da atividade."),
    consent_regras: z.literal("on", "Tens de aceitar as regras das visitas."),
  })
  .superRefine((d, ctx) => {
    const idade = idadeEm(new Date(d.data_nascimento + "T12:00:00"));
    if (idade < SITE.idadeMinima) {
      ctx.addIssue({ code: "custom", path: ["data_nascimento"], message: `É preciso ter pelo menos ${SITE.idadeMinima} anos.` });
    }
    if (idade < 18) {
      if (!d.encarregado_nome) ctx.addIssue({ code: "custom", path: ["encarregado_nome"], message: "Indica o nome do encarregado de educação." });
      if (!d.encarregado_telefone || !/^\+?[0-9]{9,15}$/.test(d.encarregado_telefone.replace(/[\s-]/g, "")))
        ctx.addIssue({ code: "custom", path: ["encarregado_telefone"], message: "Indica um telefone válido do encarregado de educação." });
      if (d.autorizacao_encarregado !== "on")
        ctx.addIssue({ code: "custom", path: ["autorizacao_encarregado"], message: "É preciso a autorização do encarregado de educação." });
    }
  });

export async function criarPerfil(_prev: EstadoInscricao, formData: FormData): Promise<EstadoInscricao> {
  const u = await exigirUtilizador("/conta/inscricao");

  const bruto = {
    nome: formData.get("nome") ?? "",
    telefone: formData.get("telefone") ?? "",
    data_nascimento: formData.get("data_nascimento") ?? "",
    encarregado_nome: formData.get("encarregado_nome") || undefined,
    encarregado_telefone: formData.get("encarregado_telefone") || undefined,
    encarregado_email: formData.get("encarregado_email") || undefined,
    autorizacao_encarregado: formData.get("autorizacao_encarregado") || undefined,
    interesses: formData.getAll("interesses"),
    consent_privacidade: formData.get("consent_privacidade") ?? undefined,
    consent_partilha: formData.get("consent_partilha") ?? undefined,
    consent_regras: formData.get("consent_regras") ?? undefined,
  };
  const campos = Object.fromEntries(
    Object.entries(bruto).filter(([, v]) => typeof v === "string") as [string, string][],
  );

  const r = inscricaoSchema.safeParse(bruto);
  if (!r.success) {
    return { erro: r.error.issues[0]?.message ?? "Verifica os dados.", campos };
  }
  const d = r.data;
  const menor = idadeEm(new Date(d.data_nascimento + "T12:00:00")) < 18;

  const supabase = await createClient();
  const { error } = await supabase.from("voluntarios").insert({
    id: u.id,
    nome: d.nome,
    telefone: d.telefone,
    data_nascimento: d.data_nascimento,
    encarregado_nome: menor ? d.encarregado_nome : null,
    encarregado_telefone: menor ? d.encarregado_telefone?.replace(/[\s-]/g, "") : null,
    encarregado_email: menor ? d.encarregado_email || null : null,
    autorizacao_encarregado: menor && d.autorizacao_encarregado === "on",
  });
  if (error) {
    if (error.code === "23505") redirect("/conta"); // já tinha perfil
    return { erro: mensagemDeErro(error, "Não foi possível guardar a inscrição. Tenta outra vez."), campos };
  }

  if (d.interesses.length) {
    await supabase
      .from("voluntario_interesses")
      .insert(d.interesses.map((atividade_id) => ({ voluntario_id: u.id, atividade_id })));
  }

  redirect("/conta?bem-vindo=1");
}

export type EstadoApagar = { erro?: string };

export async function apagarConta(_prev: EstadoApagar, formData: FormData): Promise<EstadoApagar> {
  await exigirUtilizador();
  if (String(formData.get("confirmacao") ?? "").trim().toUpperCase() !== "APAGAR") {
    return { erro: 'Escreve APAGAR para confirmar.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("apagar_a_minha_conta");
  if (error) return { erro: mensagemDeErro(error) };
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/?conta=apagada");
}
