import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirUtilizador, souAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConfigurarForm, VerificarForm } from "./forms";

export const metadata: Metadata = { title: "Verificação em dois passos", robots: { index: false } };

export default function DoisFatores() {
  return (
    <>
      <PageHeader titulo="Verificação em dois passos" subtitulo="A área de administração tem dados pessoais. Por isso pedimos um segundo código." />
      <Section>
        <Container narrow>
          <Suspense fallback={<p>A carregar…</p>}>
            <Conteudo />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function Conteudo() {
  const u = await exigirUtilizador("/admin");
  if (!(await souAdmin())) notFound();
  if (u.aal === "aal2") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const fator = data?.totp?.[0]; // só fatores já verificados

  if (fator) {
    return (
      <div className="max-w-lg space-y-4">
        <p className="text-lg">Abre a app de autenticação no telemóvel e escreve o código do <strong>ESTAR</strong>.</p>
        <VerificarForm factorId={fator.id} />
        <p className="pt-4 text-sm text-tinta-suave">
          Perdeste o telemóvel? Pede ao responsável técnico do projeto para repor o teu 2FA no Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-lg">Primeira vez como admin: vamos configurar o 2FA. Demora 1 minuto.</p>
      <ConfigurarForm />
    </div>
  );
}
