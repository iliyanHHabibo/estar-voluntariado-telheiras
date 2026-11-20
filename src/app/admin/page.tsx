import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarRange, MessageSquareQuote, Users } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, dataPorExtensoMaiuscula, horaTexto, hojeLisboa, mesSeguinte, rotuloMes } from "@/lib/tempo";
import { ESTADOS_VISITA, contarAlocacoes, lotacao, type EstadoVisita } from "@/lib/visitas";
import { nomeCurto } from "./planeamento/vista";

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

export default async function PainelAdmin() {
  await exigirAdmin();
  const supabase = await createClient();
  const hoje = hojeLisboa();

  const [{ count: voluntarios }, { count: testemunhos }, { data: visitasBrutas }, { data: periodos }] = await Promise.all([
    supabase.from("voluntarios").select("*", { count: "exact", head: true }).eq("estado", "ativo"),
    supabase.from("testemunhos").select("*", { count: "exact", head: true }).eq("estado", "pendente"),
    supabase
      .from("visitas")
      .select("id, data, inicio, fim, estado, atividades(nome, min_voluntarios, max_voluntarios), alocacoes(estado)")
      .gte("data", hoje)
      .neq("estado", "cancelada")
      .order("data")
      .order("inicio")
      .limit(60),
    supabase.from("periodos_disponibilidade").select("mes, abre_em, fecha_em").gte("fecha_em", hoje).order("mes").limit(2),
  ]);

  const visitas = ((visitasBrutas ?? []) as unknown as {
    id: string;
    data: string;
    inicio: string;
    fim: string;
    estado: EstadoVisita;
    atividades: Rel<{ nome: string; min_voluntarios: number; max_voluntarios: number }>;
    alocacoes: { estado: string }[] | null;
  }[]).map((v) => {
    const a = um(v.atividades);
    const c = contarAlocacoes((v.alocacoes ?? []).map((x) => x.estado));
    return { ...v, nome: a?.nome ?? "Visita", min: a?.min_voluntarios ?? 2, max: a?.max_voluntarios ?? 5, ...c };
  });
  const porCompletar = visitas.filter((v) => v.ativas < v.min).length;
  const porResponder = visitas.filter((v) => v.estado === "comunicada").reduce((n, v) => n + v.propostas, 0);
  const periodoAberto = (periodos ?? []).find((p) => p.abre_em <= hoje && hoje <= p.fecha_em);
  const proximoPeriodo = (periodos ?? []).find((p) => p.abre_em > hoje);

  const cartoes = [
    { titulo: "Voluntários ativos", valor: voluntarios, href: null, icone: Users },
    { titulo: "Visitas por completar", valor: porCompletar, href: "/admin/planeamento", icone: CalendarClock, alerta: porCompletar > 0 },
    { titulo: "Respostas à espera", valor: porResponder, href: "/admin/planeamento", icone: CalendarRange, nota: "voluntários que ainda não confirmaram" },
    { titulo: "Testemunhos por rever", valor: testemunhos, href: null, icone: MessageSquareQuote, nota: "a revisão chega na próxima fase" },
  ];

  return (
    <div className="space-y-10">
      <h1 className="titulo text-3xl">Painel</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartoes.map((c) => {
          const corpo = (
            <>
              <c.icone aria-hidden className="size-6 text-verde" />
              <p className="mt-3 text-tinta-suave">{c.titulo}</p>
              <p className="titulo mt-1 text-4xl">{c.valor ?? "—"}</p>
              {c.nota && <p className="mt-1 text-sm text-tinta-suave">{c.nota}</p>}
            </>
          );
          const cls = `rounded-3xl p-6 ${c.alerta ? "bg-amber-50 ring-2 ring-aviso/40" : "bg-white"}`;
          return c.href ? (
            <Link key={c.titulo} href={c.href} className={`${cls} transition-shadow hover:shadow-md`}>
              {corpo}
            </Link>
          ) : (
            <div key={c.titulo} className={cls}>
              {corpo}
            </div>
          );
        })}
      </div>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="text-lg font-semibold">Recolha de disponibilidades</h2>
        {periodoAberto ? (
          <p className="mt-2 text-lg">
            <strong>Aberta</strong> para {rotuloMes(periodoAberto.mes)}, até {dataCurta(periodoAberto.fecha_em)}.
          </p>
        ) : proximoPeriodo ? (
          <p className="mt-2 text-lg">
            A recolha para {rotuloMes(proximoPeriodo.mes)} abre a {dataCurta(proximoPeriodo.abre_em)}.
          </p>
        ) : (
          <p className="mt-2 text-lg text-aviso">
            Não há nenhuma recolha aberta nem agendada. Falta abrir a de {rotuloMes(mesSeguinte(hoje))}?
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/admin/periodos" className="inline-flex items-center gap-2 font-semibold text-verde underline underline-offset-4">
            Gerir períodos <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href="/admin/planeamento" className="inline-flex items-center gap-2 font-semibold text-verde underline underline-offset-4">
            Planeamento do mês <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="titulo text-xl">Próximas visitas</h2>
        {visitas.length === 0 ? (
          <p className="text-tinta-suave">Ainda não há visitas marcadas. Começa no planeamento do mês.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {visitas.slice(0, 8).map((v) => {
              const lot = lotacao(v.ativas, v.min, v.max);
              return (
                <li key={v.id}>
                  <Link
                    href={`/admin/visitas/${v.id}`}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 bg-white px-5 py-4 hover:border-verde ${lot.estado === "ok" ? "border-transparent" : "border-aviso/50"}`}
                  >
                    <span>
                      <span className="block font-semibold">{nomeCurto(v.nome)}</span>
                      <span className="text-sm text-tinta-suave">
                        {dataPorExtensoMaiuscula(v.data)} · {horaTexto(v.inicio)}–{horaTexto(v.fim)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`font-semibold ${lot.estado === "ok" ? "text-verde" : "text-aviso"}`}>
                        {v.ativas}/{v.max}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_VISITA[v.estado].cor}`}>{ESTADOS_VISITA[v.estado].texto}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
