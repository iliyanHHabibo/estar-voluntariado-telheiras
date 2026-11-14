import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InscricaoForm } from "./form";

export const metadata: Metadata = { title: "Inscrição", robots: { index: false } };

export default function Inscricao() {
  return (
    <>
      <PageHeader titulo="Inscrição" subtitulo="Só precisas de fazer isto uma vez." />
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
  const u = await exigirUtilizador("/conta/inscricao");
  const supabase = await createClient();

  const { data: perfil } = await supabase.from("profiles").select("id").eq("id", u.id).maybeSingle();
  if (perfil) redirect("/conta");

  const { data: atividades } = await supabase
    .from("activities")
    .select("id, nome")
    .eq("ativa", true)
    .order("ordem");

  return <InscricaoForm atividades={atividades ?? []} email={u.email} />;
}
