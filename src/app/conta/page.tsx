import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, LogOut, MessageSquareQuote, Shield } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/ui";
import { Alerta } from "@/components/forms";
import { exigirUtilizador, souAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sair } from "../entrar/actions";
import { ApagarContaForm } from "./apagar-form";

export const metadata: Metadata = { title: "A minha conta", robots: { index: false } };

export default function Conta({ searchParams }: PageProps<"/conta">) {
  return (
    <>
      <PageHeader titulo="A minha conta" />
      <Section>
        <Container>
          <Suspense fallback={<p>A carregar…</p>}>
            <Conteudo searchParams={searchParams} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/conta">["searchParams"] }) {
  const u = await exigirUtilizador("/conta");
  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("voluntarios")
    .select("nome, telefone, estado, encarregado_nome")
    .eq("id", u.id)
    .maybeSingle();

  if (!perfil) {
    if (await souAdmin()) redirect("/admin");
    redirect("/conta/inscricao");
  }

  const { data: interesses } = await supabase
    .from("voluntario_interesses")
    .select("atividades(nome)")
    .eq("voluntario_id", u.id);
  const nomesInteresses = (interesses ?? [])
    .map((i) => (i.atividades as unknown as { nome: string } | null)?.nome)
    .filter(Boolean);

  const { "bem-vindo": bemVindo } = await searchParams;
  const primeiroNome = perfil.nome.split(" ")[0];

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {bemVindo && (
          <Alerta tipo="sucesso">
            Bem-vindo/a ao ESTAR, {primeiroNome}! A tua inscrição está feita. Quando abrir o período de disponibilidades,
            enviamos-te um email.
          </Alerta>
        )}
        <h2 className="titulo text-2xl">Olá, {primeiroNome}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-cinza-claro p-6">
            <CalendarDays aria-hidden className="size-7 text-verde" />
            <h3 className="mt-3 text-lg font-semibold">As minhas disponibilidades</h3>
            <p className="mt-1 text-tinta-suave">Em breve: indica aqui, todos os meses, quando podes ir.</p>
          </div>
          <div className="rounded-3xl bg-cinza-claro p-6">
            <MessageSquareQuote aria-hidden className="size-7 text-verde" />
            <h3 className="mt-3 text-lg font-semibold">Enviar testemunho</h3>
            <p className="mt-1 text-tinta-suave">Em breve: conta-nos como foi uma visita.</p>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-black/10 p-6">
          <h3 className="text-lg font-semibold">Os meus dados</h3>
          <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="text-tinta-suave">Nome</dt>
            <dd>{perfil.nome}</dd>
            <dt className="text-tinta-suave">Email</dt>
            <dd className="break-all">{u.email}</dd>
            <dt className="text-tinta-suave">Telemóvel</dt>
            <dd>{perfil.telefone}</dd>
            {perfil.encarregado_nome && (
              <>
                <dt className="text-tinta-suave">Encarregado de educação</dt>
                <dd>{perfil.encarregado_nome}</dd>
              </>
            )}
            <dt className="text-tinta-suave">Atividades</dt>
            <dd>{nomesInteresses.length ? nomesInteresses.join(", ") : "—"}</dd>
          </dl>
        </div>
      </div>

      <aside className="space-y-4">
        {(await souAdmin()) && (
          <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-verde p-4 font-semibold text-white hover:bg-verde-escuro">
            <Shield aria-hidden className="size-5" /> Área de administração
          </Link>
        )}
        <Link href="/conta/dados" className="flex items-center gap-3 rounded-2xl border-2 border-black/10 p-4 font-semibold hover:bg-cinza-claro">
          <FileText aria-hidden className="size-5" /> Os meus dados (ver ou guardar em PDF)
        </Link>
        <form action={sair}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border-2 border-black/10 p-4 text-left font-semibold hover:bg-cinza-claro">
            <LogOut aria-hidden className="size-5" /> Sair
          </button>
        </form>
        <ApagarContaForm />
      </aside>
    </div>
  );
}
