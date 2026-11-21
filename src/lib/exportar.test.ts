// Testes das linhas de exportação. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CABECALHO_VISITAS, CABECALHO_VOLUNTARIOS, linhasVisitas, linhasVoluntarios, prepararVisitas, prepararVoluntarios, type VisitaParaExportar } from "./exportar.ts";

test("voluntários: uma linha por pessoa, com o mesmo número de colunas que o cabeçalho", () => {
  const linhas = linhasVoluntarios([
    {
      nome: "Ana Silva",
      email: "ana@exemplo.pt",
      telefone: "+351 912 345 678",
      data_nascimento: "1995-03-04",
      idade: 31,
      estado: "ativo",
      encarregado_nome: null,
      encarregado_telefone: null,
      encarregado_email: null,
      criado_em: "2026-11-20T10:00:00+00:00",
      interesses: ["Clínica de S. José", "Centro de Dia"],
      stats: { feitas: 3, faltas: 1, horas: 4.5, proximas: 2, porResponder: 1 },
    },
    {
      nome: "Carlos Dias",
      email: "carlos@exemplo.pt",
      telefone: "933333333",
      data_nascimento: "2010-01-01",
      idade: 16,
      estado: "inativo",
      encarregado_nome: "Pai do Carlos",
      encarregado_telefone: "966666666",
      encarregado_email: null,
      criado_em: "2026-11-21T10:00:00+00:00",
      interesses: [],
      stats: { feitas: 0, faltas: 0, horas: 0, proximas: 0, porResponder: 0 },
    },
  ]);
  assert.equal(linhas.length, 2);
  for (const l of linhas) assert.equal(l.length, CABECALHO_VOLUNTARIOS.length);
  assert.deepEqual(linhas[0], ["Ana Silva", "ana@exemplo.pt", "+351 912 345 678", "04/03/1995", 31, "Não", "Ativo", null, null, null, "20/11/2026", "Clínica de S. José, Centro de Dia", 3, 4.5, 1, 2]);
  assert.equal(linhas[1][5], "Sim");
  assert.equal(linhas[1][6], "Inativo");
});

const visitas: VisitaParaExportar[] = [
  {
    data: "2026-12-12",
    inicio: "14:00:00",
    fim: "15:30:00",
    atividade: "Clínica de S. José — Unidade 4",
    estado: "comunicada",
    alocacoes: [
      { nome: "Ana Silva", telefone: "912345678", email: "ana@exemplo.pt", estado: "confirmada", presenca: null, motivo: null },
      { nome: "Rui Matos", telefone: "966000222", email: "rui@exemplo.pt", estado: "recusada", presenca: null, motivo: "Tenho um exame" },
    ],
  },
  { data: "2026-12-05", inicio: "10:00:00", fim: "11:00:00", atividade: "Centro de Dia", estado: "rascunho", alocacoes: [] },
];

test("visitas: uma linha por pessoa, ordenadas por data, e visitas sem ninguém também aparecem", () => {
  const linhas = linhasVisitas(visitas);
  assert.equal(linhas.length, 3);
  for (const l of linhas) assert.equal(l.length, CABECALHO_VISITAS.length);
  assert.deepEqual(linhas[0].slice(0, 5), ["05/12/2026", "10h", "11h", "Centro de Dia", "Rascunho"]);
  assert.deepEqual(linhas[0].slice(5), [null, null, null, null, null, null]);
  assert.equal(linhas[1][5], "Ana Silva");
  assert.equal(linhas[1][8], "Confirmou");
  assert.equal(linhas[2][8], "Disse que não pode");
  assert.equal(linhas[2][10], "Tenho um exame");
  assert.deepEqual(linhas[1].slice(1, 3), ["14h", "15h30"]);
});

test("visitas: presença registada", () => {
  const l = linhasVisitas([{ ...visitas[0], alocacoes: [{ ...visitas[0].alocacoes[0], presenca: "presente" }] }]);
  assert.equal(l[0][9], "Presente");
});

// ---- os dados tal como a base de dados os devolve (relações como objeto, lista ou null) ----
const vol = (id: string, nome: string, nasc = "1995-03-04") => ({
  id, nome, email: `${id}@exemplo.pt`, telefone: "912345678", data_nascimento: nasc, estado: "ativo",
  encarregado_nome: null, encarregado_telefone: null, encarregado_email: null, criado_em: "2026-11-20T10:00:00+00:00",
});

test("preparar voluntários: relações como objeto, lista de 1 e null; sem alocações nem interesses", () => {
  const r = prepararVoluntarios(
    [vol("ana", "Ana"), vol("bia", "Bia"), vol("cris", "Cris", "2010-06-01")],
    [
      { voluntario_id: "ana", atividades: { nome: "Clínica" } },
      { voluntario_id: "ana", atividades: [{ nome: "Centro de Dia" }] },
      { voluntario_id: "bia", atividades: null },
    ],
    [
      { voluntario_id: "ana", estado: "confirmada", presenca: "presente", visitas: { data: "2026-12-01", inicio: "10:00:00", fim: "11:30:00", estado: "realizada" } },
      { voluntario_id: "ana", estado: "confirmada", presenca: null, visitas: [{ data: "2026-12-20", inicio: "10:00:00", fim: "11:00:00", estado: "comunicada" }] },
      { voluntario_id: "bia", estado: "confirmada", presenca: null, visitas: null },
    ],
    "2026-12-10",
  );
  assert.equal(r.length, 3);
  assert.deepEqual(r[0].interesses, ["Clínica", "Centro de Dia"]);
  assert.equal(r[0].stats.feitas, 1);
  assert.equal(r[0].stats.horas, 1.5);
  assert.equal(r[0].stats.proximas, 1);
  assert.deepEqual(r[1].interesses, []);
  assert.equal(r[1].stats.feitas, 0);
  assert.equal(r[2].idade, 16);
  assert.equal(linhasVoluntarios(r)[0][0], "Ana");
});

test("preparar voluntários: listas vazias (projeto novo)", () => {
  assert.deepEqual(prepararVoluntarios([], [], [], "2026-12-10"), []);
  assert.deepEqual(linhasVoluntarios([]), []);
});

test("preparar visitas: alocações como lista, objeto, vazias ou null; pessoa apagada", () => {
  const r = prepararVisitas([
    { data: "2026-12-12", inicio: "14:00:00", fim: "15:00:00", estado: "comunicada", atividades: { nome: "Clínica" },
      alocacoes: [
        { estado: "confirmada", presenca: null, motivo: null, voluntarios: { nome: "Ana", telefone: "912", email: "a@x.pt" } },
        { estado: "proposta", presenca: null, motivo: null, voluntarios: [{ nome: "Bia", telefone: "913", email: "b@x.pt" }] },
        { estado: "proposta", presenca: null, motivo: null, voluntarios: null },
      ] },
    { data: "2026-12-13", inicio: "14:00:00", fim: "15:00:00", estado: "rascunho", atividades: null, alocacoes: [] },
    { data: "2026-12-14", inicio: "14:00:00", fim: "15:00:00", estado: "rascunho", atividades: [{ nome: "Centro" }], alocacoes: null },
  ]);
  assert.equal(r[0].alocacoes.length, 3);
  assert.equal(r[0].alocacoes[1].nome, "Bia");
  assert.equal(r[0].alocacoes[2].nome, "(conta apagada)");
  assert.equal(r[1].atividade, "Visita");
  assert.equal(r[2].atividade, "Centro");
  assert.deepEqual(r[2].alocacoes, []);
  assert.equal(linhasVisitas(r).length, 5);
});
