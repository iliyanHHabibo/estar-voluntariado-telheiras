/** Linhas dos ficheiros de exportação (Excel). Lógica pura, testada em exportar.test.ts. */
import { dataCurta, horaTexto, idadeEm } from "./tempo.ts";
import { ESTADOS_ALOCACAO, ESTADOS_VISITA, type EstadoAlocacao, type EstadoVisita } from "./visitas.ts";
import { estatisticaVazia, estatisticasPorVoluntario, type AlocacaoParaEstatistica, type Estatistica } from "./voluntarios.ts";

export const COLUNAS_VOLUNTARIOS = [
  { titulo: "Nome", largura: 28 },
  { titulo: "Email", largura: 30 },
  { titulo: "Telefone", largura: 16 },
  { titulo: "Data de nascimento", largura: 12 },
  { titulo: "Idade", largura: 7 },
  { titulo: "Menor de idade", largura: 9 },
  { titulo: "Estado", largura: 9 },
  { titulo: "Encarregado de educação", largura: 24 },
  { titulo: "Telefone do encarregado", largura: 16 },
  { titulo: "Email do encarregado", largura: 26 },
  { titulo: "Inscrito em", largura: 12 },
  { titulo: "Atividades de interesse", largura: 36 },
  { titulo: "Visitas feitas", largura: 9 },
  { titulo: "Horas de voluntariado", largura: 11 },
  { titulo: "Faltas", largura: 7 },
  { titulo: "Próximas visitas", largura: 9 },
];
export const CABECALHO_VOLUNTARIOS = COLUNAS_VOLUNTARIOS.map((c) => c.titulo);

export type VoluntarioParaExportar = {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  idade: number;
  estado: string;
  encarregado_nome: string | null;
  encarregado_telefone: string | null;
  encarregado_email: string | null;
  criado_em: string;
  interesses: string[];
  stats: Estatistica;
};

export function linhasVoluntarios(vols: VoluntarioParaExportar[]): unknown[][] {
  return vols.map((v) => [
    v.nome,
    v.email,
    v.telefone,
    dataCurta(v.data_nascimento),
    v.idade,
    v.idade < 18 ? "Sim" : "Não",
    v.estado === "ativo" ? "Ativo" : "Inativo",
    v.encarregado_nome,
    v.encarregado_telefone,
    v.encarregado_email,
    dataCurta(v.criado_em),
    v.interesses.join(", "),
    v.stats.feitas,
    Math.round(v.stats.horas * 10) / 10,
    v.stats.faltas,
    v.stats.proximas,
  ]);
}

export const COLUNAS_VISITAS = [
  { titulo: "Data", largura: 11 },
  { titulo: "Início", largura: 7 },
  { titulo: "Fim", largura: 7 },
  { titulo: "Atividade", largura: 30 },
  { titulo: "Estado da visita", largura: 26 },
  { titulo: "Voluntário", largura: 26 },
  { titulo: "Telefone", largura: 16 },
  { titulo: "Email", largura: 28 },
  { titulo: "Estado da resposta", largura: 20 },
  { titulo: "Presença", largura: 10 },
  { titulo: "Motivo (se recusou ou cancelou)", largura: 32 },
];
export const CABECALHO_VISITAS = COLUNAS_VISITAS.map((c) => c.titulo);

export type VisitaParaExportar = {
  data: string;
  inicio: string;
  fim: string;
  atividade: string;
  estado: EstadoVisita;
  alocacoes: { nome: string; telefone: string; email: string; estado: EstadoAlocacao; presenca: string | null; motivo: string | null }[];
};

