import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, hojeLisboa, horaTexto, idadeEm } from "@/lib/tempo";
import { ESTADOS_ALOCACAO, ESTADOS_VISITA, type EstadoAlocacao, type EstadoVisita } from "@/lib/visitas";
import { estatisticaVazia, estatisticasPorVoluntario, formatarHoras } from "@/lib/voluntarios";
import { nomeCurto } from "../../planeamento/vista";
import { ApagarNota, EditarDados, MudarEstado, NovaNota } from "./partes";

export const metadata: Metadata = { title: "Voluntário" };

export default function Ficha({ params }: PageProps<"/admin/voluntarios/[id]">) {
  return (
    <Suspense fallback={<p>A carregar…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" });

async function Conteudo({ params }: { params: PageProps<"/admin/voluntarios/[id]">["params"] }) {
  await exigirAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const hoje = hojeLisboa();
  const [{ data: v }, { data: interesses }, { data: aloc }, { data: notas }, { data: admins }] = await Promise.all([
    supabase.from("voluntarios").select("*").eq("id", id).maybeSingle(),
    supabase.from("voluntario_interesses").select("atividades(nome)").eq("voluntario_id", id),
    supabase
      .from("alocacoes")
      .select("id, estado, presenca, motivo, visitas!inner(id, data, inicio, fim, estado, atividades(nome))")
      .eq("voluntario_id", id),
    supabase.from("notas_admin").select("id, texto, criado_em, autor_id").eq("voluntario_id", id).order("criado_em", { ascending: false }),
    supabase.rpc("listar_admins"),
  ]);
  if (!v) notFound();

  type Linha = { id: string; estado: EstadoAlocacao; presenca: "presente" | "faltou" | null; motivo: string | null; visitas: Rel<{ id: string; data: string; inicio: string; fim: string; estado: EstadoVisita; atividades: Rel<{ nome: string }> }> };
  const historico = ((aloc ?? []) as unknown as Linha[])
    .map((a) => ({ ...a, visita: um(a.visitas)! }))
    .filter((a) => a.visita)
    .sort((a, b) => (b.visita.data + b.visita.inicio).localeCompare(a.visita.data + a.visita.inicio));
  const s =
    estatisticasPorVoluntario(
      historico.map((a) => ({ voluntario_id: id, estado: a.estado, presenca: a.presenca, visita: a.visita })),
      hoje,
    ).get(id) ?? estatisticaVazia();

  const idade = idadeEm(v.data_nascimento as string, hoje);
  const menor = idade < 18;
  const ativo = v.estado === "ativo";
  const emailDoAdmin = new Map(((admins ?? []) as { utilizador_id: string; email: string }[]).map((a) => [a.utilizador_id, a.email]));
  const nomesInteresses = ((interesses ?? []) as unknown as { atividades: Rel<{ nome: string }> }[]).map((i) => um(i.atividades)?.nome).filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <Link href="/admin/voluntarios" className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Voluntários
      </Link>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="titulo text-2xl sm:text-3xl">{v.nome as string}</h1>
            <p className="mt-2 text-tinta-suave">
              {idade} anos · inscrito a {dataCurta(v.criado_em as string)}
              {menor && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-aviso">menor</span>}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ativo ? "bg-green-100 text-verde" : "bg-cinza text-tinta-suave"}`}>{ativo ? "Ativo" : "Inativo"}</span>
        </div>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={`tel:${(v.telefone as string).replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 underline underline-offset-4"><Phone aria-hidden className="size-4" />{v.telefone as string}</a>
          <a href={`mailto:${v.email as string}`} className="inline-flex items-center gap-2 break-all underline underline-offset-4"><Mail aria-hidden className="size-4 shrink-0" />{v.email as string}</a>
        </p>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="text-tinta-suave">Atividades</dt>
          <dd>{nomesInteresses.length ? nomesInteresses.join(", ") : "—"}</dd>
          <dt className="text-tinta-suave">Visitas feitas</dt>
          <dd>
            {s.feitas} · {formatarHoras(s.horas)} h de voluntariado{s.faltas > 0 ? ` · ${s.faltas} falta${s.faltas === 1 ? "" : "s"}` : ""}
          </dd>
          <dt className="text-tinta-suave">Próximas visitas</dt>
          <dd>
            {s.proximas}
            {s.porResponder > 0 ? ` (${s.porResponder} ainda sem resposta)` : ""}
          </dd>
          {menor && (
            <>
              <dt className="text-tinta-suave">Autorização do encarregado</dt>
              <dd>{v.autorizacao_encarregado ? "Dada na inscrição" : "Em falta"}</dd>
            </>
          )}
          <dt className="text-tinta-suave">Autorizações dadas</dt>
          <dd className="text-sm">
            Privacidade {dataHora(v.consentimento_privacidade_em as string)} · partilha de contacto {dataHora(v.consentimento_partilha_contacto_em as string)} · regras {dataHora(v.consentimento_regras_em as string)}
          </dd>
        </dl>
        <div className="border-t border-black/10 pt-5">
          <MudarEstado id={id} ativo={ativo} nome={v.nome as string} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
          <h2 className="titulo text-xl">Corrigir dados</h2>
          <p className="text-sm text-tinta-suave">O email vem da conta do voluntário e não se muda aqui. A data de nascimento também não.</p>
          <EditarDados
            v={{
              id,
              nome: v.nome as string,
              telefone: v.telefone as string,
              menor,
              encarregadoNome: (v.encarregado_nome as string | null) ?? "",
              encarregadoTelefone: (v.encarregado_telefone as string | null) ?? "",
              encarregadoEmail: (v.encarregado_email as string | null) ?? "",
            }}
          />
        </section>

        <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
          <h2 className="titulo text-xl">Notas internas</h2>
          <p className="text-sm text-tinta-suave">O voluntário nunca vê estas notas.</p>
          {(notas ?? []).length === 0 ? (
            <p className="text-tinta-suave">Ainda sem notas.</p>
          ) : (
            <ul className="divide-y divide-black/10">
              {(notas ?? []).map((n) => (
                <li key={n.id as string} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="whitespace-pre-wrap">{n.texto as string}</p>
                    <p className="mt-1 text-xs text-tinta-suave">
                      {dataHora(n.criado_em as string)} · {emailDoAdmin.get(n.autor_id as string) ?? "admin"}
                    </p>
                  </div>
                  <ApagarNota id={n.id as string} voluntarioId={id} />
                </li>
              ))}
            </ul>
          )}
          <NovaNota voluntarioId={id} />
        </section>
      </div>

      <section className="space-y-5 rounded-3xl bg-white p-6 sm:p-8">
        <h2 className="titulo text-xl">Histórico de visitas</h2>
        {historico.length === 0 ? (
          <p className="text-tinta-suave">Ainda não esteve alocado a nenhuma visita.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {historico.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link href={`/admin/visitas/${a.visita.id}`} className="underline underline-offset-4">
                  <strong>{dataCurta(a.visita.data)}</strong> · {horaTexto(a.visita.inicio)}–{horaTexto(a.visita.fim)} · {nomeCurto(um(a.visita.atividades)?.nome ?? "Visita")}
                </Link>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {a.presenca && <span className="font-semibold">{a.presenca === "presente" ? "Presente" : "Faltou"}</span>}
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_ALOCACAO[a.estado].cor}`}>{ESTADOS_ALOCACAO[a.estado].texto}</span>
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_VISITA[a.visita.estado].cor}`}>{ESTADOS_VISITA[a.visita.estado].texto}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
