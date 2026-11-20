// Testes das regras das visitas. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avisosDaVisita,
  conflito,
  contarAlocacoes,
  descreverConflito,
  ACOES_DO_ESTADO,
  erroDeVisita,
  motivoParaNaoMudar,
  lotacao,
  textoParaResponsavel,
  transicaoPermitida,
  TRANSICOES,
  visivelParaVoluntarios,
  type EstadoVisita,
} from "./visitas.ts";
import { somarDias, mesAnterior, dataPorExtensoMaiuscula, idadeEm } from "./tempo.ts";
import type { AtividadeBase, FechoBase, HorarioBase } from "./disponibilidade.ts";

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
const fechos: FechoBase[] = [{ atividade_id: CENTRO, data: "2026-12-08", motivo: "Imaculada Conceição" }];
const base = { atividades, horarios, fechos, hoje: "2026-11-20" };

test("datas: somar dias, mês anterior, extenso com maiúscula", () => {
  assert.equal(somarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(somarDias("2026-12-01", -1), "2026-11-30");
  assert.equal(mesAnterior("2027-01-01"), "2026-12-01");
  assert.equal(mesAnterior("2026-12-01"), "2026-11-01");
  assert.equal(dataPorExtensoMaiuscula("2026-12-12"), "Sábado, 12 de dezembro");
});

test("estados: caminho normal e voltas atrás permitidas", () => {
  assert.ok(transicaoPermitida("rascunho", "confirmada_responsavel"));
  assert.ok(transicaoPermitida("confirmada_responsavel", "comunicada"));
  assert.ok(transicaoPermitida("comunicada", "realizada"));
  assert.ok(transicaoPermitida("confirmada_responsavel", "rascunho"));
  assert.ok(transicaoPermitida("cancelada", "rascunho"));
});

test("estados: não se salta passos (um rascunho não é comunicado sem o responsável confirmar)", () => {
  assert.equal(transicaoPermitida("rascunho", "comunicada"), false);
  assert.equal(transicaoPermitida("rascunho", "realizada"), false);
  assert.equal(transicaoPermitida("comunicada", "rascunho"), false); // os voluntários já a viram
  assert.equal(transicaoPermitida("cancelada", "comunicada"), false);
  for (const e of Object.keys(TRANSICOES) as EstadoVisita[]) assert.equal(transicaoPermitida(e, e), false);
});

test("voluntários só veem visitas comunicadas, realizadas ou canceladas", () => {
  assert.equal(visivelParaVoluntarios("rascunho"), false);
  assert.equal(visivelParaVoluntarios("confirmada_responsavel"), false);
  assert.equal(visivelParaVoluntarios("comunicada"), true);
  assert.equal(visivelParaVoluntarios("realizada"), true);
  assert.equal(visivelParaVoluntarios("cancelada"), true);
});

test("lotação: quem recusou ou cancelou não conta", () => {
  const c = contarAlocacoes(["confirmada", "proposta", "proposta", "recusada", "cancelada"]);
  assert.deepEqual(c, { ativas: 3, confirmadas: 1, propostas: 2 });
  assert.deepEqual(contarAlocacoes([]), { ativas: 0, confirmadas: 0, propostas: 0 });
});

test("lotação: mínimo 2 e máximo 5 são só avisos", () => {
  assert.deepEqual(lotacao(1, 2, 5), { estado: "falta", texto: "Faltam 1 (mínimo 2)" });
  assert.equal(lotacao(2, 2, 5).estado, "ok");
  assert.equal(lotacao(5, 2, 5).estado, "ok");
  assert.deepEqual(lotacao(7, 2, 5), { estado: "excesso", texto: "2 acima do máximo (5)" });
});

test("conflitos: sobreposto, só no mesmo dia, ou nenhum (encostar não conta)", () => {
  const outras = [{ inicio: "14:00:00", fim: "15:00:00", atividade: "Centro de Dia" }];
  assert.equal(conflito({ inicio: "14:30", fim: "15:30" }, outras)?.tipo, "sobrepoe");
  assert.equal(conflito({ inicio: "15:00", fim: "16:00" }, outras)?.tipo, "mesmo_dia"); // 14–15 e 15–16
  assert.equal(conflito({ inicio: "10:00", fim: "11:00" }, outras)?.tipo, "mesmo_dia");
  assert.equal(conflito({ inicio: "10:00", fim: "11:00" }, []), null);
  assert.equal(
    descreverConflito(conflito({ inicio: "14:30", fim: "15:30" }, outras)!),
    "Já está alocada a outra visita à mesma hora (Centro de Dia, 14h–15h)",
  );
  assert.equal(
    descreverConflito(conflito({ inicio: "16:00", fim: "17:00" }, outras)!),
    "Já tem outra visita nesse dia (Centro de Dia, 14h–15h)",
  );
});

test("visita: menos de 1 hora é erro", () => {
  assert.equal(erroDeVisita("14:00", "14:30"), "Cada visita dura pelo menos 1 hora.");
  assert.equal(erroDeVisita("14:00", "15:00"), null);
});

test("avisos: visita normal não tem avisos", () => {
  assert.deepEqual(avisosDaVisita({ ...base, data: "2026-12-07", inicio: "14:00", fim: "15:00", atividadeId: CLINICA }), []);
});

test("avisos: feriado, fora do horário, dia sem a atividade e data passada", () => {
  const av = (o: object) => avisosDaVisita({ ...base, data: "2026-12-07", inicio: "14:00", fim: "15:00", atividadeId: CLINICA, ...o });
  assert.deepEqual(av({ data: "2026-12-08", atividadeId: CENTRO }), ["Centro de Dia está fechado nesse dia (Imaculada Conceição)."]);
  assert.deepEqual(av({ atividadeId: CENTRO, inicio: "16:30", fim: "17:30" }), ["Fora do horário normal de Centro de Dia (10h–17h)."]);
  assert.deepEqual(av({ data: "2026-12-12", atividadeId: CENTRO }), ["Centro de Dia não funciona normalmente aos sábados."]);
  assert.deepEqual(av({ data: "2026-12-09", atividadeId: CENTRO, inicio: "07:00", fim: "08:00" }), ["Fora do horário normal de Centro de Dia (10h–17h)."]);
  assert.deepEqual(av({ data: "2026-11-10" }), ["Esta data já passou."]);
});

test("avisos: dá para criar mesmo assim (são só avisos), e vários podem somar-se", () => {
  const r = avisosDaVisita({ ...base, data: "2026-11-10", inicio: "06:00", fim: "07:00", atividadeId: CLINICA });
  assert.equal(r.length, 2);
});

test("texto para o responsável: nomes, telefones e menores identificados", () => {
  const texto = textoParaResponsavel({
    atividade: "Clínica de S. José — Unidade 4",
    data: "2026-12-12",
    inicio: "14:00:00",
    fim: "15:30:00",
    pessoas: [
      { nome: "Ana Silva", telefone: "912 345 678", menor: false },
      { nome: "Carlos Dias", telefone: "933333333", menor: true },
    ],
  });
  assert.equal(
    texto,
    [
      "ESTAR — Clínica de S. José — Unidade 4",
      "Sábado, 12 de dezembro, das 14h às 15h30",
      "",
      "Voluntários (2):",
      "• Ana Silva — 912 345 678",
      "• Carlos Dias — 933333333 (menor de idade)",
    ].join("\n"),
  );
});

test("texto para o responsável: sem ninguém alocado", () => {
  const t = textoParaResponsavel({ atividade: "Centro de Dia", data: "2026-12-07", inicio: "10:00", fim: "11:00", pessoas: [] });
  assert.ok(t.endsWith("Ainda sem voluntários alocados."));
  assert.ok(!t.includes("Voluntários ("));
});

test("idade: faz anos no dia certo", () => {
  assert.equal(idadeEm("2010-12-12", "2026-12-11"), 15);
  assert.equal(idadeEm("2010-12-12", "2026-12-12"), 16);
  assert.equal(idadeEm("2008-02-29", "2026-02-28"), 17);
  assert.equal(idadeEm("1990-01-01", "2026-11-20"), 36);
});

test("todos os botões de estado levam a mudanças que são mesmo permitidas", () => {
  for (const [de, acoes] of Object.entries(ACOES_DO_ESTADO) as [EstadoVisita, typeof ACOES_DO_ESTADO[EstadoVisita]][]) {
    for (const a of acoes) assert.ok(transicaoPermitida(de, a.para), `${de} → ${a.para}`);
    // e não falta nenhuma transição permitida sem botão
    assert.deepEqual(acoes.map((a) => a.para).sort(), [...TRANSICOES[de]].sort(), `botões de ${de}`);
  }
});

test("não se comunica uma visita sem ninguém alocado, nem se marca como realizada antes do dia", () => {
  const b = { data: "2026-12-12", hoje: "2026-12-01", alocacoesAtivas: 0 };
  assert.equal(motivoParaNaoMudar({ ...b, de: "confirmada_responsavel", para: "comunicada" }), "Aloca pelo menos uma pessoa antes de comunicar a visita.");
  assert.equal(motivoParaNaoMudar({ ...b, alocacoesAtivas: 2, de: "confirmada_responsavel", para: "comunicada" }), null);
  assert.equal(motivoParaNaoMudar({ ...b, alocacoesAtivas: 2, de: "comunicada", para: "realizada" }), "Só podes marcar como realizada depois do dia da visita.");
  assert.equal(motivoParaNaoMudar({ ...b, hoje: "2026-12-12", alocacoesAtivas: 2, de: "comunicada", para: "realizada" }), null);
  assert.equal(motivoParaNaoMudar({ ...b, de: "rascunho", para: "comunicada" }), "Essa mudança de estado não é possível.");
});
