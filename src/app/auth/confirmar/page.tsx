import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Container, PageHeader, Section } from "@/components/ui";
import { BotaoSubmeter } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";
import { destinoDepoisDeEntrar } from "@/lib/auth";

export const metadata: Metadata = { title: "Confirmar entrada", robots: { index: false } };

/**
 * O link do email traz um token. NÃO o usamos logo ao abrir a página (pedido GET),
 * porque alguns programas de email/antivírus abrem os links automaticamente e
 * gastariam o token. A pessoa carrega em "Entrar" (pedido POST) e só aí é validado.
 */
export default function Confirmar({ searchParams }: PageProps<"/auth/confirmar">) {
  return (
    <>
      <PageHeader titulo="Quase lá" />
      <Section>
        <Container narrow>
          <Suspense fallback={<p>A carregar…</p>}>
            <Formulario searchParams={searchParams} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function Formulario({ searchParams }: { searchParams: PageProps<"/auth/confirmar">["searchParams"] }) {
  const { token_hash, erro } = await searchParams;
  const token = typeof token_hash === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(token_hash) ? token_hash : null;

  if (!token) {
    return (
      <p className="text-lg">
        Este link não é válido. <a href="/entrar" className="font-semibold text-verde underline">Pede um novo código</a>.
      </p>
    );
  }

  return (
    <form action={confirmar} className="space-y-6">
      <input type="hidden" name="token_hash" value={token} />
      {erro && (
        <p role="alert" className="rounded-xl border-2 border-erro/30 bg-red-50 px-4 py-3 text-erro">
          O link expirou ou já foi usado. <a href="/entrar" className="font-semibold underline">Pede um novo código</a>.
        </p>
      )}
      <p className="text-lg">Carrega no botão para entrares na tua área.</p>
      <BotaoSubmeter pendente="A entrar…">Entrar</BotaoSubmeter>
    </form>
  );
}

async function confirmar(formData: FormData) {
  "use server";
  const token = formData.get("token_hash");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(token)) redirect("/entrar");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "email" });
  if (error) redirect(`/auth/confirmar?token_hash=${encodeURIComponent(token)}&erro=1`);

  redirect(await destinoDepoisDeEntrar());
}