/** Uma linha por pessoa alocada (uma visita sem ninguém ainda aparece, com as colunas da pessoa vazias). */
export function linhasVisitas(visitas: VisitaParaExportar[]): unknown[][] {
  const ordenadas = [...visitas].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  const linhas: unknown[][] = [];
  for (const v of ordenadas) {
    const base = [dataCurta(v.data), horaTexto(v.inicio), horaTexto(v.fim), v.atividade, ESTADOS_VISITA[v.estado].texto];
    if (v.alocacoes.length === 0) {
      linhas.push([...base, null, null, null, null, null, null]);
      continue;
    }
    for (const a of v.alocacoes) {
      linhas.push([
        ...base,
        a.nome,
        a.telefone,
        a.email,
        ESTADOS_ALOCACAO[a.estado].texto,
        a.presenca === "presente" ? "Presente" : a.presenca === "faltou" ? "Faltou" : null,
        a.motivo,
      ]);
    }
  }
  return linhas;
}

// ---------------------------------------------------------------------------------------------
// Dados tal como chegam da base de dados → o que se exporta. (Funções puras, para se poderem testar.)
// Uma relação embutida pode vir como objeto, como lista de 1 elemento ou como null.
// ---------------------------------------------------------------------------------------------
type Rel<T> = T | T[] | null | undefined;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : (r ?? null));

export type VoluntarioBruto = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  estado: string;
  encarregado_nome: string | null;
  encarregado_telefone: string | null;
  encarregado_email: string | null;
  criado_em: string;
};
export type InteresseBruto = { voluntario_id: string; atividades: Rel<{ nome: string }> };
export type AlocacaoBruta = {
  voluntario_id: string;
  estado: string;
  presenca: string | null;
  visitas: Rel<AlocacaoParaEstatistica["visita"]>;
};

export function prepararVoluntarios(vols: VoluntarioBruto[], interesses: InteresseBruto[], aloc: AlocacaoBruta[], hoje: string): VoluntarioParaExportar[] {
  const stats = estatisticasPorVoluntario(
    aloc
      .map((a) => ({ voluntario_id: a.voluntario_id, estado: a.estado, presenca: a.presenca, visita: um(a.visitas) }))
      .filter((a): a is AlocacaoParaEstatistica => a.visita !== null),
    hoje,
  );
  const interessesDe = new Map<string, string[]>();
  for (const i of interesses) {
    const nome = um(i.atividades)?.nome;
    if (nome) interessesDe.set(i.voluntario_id, [...(interessesDe.get(i.voluntario_id) ?? []), nome]);
  }
  return vols.map((v) => ({
    nome: v.nome,
    email: v.email,
    telefone: v.telefone,
    data_nascimento: v.data_nascimento,
    idade: idadeEm(v.data_nascimento, hoje),
    estado: v.estado,
    encarregado_nome: v.encarregado_nome,
    encarregado_telefone: v.encarregado_telefone,
    encarregado_email: v.encarregado_email,
    criado_em: v.criado_em,
    interesses: interessesDe.get(v.id) ?? [],
    stats: stats.get(v.id) ?? estatisticaVazia(),
  }));
}

export type VisitaBruta = {
  data: string;
  inicio: string;
  fim: string;
  estado: EstadoVisita;
  atividades: Rel<{ nome: string }>;
  /** uma visita tem várias alocações: a base de dados devolve sempre uma lista (ou null) */
  alocacoes:
    | {
        estado: EstadoAlocacao;
        presenca: string | null;
        motivo: string | null;
        voluntarios: Rel<{ nome: string; telefone: string; email: string }>;
      }[]
    | null
    | undefined;
};

export function prepararVisitas(visitas: VisitaBruta[]): VisitaParaExportar[] {
  return visitas.map((v) => ({
    data: v.data,
    inicio: v.inicio,
    fim: v.fim,
    estado: v.estado,
    atividade: um(v.atividades)?.nome ?? "Visita",
    alocacoes: (v.alocacoes ?? []).map((a) => ({
      nome: um(a.voluntarios)?.nome ?? "(conta apagada)",
      telefone: um(a.voluntarios)?.telefone ?? "",
      email: um(a.voluntarios)?.email ?? "",
      estado: a.estado,
      presenca: a.presenca,
      motivo: a.motivo,
    })),
  }));
}
