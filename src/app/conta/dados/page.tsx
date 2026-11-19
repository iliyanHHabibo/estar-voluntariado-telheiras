import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "Os meus dados", robots: { index: false } };

type Perfil = {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  encarregado_nome: string | null;
  encarregado_telefone: string | null;
  encarregado_email: string | null;
  autorizacao_encarregado: boolean;
  consentimento_privacidade_em: string;
  consentimento_partilha_contacto_em: string;
  consentimento_regras_em: string;
  estado: string;
  criado_em: string;
};
type Disponibilidade = { data: string; inicio: string; fim: string; atividade_id: string | null };
type Observacao = { mes: string; texto: string };
type Visita = { atividade: string; data: string; inicio: string; fim: string; estado: string; presenca: string | null };
type Testemunho = { texto: string; estado: string; anonimo: boolean; enviado_em: string };
type Dados = {
  perfil: Perfil | null;
  interesses: string[];
  disponibilidades: Disponibilidade[];
  observacoes: Observacao[];
  visitas: Visita[];
  testemunhos: Testemunho[];
};

// ---- formatação (datas sem surpresas de fuso horário) ----
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function fmtData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
function mes(iso: string) {
  const [a, m] = iso.slice(0, 7).split("-");
  return `${MESES[Number(m) - 1]} de ${a}`;
}
function hora(t: string) {
  return t.slice(0, 5).replace(":", "h");
}
function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" });
}
const ESTADOS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  proposta: "Proposta (por confirmar)",
  confirmada: "Confirmada",
  recusada: "Recusada",
  cancelada: "Cancelada",
  pendente: "À espera de revisão",
  aprovado: "Publicado",
  rejeitado: "Não publicado",
  presente: "Presente",
  faltou: "Faltou",
};
const est = (v: string | null) => (v ? (ESTADOS[v] ?? v) : "—");

