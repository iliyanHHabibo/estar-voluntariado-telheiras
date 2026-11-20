// Testes das estatísticas e da pesquisa de voluntários. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { estatisticasPorVoluntario, filtrarVoluntarios, formatarHoras, normalizar, type AlocacaoParaEstatistica } from "./voluntarios.ts";

const v = (id: string, estado: string, presenca: string | null, data: string, inicio: string, fim: string, vEstado: string): AlocacaoParaEstatistica => ({
  voluntario_id: id,
  estado,
  presenca,
  visita: { data, inicio, fim, estado: vEstado },
});
const HOJE = "2026-12-10";

test("estatísticas: visitas feitas e horas só contam quando esteve presente", () => {
  const e = estatisticasPorVoluntario(
    [
      v("ana", "confirmada", "presente", "2026-12-01", "14:00:00", "15:30:00", "realizada"),
      v("ana", "confirmada", "presente", "2026-12-03", "10:00:00", "11:00:00", "realizada"),
      v("ana", "confirmada", "faltou", "2026-12-05", "10:00:00", "11:00:00", "realizada"),
      v("ana", "confirmada", null, "2026-12-07", "10:00:00", "11:00:00", "realizada"), // sem presença registada
    ],
    HOJE,
  ).get("ana")!;
  assert.equal(e.feitas, 2);
  assert.equal(e.faltas, 1);
  assert.equal(e.horas, 2.5);
  assert.equal(e.proximas, 0);
});

test("estatísticas: próximas visitas e as que esperam resposta", () => {
  const e = estatisticasPorVoluntario(
    [
      v("bia", "confirmada", null, "2026-12-12", "14:00:00", "15:00:00", "comunicada"),
      v("bia", "proposta", null, "2026-12-14", "14:00:00", "15:00:00", "comunicada"),
      v("bia", "proposta", null, "2026-12-16", "14:00:00", "15:00:00", "confirmada_responsavel"), // ainda não comunicada: ela não sabe
      v("bia", "recusada", null, "2026-12-18", "14:00:00", "15:00:00", "comunicada"),
      v("bia", "confirmada", null, "2026-12-09", "14:00:00", "15:00:00", "comunicada"), // já passou
      v("bia", "confirmada", null, "2026-12-10", "14:00:00", "15:00:00", "comunicada"), // hoje conta
    ],
    HOJE,
  ).get("bia")!;
  assert.equal(e.proximas, 3);
  assert.equal(e.porResponder, 1);
});

test("estatísticas: visitas canceladas não contam para nada", () => {
  const e = estatisticasPorVoluntario(
    [
      v("cris", "confirmada", "presente", "2026-12-01", "10:00:00", "11:00:00", "cancelada"),
      v("cris", "confirmada", null, "2026-12-20", "10:00:00", "11:00:00", "cancelada"),
    ],
    HOJE,
  ).get("cris");
  assert.equal(e, undefined);
});

test("estatísticas: cada voluntário tem as suas", () => {
  const m = estatisticasPorVoluntario(
    [
      v("a", "confirmada", "presente", "2026-12-01", "10:00:00", "11:00:00", "realizada"),
      v("b", "confirmada", "presente", "2026-12-01", "10:00:00", "12:00:00", "realizada"),
    ],
    HOJE,
  );
  assert.equal(m.get("a")!.horas, 1);
  assert.equal(m.get("b")!.horas, 2);
});

test("horas em português", () => {
  assert.equal(formatarHoras(2.5), "2,5");
  assert.equal(formatarHoras(3), "3");
  assert.equal(formatarHoras(0.3333333), "0,3");
  assert.equal(formatarHoras(0), "0");
});

const lista = [
  { nome: "João Silva", email: "joao@exemplo.pt", telefone: "+351 912 345 678", estado: "ativo", menor: false },
  { nome: "Maria Conceição", email: "maria.c@exemplo.pt", telefone: "933 000 111", estado: "ativo", menor: true },
  { nome: "Rui Matos", email: "rui@exemplo.pt", telefone: "966000222", estado: "inativo", menor: false },
];

test("pesquisa: ignora acentos e maiúsculas", () => {
  assert.equal(normalizar("  Conceição "), "conceicao");
  assert.deepEqual(filtrarVoluntarios(lista, { q: "joao" }).map((x) => x.nome), ["João Silva"]);
  assert.deepEqual(filtrarVoluntarios(lista, { q: "CONCEICAO" }).map((x) => x.nome), ["Maria Conceição"]);
});

test("pesquisa: por email e por telefone (ignora espaços e o +351)", () => {
  assert.deepEqual(filtrarVoluntarios(lista, { q: "maria.c@" }).map((x) => x.nome), ["Maria Conceição"]);
  assert.deepEqual(filtrarVoluntarios(lista, { q: "912345678" }).map((x) => x.nome), ["João Silva"]);
  assert.deepEqual(filtrarVoluntarios(lista, { q: "912 345" }).map((x) => x.nome), ["João Silva"]);
  assert.deepEqual(filtrarVoluntarios(lista, { q: "000" }).map((x) => x.nome), ["Maria Conceição", "Rui Matos"]);
  assert.deepEqual(filtrarVoluntarios(lista, { q: "12" }), []); // poucos dígitos: não confundir com telefones
});

test("filtros: estado e menores", () => {
  assert.deepEqual(filtrarVoluntarios(lista, { estado: "inativo" }).map((x) => x.nome), ["Rui Matos"]);
  assert.equal(filtrarVoluntarios(lista, { estado: "todos" }).length, 3);
  assert.deepEqual(filtrarVoluntarios(lista, { menor: true }).map((x) => x.nome), ["Maria Conceição"]);
  assert.deepEqual(filtrarVoluntarios(lista, { estado: "ativo", q: "silva" }).map((x) => x.nome), ["João Silva"]);
  assert.equal(filtrarVoluntarios(lista, {}).length, 3);
});
