/** Pequenos utilitários de texto para os formulários de admin. */

/** Texto com um item por linha → lista (sem linhas vazias). Devolve erro se houver demasiados ou muito longos. */
export function linhasParaLista(texto: string, opcoes: { max?: number; maxCaracteres?: number } = {}): { itens: string[]; erro?: string } {
  const max = opcoes.max ?? 20;
  const maxCaracteres = opcoes.maxCaracteres ?? 300;
  const itens = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (itens.length > max) return { itens: [], erro: `No máximo ${max} linhas.` };
  if (itens.some((i) => i.length > maxCaracteres)) return { itens: [], erro: `Cada linha pode ter no máximo ${maxCaracteres} letras.` };
  return { itens };
}

export const listaParaLinhas = (itens: string[] | null | undefined): string => (itens ?? []).join("\n");

/** "Centro de Dia São José" → "centro-de-dia-sao-jose" (o identificador usado nos endereços). */
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
