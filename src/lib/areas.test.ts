// Testes dos atalhos entre a área de admin e a conta de voluntário. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { atalhosDeArea } from "./areas.ts";

test("admin que também é voluntário, nas páginas públicas: Admin em destaque e A minha conta ao lado", () => {
  const r = atalhosDeArea("/atividades", true);
  assert.equal(r.principal.href, "/admin");
  assert.equal(r.secundario?.href, "/conta");
});

test("na área de admin, o atalho principal leva à conta de voluntário (e já não oferece o Admin)", () => {
  for (const p of ["/admin", "/admin/planeamento", "/admin/visitas/123"]) {
    const r = atalhosDeArea(p, true);
    assert.equal(r.principal.href, "/conta", p);
    assert.equal(r.principal.rotulo, "A minha conta");
    assert.equal(r.secundario, null, p);
  }
});

test("na conta de voluntário, só se oferece o Admin (já estás na conta)", () => {
  for (const p of ["/conta", "/conta/visitas", "/conta/disponibilidades"]) {
    const r = atalhosDeArea(p, true);
    assert.equal(r.principal.href, "/admin", p);
    assert.equal(r.secundario, null, p);
  }
});

test("admin que ainda não se inscreveu como voluntário: no admin oferece a inscrição", () => {
  const r = atalhosDeArea("/admin/voluntarios", false);
  assert.equal(r.principal.href, "/conta/inscricao");
  assert.equal(r.principal.tipo, "inscricao");
  assert.equal(r.secundario, null);
});

test("admin sem inscrição, fora do admin: só o Admin", () => {
  const r = atalhosDeArea("/", false);
  assert.equal(r.principal.href, "/admin");
  assert.equal(r.secundario, null);
});

test("caminhos parecidos não enganam (/administracao não é /admin; /contactos não é /conta)", () => {
  assert.equal(atalhosDeArea("/administracao", true).principal.href, "/admin");
  assert.equal(atalhosDeArea("/contactos", true).secundario?.href, "/conta");
});
