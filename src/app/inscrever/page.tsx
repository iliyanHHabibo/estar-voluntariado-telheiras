import type { Metadata } from "next";
import { Container, PageHeader, Section, ButtonLink } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Quero ser voluntário",
};

// PLACEHOLDER: a inscrição a sério (login por link, formulário, menores) é a próxima fase.
export default function Inscrever() {
  return (
    <>
      <PageHeader titulo="Quero ser voluntário" subtitulo="As inscrições online abrem em breve." />
      <Section>
        <Container narrow>
          <p className="text-lg">
            Estamos a preparar a inscrição online. Até lá, escreve-nos e dizemos-te como participar.
          </p>
          <div className="mt-8">
            <ButtonLink href={`mailto:${SITE.email}?subject=Quero%20ser%20volunt%C3%A1rio`}>Enviar email</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
