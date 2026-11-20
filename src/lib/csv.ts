/**
 * Geração de ficheiros CSV para abrir no Excel (português: separador ";" e acentos em UTF-8).
 *
 * Segurança: o Excel executa células que começam por = + - @ como fórmulas. Como os nomes e
 * textos vêm dos utilizadores, protegemos essas células (CSV/formula injection).
 */

const PERIGOSAS = /^[=@\t\r]/;
/** "+351 912 345 678" e "-5" são números/telefones inofensivos: não os alteramos */
const NUMERICA = /^[+-]?[0-9][0-9 ]*$/;

export function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let t = typeof valor === "string" ? valor : String(valor);
  if (typeof valor === "string") {
    if (PERIGOSAS.test(t) || (/^[+-]/.test(t) && !NUMERICA.test(t))) t = `'${t}`;
  }
  if (/[;"\r\n]/.test(t)) t = `"${t.replaceAll('"', '""')}"`;
  return t;
}

/** Devolve o texto do ficheiro (com marca UTF-8 para o Excel reconhecer os acentos). */
export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  const todas = [cabecalho, ...linhas];
  return "﻿" + todas.map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";
}
