"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { destinoDepoisDeEntrar } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/erros";

export type EstadoEntrar = {
  etapa: "email" | "codigo";
  email?: string;
  erro?: string;
  info?: string;
};

const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));
const codigoSchema = z.string().trim().regex(/^\d{6,10}$/);

/** Passo 1: enviar email com código + link. */
export async function enviarCodigo(_prev: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    return { etapa: "email", erro: "Escreve um email válido." };
  }

  const captchaToken = formData.get("cf-turnstile-response");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: true,
      captchaToken: typeof captchaToken === "string" && captchaToken ? captchaToken : undefined,
    },
  });

  if (error) {
    // Detalhe técnico só no terminal/registos do servidor (nunca no ecrã). Sem o email da pessoa.
    console.error("[entrar] falha ao enviar código:", error.status, error.code, error.message);
    // Não revelamos se o email existe ou não. Só tratamos limites e captcha.
    if (/captcha/i.test(error.message)) {
      return { etapa: "email", email: email.data, erro: "A verificação anti-robô falhou. Tenta outra vez." };
    }
    return { etapa: "email", email: email.data, erro: mensagemDeErro(error, "Não foi possível enviar o email. Tenta outra vez.") };
  }

  return {
    etapa: "codigo",
    email: email.data,
    info: "Enviámos-te um email. Escreve o código que lá está, ou carrega no link do email.",
  };
}

/** Passo 2: verificar o código escrito pela pessoa. */
export async function verificarCodigo(_prev: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = emailSchema.safeParse(formData.get("email"));
  const codigo = codigoSchema.safeParse(formData.get("codigo"));
  if (!email.success) return { etapa: "email", erro: "Escreve um email válido." };
  if (!codigo.success) return { etapa: "codigo", email: email.data, erro: "O código tem só números (6 dígitos)." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: codigo.data, type: "email" });
  if (error) {
    console.error("[entrar] falha ao verificar código:", error.status, error.code, error.message);
    return {
      etapa: "codigo",
      email: email.data,
      erro: /expired|invalid/i.test(error.message)
        ? "Código errado ou expirado. Confirma o código ou pede um novo."
        : mensagemDeErro(error),
    };
  }

  const seguinte = formData.get("seguinte");
  redirect(await destinoDepoisDeEntrar(typeof seguinte === "string" ? seguinte : null));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
