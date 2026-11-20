/** Linhas dos ficheiros de exportação (Excel). Lógica pura, testada em exportar.test.ts. */
import { dataCurta, horaTexto } from "./tempo.ts";
import { ESTADOS_ALOCACAO, ESTADOS_VISITA, type EstadoAlocacao, type EstadoVisita } from "./visitas.ts";
import { formatarHoras, type Estatistica } from "./voluntarios.ts";

export const CABECALHO_VOLUNTARIOS = [
  "Nome",
  "Email",
  "Telefone",
  "Data de nascimento",
  "Idade",
  "Menor de idade",
  "Estado",
  "Encarregado de educação",
  "Telefone do encarregado",
  "Email do encarregado",
  "Inscrito em",
  "Atividades de interesse",
  "Visitas feitas",
  "Horas de voluntariado",
  "Faltas",
  "Próximas visitas",
];

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
    formatarHoras(v.stats.horas),
    v.stats.faltas,
    v.stats.proximas,
  ]);
}

export const CABECALHO_VISITAS = [
  "Data",
  "Início",
  "Fim",
  "Atividade",
  "Estado da visita",
  "Voluntário",
  "Telefone",
  "Email",
  "Estado da resposta",
  "Presença",
  "Motivo (se recusou ou cancelou)",
];

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
