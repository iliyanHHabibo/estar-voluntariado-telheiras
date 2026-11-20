// Testes do horário em texto, do CSV e dos utilitários de texto. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { descreverHorario } from "./horario.ts";
import { celula, gerarCsv } from "./csv.ts";
import { gerarSlug, linhasParaLista, listaParaLinhas } from "./texto.ts";

const dias = (lista: number[], abre: string, fecha: string) => lista.map((d) => ({ dia_semana: d, abre, fecha }));

test("horário: os casos do ESTAR", () => {
  assert.equal(descreverHorario(dias([1, 2, 3, 4, 5, 6, 7], "10:00:00", "18:00:00")), "Todos os dias, das 10h às 18h");
  assert.equal(descreverHorario(dias([1, 2, 3, 4, 5], "10:00:00", "17:00:00")), "Dias úteis, das 10h às 17h");
});

test("horário: fins de semana, dias soltos e sequências", () => {
  assert.equal(descreverHorario(dias([6, 7], "09:30:00", "12:00:00")), "Fins de semana, das 9h30 às 12h");
  assert.equal(descreverHorario(dias([2, 4], "09:00:00", "12:00:00")), "Terças e quintas, das 9h às 12h");
  assert.equal(descreverHorario(dias([1, 3, 5], "14:00:00", "16:00:00")), "Segundas, quartas e sextas, das 14h às 16h");
  assert.equal(descreverHorario(dias([1, 2, 3], "14:00:00", "16:00:00")), "De segunda a quarta, das 14h às 16h");
  assert.equal(descreverHorario(dias([6], "10:00:00", "13:00:00")), "Sábados, das 10h às 13h");
});

test("horário: horas diferentes em dias diferentes, e sem horário", () => {
  assert.equal(
    descreverHorario([...dias([1, 2, 3, 4, 5], "10:00:00", "17:00:00"), ...dias([6], "10:00:00", "13:00:00")]),
    "Dias úteis, das 10h às 17h; Sábados, das 10h às 13h",
  );
  assert.equal(descreverHorario([]), "Sem horário definido");
});

test("csv: separador ;, aspas e quebras de linha ficam escapados", () => {
  assert.equal(celula("a;b"), '"a;b"');
  assert.equal(celula('diz "olá"'), '"diz ""olá"""');
  assert.equal(celula("linha 1\nlinha 2"), '"linha 1\nlinha 2"');
  assert.equal(celula(null), "");
  assert.equal(celula(undefined), "");
  assert.equal(celula(12), "12");
  assert.equal(celula(true), "true");
});

test("csv: fórmulas do Excel são neutralizadas (CSV injection)", () => {
  assert.equal(celula("=HYPERLINK(\"http://x\",\"clica\")"), `"'=HYPERLINK(""http://x"",""clica"")"`);
  assert.equal(celula("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(celula("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(celula("-2+3+cmd|' /C calc'!A0"), "'-2+3+cmd|' /C calc'!A0");
  assert.equal(celula("\t=1+1"), "'\t=1+1");
});

test("csv: telefones e números normais não são alterados", () => {
  assert.equal(celula("+351 913 000 000"), "+351 913 000 000");
  assert.equal(celula("912345678"), "912345678");
  assert.equal(celula(-5), "-5");
  assert.equal(celula("Ana = Maria"), "Ana = Maria"); // só conta quando COMEÇA por =
});

test("csv: ficheiro completo (BOM, CRLF, cabeçalho)", () => {
  const f = gerarCsv(["Nome", "Telefone"], [["Ana; Silva", "912"], ["=1+1", ""]]);
  assert.equal(f, '﻿Nome;Telefone\r\n"Ana; Silva";912\r\n\'=1+1;\r\n');
});

test("texto: uma linha por item, sem linhas vazias", () => {
  assert.deepEqual(linhasParaLista("  a  \n\n b\r\nc \n"), { itens: ["a", "b", "c"] });
  assert.equal(listaParaLinhas(["a", "b"]), "a\nb");
  assert.equal(listaParaLinhas(null), "");
});

test("texto: limites de linhas e de letras", () => {
  assert.match(linhasParaLista("a\nb\nc", { max: 2 }).erro ?? "", /No máximo 2 linhas/);
  assert.match(linhasParaLista("x".repeat(301)).erro ?? "", /máximo 300 letras/);
  assert.equal(linhasParaLista("x".repeat(300)).erro, undefined);
});

test("slug: sem acentos, minúsculas e hífenes; cabe na regra da base de dados", () => {
  const regra = /^[a-z0-9-]{2,60}$/;
  assert.equal(gerarSlug("Clínica de S. José — Unidade 4"), "clinica-de-s-jose-unidade-4");
  assert.equal(gerarSlug("  Centro de Dia!  "), "centro-de-dia");
  assert.equal(gerarSlug("Ação & Coração"), "acao-coracao");
  assert.ok(regra.test(gerarSlug("a".repeat(100))));
  assert.equal(gerarSlug("a".repeat(100)).length, 60);
  assert.equal(gerarSlug("???"), ""); // sem letras: quem chama tem de recusar
});
