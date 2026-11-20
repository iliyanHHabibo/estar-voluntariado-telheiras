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
  explicarIgnoradas,
  intervaloValido,
  fechosDoDia,
  janelasDoDia,
  janelasDoDiaDaSemana,
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
  { atividade_id: CENTRO, data: "2026-12-01", motivo: "Restauração da Independência" }, // terça
  { atividade_id: CENTRO, data: "2026-12-08", motivo: "Imaculada Conceição" }, // terça
  { atividade_id: CENTRO, data: "2026-12-25", motivo: "Natal" }, // sexta
  { atividade_id: CENTRO, data: "2026-12-05", motivo: "Dia sem efeito" }, // sábado: o Centro já fechava
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

test("repetir todas as terças de dezembro de 2026 (Centro de Dia, 14h–16h): feriados ficam de fora e são nomeados", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 2, atividadeId: CENTRO, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  // terças: 1, 8, 15, 22, 29 → dias 1 e 8 são feriados
  assert.deepEqual(r.adicionar.map((x) => x.data), ["2026-12-15", "2026-12-22", "2026-12-29"]);
  assert.deepEqual(r.ignoradas.fechado, [
    { data: "2026-12-01", motivo: "Restauração da Independência" },
    { data: "2026-12-08", motivo: "Imaculada Conceição" },
  ]);
  assert.equal(r.ignoradas.foraDoHorario, 0);
});

test("repetir 'qualquer atividade' numa terça de feriado: a Clínica está aberta, por isso adiciona", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 2, atividadeId: null, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  assert.equal(r.adicionar.length, 5);
  assert.equal(r.ignoradas.fechado.length, 0);
});

test("repetir quando tudo fecha num dia: conta como fechado, com o motivo", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, [{ atividade_id: null, data: "2026-12-24", motivo: "Véspera de Natal" }]);
  const r = repetirSemanalmente({ dias, diaSemana: 4, atividadeId: null, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  assert.deepEqual(r.ignoradas.fechado, [{ data: "2026-12-24", motivo: "Véspera de Natal" }]);
  assert.deepEqual(r.adicionar.map((x) => x.data), ["2026-12-03", "2026-12-10", "2026-12-17", "2026-12-31"]); // o dia 24 está fechado
});

test("repetir ao sábado no Centro de Dia: nada se adiciona (não funciona ao fim de semana)", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 6, atividadeId: CENTRO, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  assert.equal(r.adicionar.length, 0);
  assert.equal(r.ignoradas.foraDoHorario, 4);
  assert.equal(r.ignoradas.fechado.length, 0);
});

test("fechos do dia: só mostra o que tira mesmo uma atividade desse dia", () => {
  const f = (data: string) => fechosDoDia(data, atividades, horarios, fechos);
  assert.deepEqual(f("2026-12-08"), [{ atividade_id: CENTRO, nome: "Centro de Dia", motivo: "Imaculada Conceição" }]);
  assert.deepEqual(f("2026-12-05"), []); // sábado: o Centro já estava fechado
  assert.deepEqual(f("2026-12-07"), []); // dia normal
  assert.deepEqual(fechosDoDia("2026-12-24", atividades, horarios, [{ atividade_id: null, data: "2026-12-24", motivo: "Véspera" }]), [
    { atividade_id: null, nome: null, motivo: "Véspera" },
  ]);
});

test("cada dia do mês traz os seus fechos", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  assert.equal(dias[7].fechos[0].motivo, "Imaculada Conceição"); // dia 8
  assert.equal(dias[4].fechos.length, 0); // dia 5 (sábado)
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

test("atalho: ao domingo só existe a Clínica; à terça existem as duas, cada uma com o seu horário", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  assert.deepEqual(janelasDoDiaDaSemana(dias, 7).map((j) => j.atividade_id), [CLINICA]);
  const terca = janelasDoDiaDaSemana(dias, 2);
  assert.deepEqual(terca.map((j) => [j.atividade_id, j.abre, j.fecha]), [
    [CLINICA, 600, 1080],
    [CENTRO, 600, 1020], // fecha às 17h
  ]);
});

test("atalho: um feriado não tira a atividade do dia da semana (há outras terças)", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos); // terça 8 fechada para o Centro
  assert.ok(janelasDoDiaDaSemana(dias, 2).some((j) => j.atividade_id === CENTRO));
});

test("atalho: se a atividade estiver fechada em todas as datas desse dia da semana, não é oferecida", () => {
  const todosOsSabados = ["2026-12-05", "2026-12-12", "2026-12-19", "2026-12-26"].map((data) => ({ atividade_id: CLINICA, data }));
  const dias = diasComJanelas("2026-12-01", atividades, horarios, todosOsSabados);
  assert.deepEqual(janelasDoDiaDaSemana(dias, 6), []);
});

test("aviso do atalho: nomeia os feriados e a atividade fechada", () => {
  const dias = diasComJanelas("2026-12-01", atividades, horarios, fechos);
  const r = repetirSemanalmente({ dias, diaSemana: 2, atividadeId: CENTRO, inicio: 840, fim: 960, existentes: [], hoje: "2026-11-20" });
  assert.equal(
    explicarIgnoradas(r.ignoradas, "Centro de Dia"),
    "1/12 (Restauração da Independência), 8/12 (Imaculada Conceição) — Centro de Dia está fechado",
  );
});

test("aviso do atalho: junta os vários motivos e fica vazio quando não há nada a avisar", () => {
  assert.equal(explicarIgnoradas({ fechado: [], foraDoHorario: 0, jaTinha: 0, passado: 0 }, null), "");
  assert.equal(
    explicarIgnoradas({ fechado: [{ data: "2026-12-25", motivo: null }], foraDoHorario: 1, jaTinha: 2, passado: 1 }, null),
    "25/12 — fechado; 1 dia em que a atividade não funciona a essas horas; 2 dias em que já tinhas disponibilidade; 1 dia que já passou",
  );
  assert.ok(explicarIgnoradas({ fechado: [], foraDoHorario: 0, jaTinha: 0, passado: 3 }, null).endsWith("3 dias que já passaram"));
});
