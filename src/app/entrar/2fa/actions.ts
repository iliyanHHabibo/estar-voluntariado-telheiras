"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obterUtilizador, souAdmin } from "@/lib/auth";

export type EstadoConfig = { factorId?: string; qr?: string; segredo?: string; erro?: string };
export type EstadoVerificar = { erro?: string };

async function exigirAdminSemAal2() {
  const u = await obterUtilizador();
  if (!u) redirect("/entrar?seguinte=/admin");
  if (!(await souAdmin())) redirect("/");
  return u;
}

/** Gera um novo segredo TOTP (QR code) para o admin ligar à app de autenticação. */
export async function iniciarConfiguracao(): Promise<EstadoConfig> {
  await exigirAdminSemAal2();
  const supabase = await createClient();

  const { data: fatores } = await supabase.auth.mfa.listFactors();
  // Se já há um fator verificado, não se cria outro a partir daqui
  if (fatores?.totp?.length) redirect("/entrar/2fa");
  // Limpar tentativas anteriores não concluídas
  for (const f of fatores?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "ESTAR",
    friendlyName: `ESTAR ${new Date().toISOString().slice(0, 16)}`,
  });
  if (error || !data) return { erro: "Não foi possível iniciar a configuração. Tenta outra vez." };
  return { factorId: data.id, qr: data.totp.qr_code, segredo: data.totp.secret };
}

const verificarSchema = z.object({
  factorId: z.uuid(),
  codigo: z.string().trim().regex(/^\d{6}$/),
});

/** Verifica o código de 6 dígitos da app; eleva a sessão a aal2. */
export async function verificarCodigo2fa(_prev: EstadoVerificar, formData: FormData): Promise<EstadoVerificar> {
  await exigirAdminSemAal2();
  const dados = verificarSchema.safeParse({ factorId: formData.get("factorId"), codigo: formData.get("codigo") });
  if (!dados.success) return { erro: "O código tem 6 números." };

  const supabase = await createClient();
  // O fator tem de pertencer a esta pessoa
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  if (!fatores?.all.some((f) => f.id === dados.data.factorId && f.factor_type === "totp")) {
    return { erro: "Configuração inválida. Recarrega a página." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: dados.data.factorId,
    code: dados.data.codigo,
  });
  if (error) {
    return {
      erro: /rate|too many/i.test(error.message)
        ? "Demasiadas tentativas. Espera um pouco."
        : "Código errado. Confirma que o relógio do telemóvel está certo e tenta o código atual.",
    };
  }
  redirect("/admin");
}
