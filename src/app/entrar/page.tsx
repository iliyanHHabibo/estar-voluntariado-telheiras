import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Section } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra na tua área de voluntário do ESTAR, ou inscreve-te.",
};

export default function Entrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <>
      <PageHeader titulo="Entrar" subtitulo="Para te inscreveres ou entrares na tua área, só precisas do teu email." />
      <Section>
        <Container narrow>
          <div className="max-w-lg">
            <Suspense fallback={<p>A carregar…</p>}>
              <Formulario searchParams={searchParams} />
            </Suspense>
          </div>
        </Container>
      </Section>
    </>
  );
}

async function Formulario({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { seguinte } = await searchParams;
  return <LoginForm seguinte={typeof seguinte === "string" ? seguinte : undefined} />;
}
