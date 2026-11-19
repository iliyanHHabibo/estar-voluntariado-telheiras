// Testes da lógica de datas, disponibilidades e calendário. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diaDaSemana,
  diasDoMes,
  dataPorExtenso,
  hhmm,
  hojeLisboa,
  mesSeguinte,
  minutos,
  opcoesDeHora,
  rotuloHora,
  rotuloMes,
} from "./tempo.ts";
import {
  diasComJanelas,
  intervaloValido,
  janelasDoDia,
  repetirSemanalmente,
  sobrepoe,
  type AtividadeBase,
  type FechoBase,
  type HorarioBase,
} from "./disponibilidade.ts";
import { dobrarLinha, escaparTexto, gerarIcs } from "./ics.ts";

// Os dados iniciais do projeto (supabase/seed.sql)
const CLINICA = "clinica";
const CENTRO = "centro";
const atividades: AtividadeBase[] = [
  { id: CLINICA, nome: "Clínica de S. José" },
  { id: CENTRO, nome: "Centro de Dia" },
];
const horarios: HorarioBase[] = [
  ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({ atividade_id: CLINICA, dia_semana: d, abre: "10:00:00", fecha: "18:00:00" })),
  ...[1, 2, 3, 4, 5].map((d) => ({ atividade_id: CENTRO, dia_semana: d, abre: "10:00:00", fecha: "17:00:00" })),
];
const fechos: FechoBase[] = [
  { atividade_id: CENTRO, data: "2026-12-08" }, // terça, feriado: fecha o Centro de Dia
  { atividade_id: CENTRO, data: "2026-12-25" }, // sexta, Natal
];

test("dia da semana (1 = segunda … 7 = domingo)", () => {
  assert.equal(diaDaSemana("2026-12-07"), 1); // segunda
  assert.equal(diaDaSemana("2026-12-12"), 6); // sábado
  assert.equal(diaDaSemana("2026-12-13"), 7); // domingo
  assert.equal(diaDaSemana("2027-01-01"), 5); // sexta
});

test("dias do mês, incluindo fevereiro e anos bissextos", () => {
  assert.equal(diasDoMes("2026-12-01").length, 31);
  assert.equal(diasDoMes("2026-11-01").length, 30);
  assert.equal(diasDoMes("2027-02-01").length, 28);
  assert.equal(diasDoMes("2028-02-01").length, 29);
  assert.deepEqual(diasDoMes("2026-12-15").slice(0, 2), ["2026-12-01", "2026-12-02"]);
});

test("mês seguinte, com virada de ano", () => {
  assert.equal(mesSeguinte("2026-11-19"), "2026-12-01");
  assert.equal(mesSeguinte("2026-12-31"), "2027-01-01");
});

test("horas: conversões e rótulos", () => {
  assert.equal(minutos("14:30:00"), 870);
  assert.equal(hhmm(870), "14:30");
  assert.equal(hhmm(600), "10:00");
  assert.equal(rotuloHora(840), "14h");
  assert.equal(rotuloHora(870), "14h30");
  assert.deepEqual(opcoesDeHora(600, 720), [600, 630, 660, 690, 720]);
});

test("rótulos em português", () => {
  assert.equal(rotuloMes("2026-12-01"), "dezembro de 2026");
  assert.equal(dataPorExtenso("2026-12-06"), "domingo, 6 de dezembro");
});

test("hoje em Lisboa não é o dia UTC quando passa da meia-noite", () => {
  // 23:30 UTC em dezembro = 23:30 em Lisboa (inverno); 23:30 UTC em julho = 00:30 do dia seguinte (verão)
  assert.equal(hojeLisboa(new Date("2026-12-10T23:30:00Z")), "2026-12-10");
  assert.equal(hojeLisboa(new Date("2026-07-10T23:30:00Z")), "2026-07-11");
});

test("Clínica abre todos os dias; Centro de Dia só em dias úteis", () => {
  const sab = janelasDoDia("2026-12-12", atividades, horarios, fechos);
  assert.deepEqual(sab.map((j) => j.atividade_id), [CLINICA]);
  const seg = janelasDoDia("2026-12-07", atividades, horarios, fechos);
  assert.deepEqual(seg.map((j) => j.atividade_id), [CLINICA, CENTRO]);
  assert.equal(seg[1].abre, 600);
  assert.equal(seg[1].fecha, 1020);
});

test("feriado fecha o Centro de Dia mas não a Clínica", () => {
  const natal = janelasDoDia("2026-12-25", atividades, horarios, fechos);
  assert.deepEqual(natal.map((j) => j.atividade_id), [CLINICA]);
});

test("um fecho sem atividade fecha tudo", () => {
  const j = janelasDoDia("2026-12-24", atividades, horarios, [{ atividade_id: null, data: "2026-12-24" }]);
  assert.equal(j.length, 0);
});

