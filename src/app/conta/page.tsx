import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, FileText, LogOut, MessageSquareQuote, Shield, Users } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/ui";
import { Alerta } from "@/components/forms";
import { exigirUtilizador, souAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, dataPorExtenso, hojeLisboa, horaTexto, rotuloMes } from "@/lib/tempo";
import { sair } from "../entrar/actions";
import { ApagarContaForm } from "./apagar-form";
import { ContaNav } from "./conta-nav";

export const metadata: Metadata = { title: "A minha conta", robots: { index: false } };

export default function Conta({ searchParams }: PageProps<"/conta">) {
  return (
    <>
      <PageHeader titulo="A minha conta" />
      <Section>
        <Container>
          <ContaNav />
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
    .select("nome, telefone, estado, encarregado_nome, encarregado_telefone, encarregado_email")
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

  // O que está a acontecer agora (para o resumo)
  const hoje = hojeLisboa();
  const [{ data: periodoAberto }, { data: alocacoes }] = await Promise.all([
    supabase
      .from("periodos_disponibilidade")
      .select("mes, fecha_em")
      .lte("abre_em", hoje)
      .gte("fecha_em", hoje)
      .order("mes")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("alocacoes")
      .select("estado, visitas!inner(data, inicio, estado)")
      .eq("voluntario_id", u.id)
      .in("estado", ["proposta", "confirmada"]),
  ]);
  const futuras = ((alocacoes ?? []) as unknown as { estado: string; visitas: { data: string; inicio: string; estado: string } }[])
    .filter((a) => a.visitas.data >= hoje && a.visitas.estado === "comunicada")
    .sort((a, b) => (a.visitas.data + a.visitas.inicio).localeCompare(b.visitas.data + b.visitas.inicio));
  const porResponder = futuras.filter((a) => a.estado === "proposta").length;
  const proxima = futuras.find((a) => a.estado === "confirmada")?.visitas;

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
          <CartaoLink
            href="/conta/disponibilidades"
            icone={<CalendarDays aria-hidden className="size-7 text-verde" />}
            titulo="As minhas disponibilidades"
            destaque={Boolean(periodoAberto)}
          >
            {periodoAberto
              ? `Está aberta a recolha para ${rotuloMes(periodoAberto.mes)}, até ${dataCurta(periodoAberto.fecha_em)}. Indica quando podes ir.`
              : "De momento não há nenhuma recolha aberta. Normalmente é entre os dias 15 e 25 de cada mês."}
          </CartaoLink>
          <CartaoLink
            href="/conta/visitas"
            icone={<Users aria-hidden className="size-7 text-verde" />}
            titulo="As minhas visitas"
            destaque={porResponder > 0}
          >
            {porResponder > 0
              ? `Tens ${porResponder} ${porResponder === 1 ? "visita à espera" : "visitas à espera"} da tua resposta.`
              : proxima
                ? `A próxima: ${dataPorExtenso(proxima.data)}, às ${horaTexto(proxima.inicio)}.`
                : "Ainda não tens visitas marcadas."}
          </CartaoLink>
          <CartaoLink
            href="/conta/testemunhos"
            icone={<MessageSquareQuote aria-hidden className="size-7 text-verde" />}
            titulo="Enviar testemunho"
          >
            Conta-nos como foi uma visita. A equipa lê e decide se publica.
          </CartaoLink>
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
                <dt className="text-tinta-suave">Telemóvel do encarregado</dt>
                <dd>{perfil.encarregado_telefone ?? "—"}</dd>
                {perfil.encarregado_email && (
                  <>
                    <dt className="text-tinta-suave">Email do encarregado</dt>
                    <dd className="break-all">{perfil.encarregado_email}</dd>
                  </>
                )}
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

function CartaoLink({
  href,
  icone,
  titulo,
  destaque,
  children,
}: {
  href: string;
  icone: React.ReactNode;
  titulo: string;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-3xl p-6 transition-colors ${
        destaque ? "bg-verde text-white hover:bg-verde-escuro" : "bg-cinza-claro hover:bg-cinza"
      }`}
    >
      <span className={destaque ? "[&_svg]:text-verde-vivo" : ""}>{icone}</span>
      <h3 className="mt-3 text-lg font-semibold">{titulo}</h3>
      <p className={`mt-1 ${destaque ? "text-white/90" : "text-tinta-suave"}`}>{children}</p>
      <span className="mt-4 inline-flex items-center gap-2 font-semibold">
        Abrir <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