export default function OsMeusDados() {
  return (
    <>
      <div className="print:hidden">
        <PageHeader titulo="Os meus dados" subtitulo="Tudo o que o ESTAR guarda sobre ti." />
      </div>
      <Section className="print:py-0">
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
  const u = await exigirUtilizador("/conta/dados");
  const supabase = await createClient();
  const [{ data: bruto, error }, { data: atividades }] = await Promise.all([
    supabase.rpc("os_meus_dados"),
    supabase.from("atividades").select("id, nome"),
  ]);
  if (error || !bruto) return <p className="text-erro">Não foi possível carregar os teus dados. Tenta outra vez.</p>;

  const d = bruto as Dados;
  const nomeAtividade = new Map((atividades ?? []).map((a) => [a.id as string, a.nome as string]));
  const p = d.perfil;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <BotaoImprimir />
        <Link href="/conta" className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> Voltar à minha conta
        </Link>
      </div>

      {/* Cabeçalho que só aparece no papel/PDF */}
      <div className="hidden print:block">
        <p className="titulo text-2xl">ESTAR — Os meus dados</p>
        <p className="mt-1 text-sm">{SITE.organizacao} · gerado a {dataHora(new Date().toISOString())}</p>
      </div>

      <Bloco titulo="Dados pessoais">
        {p ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <Linha r="Nome">{p.nome}</Linha>
            <Linha r="Email">{u.email || p.email}</Linha>
            <Linha r="Telemóvel">{p.telefone}</Linha>
            <Linha r="Data de nascimento">{fmtData(p.data_nascimento)}</Linha>
            {p.encarregado_nome && (
              <>
                <Linha r="Encarregado de educação">{p.encarregado_nome}</Linha>
                <Linha r="Telemóvel do encarregado">{p.encarregado_telefone ?? "—"}</Linha>
                {p.encarregado_email && <Linha r="Email do encarregado">{p.encarregado_email}</Linha>}
                <Linha r="Autorização do encarregado">{p.autorizacao_encarregado ? "Sim" : "Não"}</Linha>
              </>
            )}
            <Linha r="Estado">{est(p.estado)}</Linha>
            <Linha r="Inscrito/a desde">{dataHora(p.criado_em)}</Linha>
            <Linha r="Atividades de interesse">{d.interesses.length ? d.interesses.join(", ") : "—"}</Linha>
          </dl>
        ) : (
          <p>Ainda não completaste a inscrição. Só temos o teu email: {u.email}</p>
        )}
      </Bloco>

      {p && (
        <Bloco titulo="Autorizações que deste">
          <ul className="space-y-1">
            <li>Política de Privacidade — {dataHora(p.consentimento_privacidade_em)}</li>
            <li>Partilha do contacto com o responsável da atividade — {dataHora(p.consentimento_partilha_contacto_em)}</li>
            <li>Regras das visitas — {dataHora(p.consentimento_regras_em)}</li>
          </ul>
        </Bloco>
      )}

      <Bloco titulo="Disponibilidades">
        {d.disponibilidades.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma.</p>
        ) : (
          <Tabela cab={["Dia", "Horário", "Atividade"]}>
            {d.disponibilidades.map((x, i) => (
              <tr key={i}>
                <Td>{fmtData(x.data)}</Td>
                <Td>{hora(x.inicio)} – {hora(x.fim)}</Td>
                <Td>{x.atividade_id ? (nomeAtividade.get(x.atividade_id) ?? "—") : "Qualquer atividade"}</Td>
              </tr>
            ))}
          </Tabela>
        )}
        {d.observacoes.length > 0 && (
          <ul className="mt-4 space-y-1">
            {d.observacoes.map((o) => (
              <li key={o.mes}>
                <strong>Observação ({mes(o.mes)}):</strong> {o.texto}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Visitas">
        {d.visitas.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma.</p>
        ) : (
          <Tabela cab={["Dia", "Horário", "Atividade", "Estado", "Presença"]}>
            {d.visitas.map((v, i) => (
              <tr key={i}>
                <Td>{fmtData(v.data)}</Td>
                <Td>{hora(v.inicio)} – {hora(v.fim)}</Td>
                <Td>{v.atividade}</Td>
                <Td>{est(v.estado)}</Td>
                <Td>{est(v.presenca)}</Td>
              </tr>
            ))}
          </Tabela>
        )}
      </Bloco>

      <Bloco titulo="Testemunhos">
        {d.testemunhos.length === 0 ? (
          <p className="text-tinta-suave">Nenhum.</p>
        ) : (
          <ul className="space-y-4">
            {d.testemunhos.map((t, i) => (
              <li key={i} className="rounded-2xl bg-cinza-claro p-4 print:border print:bg-white">
                <p>“{t.texto}”</p>
                <p className="mt-2 text-sm text-tinta-suave">
                  Enviado a {dataHora(t.enviado_em)} · {est(t.estado)} · {t.anonimo ? "anónimo" : "com o primeiro nome"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <p className="text-sm text-tinta-suave">
        Queres corrigir ou apagar algum dado? Fala connosco em {SITE.email}, ou apaga a conta na tua área.
      </p>
      <p className="text-sm text-tinta-suave print:hidden">
        Precisas dos dados num formato para outro sistema?{" "}
        <a href="/conta/dados/json" className="underline underline-offset-4">
          Descarregar em formato técnico (JSON)
        </a>
        .
      </p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="titulo mb-4 text-lg">{titulo}</h2>
      {children}
    </section>
  );
}

function Linha({ r, children }: { r: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-tinta-suave">{r}</dt>
      <dd className="break-words">{children}</dd>
    </>
  );
}

function Tabela({ cab, children }: { cab: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {cab.map((c) => (
              <th key={c} className="border-b-2 border-black/15 py-2 pr-4 text-sm font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-black/10 py-2 pr-4 align-top">{children}</td>;
}
