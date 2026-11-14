import { ButtonLink, Container, Section } from "@/components/ui";

export default function NotFound() {
  return (
    <Section tom="cinza" className="min-h-[60vh]">
      <Container narrow className="text-center">
        <p className="titulo text-7xl text-verde">404</p>
        <h1 className="titulo mt-6 text-2xl sm:text-3xl">Esta página não existe</h1>
        <p className="mt-4 text-lg text-tinta-suave">Talvez o endereço esteja errado ou a página tenha mudado de sítio.</p>
        <div className="mt-8">
          <ButtonLink href="/" variante="escuro">
            Voltar ao início
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
