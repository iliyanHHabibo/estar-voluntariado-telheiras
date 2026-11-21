// Testes do ficheiro Excel: abre-se o .xlsx gerado (é um zip) e lê-se o que lá está. Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { gerarExcel } from "./excel.ts";
import { COLUNAS_VISITAS, COLUNAS_VOLUNTARIOS, linhasVisitas } from "./exportar.ts";

async function abrir(buf: Buffer) {
  const zip = unzipSync(new Uint8Array(buf));
  const ler = (n: string) => (zip[n] ? strFromU8(zip[n]) : "");
  return { ficheiros: Object.keys(zip), folha: ler("xl/worksheets/sheet1.xml"), textos: ler("xl/sharedStrings.xml"), livro: ler("xl/workbook.xml") };
}

test("excel: é um .xlsx válido, com o nome da folha e o cabeçalho", async () => {
  const x = await abrir(await gerarExcel(COLUNAS_VOLUNTARIOS, [], "Voluntários"));
  assert.ok(x.ficheiros.includes("[Content_Types].xml"));
  assert.ok(x.ficheiros.includes("xl/worksheets/sheet1.xml"));
  assert.match(x.livro, /name="Voluntários"/);
  const tudo = x.folha + x.textos;
  for (const c of COLUNAS_VOLUNTARIOS) assert.ok(tudo.includes(c.titulo), c.titulo);
});

test("excel: acentos e caracteres especiais ficam intactos", async () => {
  const x = await abrir(await gerarExcel([{ titulo: "Nome", largura: 10 }], [["Conceição & Irmãos <Lda>"]], "Teste"));
  assert.ok((x.folha + x.textos).includes("Conceição &amp; Irmãos &lt;Lda&gt;"));
});

test("excel: um texto que começa por = fica TEXTO, nunca uma fórmula", async () => {
  const x = await abrir(await gerarExcel([{ titulo: "Nome", largura: 10 }], [['=HYPERLINK("http://mau.pt","clica")'], ["+351 912 345 678"]], "Teste"));
  assert.ok(!x.folha.includes("<f>"), "não pode haver fórmulas na folha");
  // as duas linhas de dados (A2, A3) estão marcadas como texto (t="s"), e o texto está guardado tal e qual
  assert.match(x.folha, /<c r="A2" t="s">/);
  assert.match(x.folha, /<c r="A3" t="s">/);
  assert.ok(x.textos.includes('<t>=HYPERLINK("http://mau.pt","clica")</t>'));
  assert.ok(x.textos.includes("<t>+351 912 345 678</t>"));
});

test("excel: números ficam números (dá para somar), vazios ficam vazios", async () => {
  const x = await abrir(await gerarExcel([{ titulo: "A", largura: 5 }, { titulo: "B", largura: 5 }, { titulo: "C", largura: 5 }], [[4.5, null, 3]], "Teste"));
  assert.match(x.folha, /<v>4\.5<\/v>/);
  assert.match(x.folha, /<v>3<\/v>/);
});

test("excel: cabeçalho fixo no topo e nome de folha comprido é cortado a 31 caracteres", async () => {
  const x = await abrir(await gerarExcel(COLUNAS_VISITAS, [], "Visitas de dezembro de 2026 — todas as atividades"));
  assert.match(x.folha, /ySplit="1"/);
  assert.match(x.livro, /name="Visitas de dezembro de 2026 — t"/);
});

test("excel: as linhas das visitas geram-se sem erros", async () => {
  const linhas = linhasVisitas([
    { data: "2026-12-12", inicio: "14:00:00", fim: "15:00:00", atividade: "Clínica", estado: "comunicada",
      alocacoes: [{ nome: "Ana", telefone: "912", email: "a@x.pt", estado: "confirmada", presenca: null, motivo: null }] },
  ]);
  const x = await abrir(await gerarExcel(COLUNAS_VISITAS, linhas, "Visitas"));
  assert.ok((x.folha + x.textos).includes("Comunicada aos voluntários"));
});
