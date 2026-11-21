// Testes do texto dos emails. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { emailAlocado, emailEquipaResposta, emailEquipaTestemunho, emailPeriodoAberto, emailRemovido, emailVisitaAlterada, emailVisitaCancelada, esc } from "./modelos.ts";

const visita = { atividade: "Clínica de S. José — Unidade 4", morada: "Rua X, 1", data: "2026-12-12", inicio: "14:00:00", fim: "15:30:00" };
const URL = "https://estar.exemplo/conta/visitas";

test("escapar HTML", () => {
  assert.equal(esc(`<script>alert("x")</script> & 'y'`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;");
});

test("alocado: assunto, primeiro nome, dados da visita, link e anexo de calendário", () => {
  const e = emailAlocado({ nome: "Ana Maria Silva", visita, urlVisitas: URL, ics: "BEGIN:VCALENDAR..." });
  assert.equal(e.assunto, "Visita ESTAR: Sábado, 12 de dezembro, 14h");
  assert.ok(e.texto.startsWith("Olá, Ana!"));
  assert.ok(e.texto.includes("Sábado, 12 de dezembro, das 14h às 15h30"));
  assert.ok(e.texto.includes("Rua X, 1"));
  assert.ok(e.texto.includes(URL));
  assert.ok(e.html.includes(`href="${URL}"`));
  assert.ok(e.html.includes("Clínica de S. José — Unidade 4"));
  assert.equal(e.anexos?.[0].nome, "visita-estar.ics");
  assert.match(e.anexos?.[0].tipo ?? "", /text\/calendar/);
});

test("alocado: sem morada e sem anexo também funciona", () => {
  const e = emailAlocado({ nome: "Rui", visita: { ...visita, morada: null }, urlVisitas: URL });
  assert.equal(e.anexos, undefined);
  assert.ok(!e.texto.includes("undefined") && !e.html.includes("undefined") && !e.html.includes("null"));
});

test("nomes e textos maliciosos são escapados no HTML (nada é interpretado)", () => {
  const mau = '<img src=x onerror="alert(1)">';
  const htmls = [
    emailAlocado({ nome: mau, visita: { ...visita, atividade: mau, morada: mau }, urlVisitas: URL }).html,
    emailVisitaCancelada({ nome: mau, visita: { ...visita, atividade: mau }, urlVisitas: URL }).html,
    emailRemovido({ nome: mau, visita: { ...visita, atividade: mau } }).html,
    emailEquipaResposta({ voluntario: mau, resposta: "cancelada", motivo: mau, visita: { ...visita, atividade: mau }, urlVisita: URL }).html,
    emailEquipaTestemunho({ autor: mau, atividade: mau, texto: mau, url: URL }).html,
  ];
  for (const h of htmls) {
    assert.ok(!h.includes("<img"), "não pode haver <img> vindo dos dados");
    assert.ok(h.includes("&lt;img"));
  }
});

test("cancelada, alterada e removido: assuntos claros", () => {
  assert.equal(emailVisitaCancelada({ nome: "Ana", visita, urlVisitas: URL }).assunto, "Visita ESTAR cancelada: Sábado, 12 de dezembro");
  const alt = emailVisitaAlterada({ nome: "Ana", antes: visita, depois: { ...visita, data: "2026-12-13", inicio: "10:00:00", fim: "11:00:00" }, urlVisitas: URL });
  assert.equal(alt.assunto, "Visita ESTAR alterada: agora Domingo, 13 de dezembro, 10h");
  assert.ok(alt.texto.includes("Antes era:") && alt.texto.includes("Sábado, 12 de dezembro, das 14h às 15h30"));
  assert.equal(emailRemovido({ nome: "Ana", visita }).assunto, "Já não estás na visita de Sábado, 12 de dezembro");
});

test("período aberto: mês e data de fecho, sem nomes (vai em cópia oculta para todos)", () => {
  const e = emailPeriodoAberto({ mes: "2026-12-01", fechaEm: "2026-11-25", url: "https://estar.exemplo/conta/disponibilidades" });
  assert.equal(e.assunto, "ESTAR: já podes indicar as tuas disponibilidades para dezembro de 2026");
  assert.ok(e.texto.includes("fecha a 25/11/2026"));
  assert.ok(e.texto.startsWith("Olá!"));
});

test("equipa: cancelamento com e sem motivo", () => {
  const c = emailEquipaResposta({ voluntario: "Ana Silva", resposta: "cancelada", motivo: "Fiquei doente", visita, urlVisita: "https://estar.exemplo/admin/visitas/1" });
  assert.equal(c.assunto, "Ana Silva cancelou a presença — Sábado, 12 de dezembro, 14h");
  assert.ok(c.texto.includes("Motivo: Fiquei doente"));
  const r = emailEquipaResposta({ voluntario: "Rui", resposta: "recusada", motivo: null, visita, urlVisita: "u" });
  assert.ok(r.assunto.startsWith("Rui disse que não pode ir"));
  assert.ok(r.texto.includes("(não indicou)"));
});

test("equipa: testemunho longo é resumido", () => {
  const e = emailEquipaTestemunho({ autor: "Ana", atividade: null, texto: "a".repeat(500), url: "u" });
  assert.ok(e.texto.includes("a".repeat(300) + "…"));
  assert.ok(!e.texto.includes("a".repeat(301)));
});
