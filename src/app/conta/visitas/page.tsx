import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataPorExtenso, hojeLisboa, horaTexto } from "@/lib/tempo";
import { Separadores } from "../separadores";
import { Resposta } from "./resposta";

export const metadata: Metadata = { title: "As minhas visitas", robots: { index: false } };

export default function Visitas() {
  return (
    <>
      <PageHeader titulo="As minhas visitas" subtitulo="As visitas em que a equipa te incluiu." />
      <Section>
        <Container>
          <Separadores />
          <Suspense fallback={<p>A carregar…</p>}>
            <Conteudo />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

type Estado = "proposta" | "confirmada" | "recusada" | "cancelada";
type Linha = {
  id: string;
  estado: Estado;
  presenca: "presente" | "faltou" | null;
  motivo: string | null;
  visitas: {
    id: string;
    data: string;
    inicio: string;
    fim: string;
    estado: "rascunho" | "confirmada_responsavel" | "comunicada" | "realizada" | "cancelada";
    atividades: { nome: string; morada: string | null } | null;
  };
};

async function Conteudo() {
  const { u } = await exigirVoluntario("/conta/visitas");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alocacoes")
    .select("id, estado, presenca, motivo, visitas!inner(id, data, inicio, fim, estado, atividades(nome, morada))")
    .eq("voluntario_id", u.id);

  if (error) {
    console.error("[visitas] carregar:", error.code, error.message);
    return <p className="text-erro">Não foi possível carregar as tuas visitas. Tenta outra vez.</p>;
  }

  const hoje = hojeLisboa();
  const linhas = (data ?? []) as unknown as Linha[];
  const porData = (a: Linha, b: Linha) => (a.visitas.data + a.visitas.inicio).localeCompare(b.visitas.data + b.visitas.inicio);

  const futuras = linhas.filter((l) => l.visitas.data >= hoje && l.visitas.estado !== "realizada").sort(porData);
  const porResponder = futuras.filter((l) => l.estado === "proposta" && l.visitas.estado === "comunicada");
  const proximas = futuras.filter((l) => !porResponder.includes(l));
  const passadas = linhas.filter((l) => !futuras.includes(l)).sort((a, b) => porData(b, a));

  if (linhas.length === 0) {
    return (
      <div className="max-w-2xl space-y-3 rounded-3xl bg-cinza-claro p-7">
        <h2 className="titulo text-xl">Ainda não tens visitas</h2>
        <p className="text-lg">
          Depois de indicares as tuas disponibilidades, a equipa fala com os responsáveis e envia-te as visitas. Elas
          aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {porResponder.length > 0 && (
        <Grupo titulo="Precisamos da tua resposta" destaque>
          {porResponder.map((l) => (
            <Cartao key={l.id} l={l} />
          ))}
        </Grupo>
      )}
      <Grupo titulo="Próximas visitas">
        {proximas.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma por agora.</p>
        ) : (
          proximas.map((l) => <Cartao key={l.id} l={l} />)
        )}
      </Grupo>
      {passadas.length > 0 && (
        <Grupo titulo="Anteriores">
          {passadas.map((l) => (
            <Cartao key={l.id} l={l} passada />
          ))}
        </Grupo>
      )}
    </div>
  );
}

function Grupo({ titulo, destaque, children }: { titulo: string; destaque?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className={`titulo text-xl ${destaque ? "text-verde" : ""}`}>{titulo}</h2>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

const ETIQUETA: Record<Estado, { texto: string; cor: string }> = {
  proposta: { texto: "Por confirmar", cor: "bg-amber-100 text-aviso" },
  confirmada: { texto: "Confirmada", cor: "bg-green-100 text-verde" },
  recusada: { texto: "Não vais", cor: "bg-cinza text-tinta-suave" },
  cancelada: { texto: "Cancelada", cor: "bg-cinza text-tinta-suave" },
};

function Cartao({ l, passada }: { l: Linha; passada?: boolean }) {
  const v = l.visitas;
  const canceladaPelaEquipa = v.estado === "cancelada";
  const etiqueta = canceladaPelaEquipa
    ? { texto: "Cancelada pela equipa", cor: "bg-cinza text-tinta-suave" }
    : passada && l.presenca
      ? { texto: l.presenca === "presente" ? "Estiveste presente" : "Faltaste", cor: "bg-cinza text-tinta-suave" }
      : ETIQUETA[l.estado];
  const podeResponder = !passada && !canceladaPelaEquipa && v.estado === "comunicada";

  return (
    <article className={`flex flex-col gap-4 rounded-3xl border-2 border-black/10 p-6 ${passada || canceladaPelaEquipa ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{v.atividades?.nome ?? "Visita"}</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${etiqueta.cor}`}>{etiqueta.texto}</span>
      </div>
      <p className="flex items-start gap-2 text-lg">
        <Clock aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
        <span>
          <span className="first-letter:uppercase">{dataPorExtenso(v.data)}</span>
          <br />
          das {horaTexto(v.inicio)} às {horaTexto(v.fim)}
        </span>
      </p>
      {v.atividades?.morada && (
        <p className="flex items-start gap-2 text-tinta-suave">
          <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-verde" />
          {v.atividades.morada}
        </p>
      )}
      {l.motivo && (l.estado === "recusada" || l.estado === "cancelada") && (
        <p className="text-sm text-tinta-suave">O que indicaste: “{l.motivo}”</p>
      )}
      {podeResponder && <Resposta alocacaoId={l.id} estado={l.estado} />}
      {!passada && !canceladaPelaEquipa && (l.estado === "confirmada" || l.estado === "proposta") && (
        <a
          href={`/conta/visitas/${l.id}/calendario`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-verde underline underline-offset-4"
        >
          <CalendarPlus aria-hidden className="size-4" /> Adicionar ao calendário do telemóvel
        </a>
      )}
    </article>
  );
}
