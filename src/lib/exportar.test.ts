// Testes das linhas de exportação. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CABECALHO_VISITAS, CABECALHO_VOLUNTARIOS, linhasVisitas, linhasVoluntarios, type VisitaParaExportar } from "./exportar.ts";
import { gerarCsv } from "./csv.ts";

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
  assert.deepEqual(linhas[0], ["Ana Silva", "ana@exemplo.pt", "+351 912 345 678", "04/03/1995", 31, "Não", "Ativo", null, null, null, "20/11/2026", "Clínica de S. José, Centro de Dia", 3, "4,5", 1, 2]);
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

test("exportação completa: nomes maliciosos não viram fórmulas no Excel", () => {
  const csv = gerarCsv(CABECALHO_VISITAS, linhasVisitas([{ ...visitas[0], alocacoes: [{ ...visitas[0].alocacoes[0], nome: '=HYPERLINK("http://mau.pt","clica")' }] }]));
  assert.ok(csv.includes(`"'=HYPERLINK(""http://mau.pt"",""clica"")"`));
  assert.ok(!/;=HYPERLINK/.test(csv));
});