test("intervalo válido: dentro do horário e com pelo menos 1 hora", () => {
  const seg = janelasDoDia("2026-12-07", atividades, horarios, fechos);
  assert.equal(intervaloValido(seg, CLINICA, 840, 960), true); // 14h–16h
  assert.equal(intervaloValido(seg, CLINICA, 600, 1080), true); // 10h–18h (o dia todo)
  assert.equal(intervaloValido(seg, CENTRO, 600, 1080), false); // Centro fecha às 17h
  assert.equal(intervaloValido(seg, CLINICA, 840, 870), false); // só meia hora
  assert.equal(intervaloValido(seg, CLINICA, 540, 660), false); // abre às 10h
  assert.equal(intervaloValido(seg, null, 960, 1020), true); // "qualquer": cabe em alguma
  assert.equal(intervaloValido(seg, null, 1020, 1080), true); // só a Clínica, mas serve
  assert.equal(intervaloValido(seg, null, 1080, 1140), false); // já fechou tudo
});

test("sobreposição: encostar não conta", () => {
  assert.equal(sobrepoe([{ inicio: 840, fim: 900 }], 900, 960), false); // 14–15 e 15–16
  assert.equal(sobrepoe([{ inicio: 840, fim: 900 }], 870, 960), true);
  assert.equal(sobrepoe([{ inicio: 840, fim: 900 }], 780, 840), false);
  assert.equal(sobrepoe([], 840, 900), false);
});

test("repetir todas as terças de dezembro de 2026 (Centro de Dia, 14h–16h)", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({
    dias,
    diaSemana: 2,
    atividadeId: CENTRO,
    inicio: 840,
    fim: 960,
    existentes: [],
    hoje: "2026-11-20",
  });
  // terças: 1, 8, 15, 22, 29 → dia 8 é feriado
  assert.deepEqual(r.adicionar.map((x) => x.data), ["2026-12-01", "2026-12-15", "2026-12-22", "2026-12-29"]);
  assert.equal(r.ignoradas.fechado, 0); // a Clínica está aberta, por isso o dia não está "fechado"
  assert.equal(r.ignoradas.foraDoHorario, 1); // mas o Centro de Dia não: 8 de dezembro
});

test("repetir ao sábado no Centro de Dia: nada se adiciona", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 6, atividadeId: CENTRO, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  assert.equal(r.adicionar.length, 0);
  assert.equal(r.ignoradas.foraDoHorario, 4);
});

test("repetir não duplica o que já existe nem inclui dias passados", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({
    dias,
    diaSemana: 1, // segundas: 7, 14, 21, 28
    atividadeId: CLINICA,
    inicio: 840,
    fim: 960,
    existentes: [{ data: "2026-12-14", inicio: 870, fim: 930, atividade_id: null }],
    hoje: "2026-12-10",
  });
  assert.deepEqual(r.adicionar.map((x) => x.data), ["2026-12-21", "2026-12-28"]);
  assert.equal(r.ignoradas.passado, 1); // dia 7
  assert.equal(r.ignoradas.jaTinha, 1); // dia 14
});

test("repetir 'qualquer atividade' aproveita o que estiver aberto", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 6, atividadeId: null, inicio: 600, fim: 720, existentes: [], hoje: "2026-11-20" });
  assert.equal(r.adicionar.length, 4); // 4 sábados em dezembro de 2026 (5, 12, 19, 26)
  assert.ok(r.adicionar.every((x) => x.atividade_id === null));
});

// ---------- ficheiro de calendário ----------
test("ics: escapa vírgulas, ponto e vírgula, barras e quebras de linha", () => {
  assert.equal(escaparTexto("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("ics: linhas longas são dobradas a 75 bytes, sem partir caracteres acentuados", () => {
  const longa = "SUMMARY:" + "ç".repeat(100);
  const dobrada = dobrarLinha(longa);
  for (const l of dobrada.split("\r\n")) assert.ok(new TextEncoder().encode(l).length <= 75, `linha com ${l.length} caracteres`);
  // Desdobrar devolve o original
  assert.equal(dobrada.replaceAll("\r\n ", ""), longa);
});

test("ics: estrutura, horas locais e alarmes", () => {
  const ics = gerarIcs({
    uid: "abc-123",
    titulo: "ESTAR — Clínica de S. José",
    data: "2026-12-12",
    inicio: "14:00:00",
    fim: "15:00:00",
    local: "Rua X, 1, Lisboa",
    agora: new Date("2026-11-20T10:00:00Z"),
  });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("UID:abc-123@estar"));
  assert.ok(ics.includes("DTSTAMP:20261120T100000Z"));
  assert.ok(ics.includes("DTSTART:20261212T140000\r\n"));
  assert.ok(ics.includes("DTEND:20261212T150000\r\n"));
  assert.ok(ics.includes("LOCATION:Rua X\\, 1\\, Lisboa"));
  assert.equal(ics.split("BEGIN:VALARM").length - 1, 2);
  assert.ok(ics.includes("TRIGGER:-P1D") && ics.includes("TRIGGER:-PT2H"));
  assert.ok(!/[^\r]\n/.test(ics), "todas as quebras de linha devem ser CRLF");
});
