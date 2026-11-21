/**
 * Ficheiros Excel (.xlsx) para as exportações.
 *
 * Porquê .xlsx e não CSV: abre igual em qualquer Excel (o CSV depende das definições de região:
 * num Excel em inglês aparecia tudo numa coluna), no Numbers e no Google Sheets; e cada célula
 * é gravada com o seu tipo, por isso um texto que comece por "=" fica texto (não é executado como fórmula).
 */
import writeExcelFile from "write-excel-file/node";

export type Coluna = { titulo: string; largura: number };

type Celula = { value: string | number; type?: StringConstructor | NumberConstructor; fontWeight?: "bold" } | null;

function celula(v: unknown): Celula {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return { value: v, type: Number };
  return { value: String(v), type: String };
}

/** Gera o ficheiro: cabeçalho a negrito e fixo no topo, larguras de coluna, uma folha. */
export async function gerarExcel(colunas: Coluna[], linhas: unknown[][], folha: string): Promise<Buffer> {
  const dados: Celula[][] = [
    colunas.map((c) => ({ value: c.titulo, type: String, fontWeight: "bold" as const })),
    ...linhas.map((l) => colunas.map((_, i) => celula(l[i]))),
  ];
  return writeExcelFile(dados, {
    sheet: folha.slice(0, 31), // o Excel não aceita nomes de folha com mais de 31 caracteres
    columns: colunas.map((c) => ({ width: c.largura })),
    stickyRowsCount: 1,
  }).toBuffer();
}

export const TIPO_EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
