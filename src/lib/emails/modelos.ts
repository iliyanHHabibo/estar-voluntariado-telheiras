/**
 * Texto dos emails do site (lógica pura, testada em modelos.test.ts).
 * Cada email tem versão HTML (simples, legível no telemóvel) e versão só texto.
 * Tudo o que vem da base de dados é escapado no HTML.
 */
import { dataPorExtensoMaiuscula, horaTexto, rotuloMes, dataCurta } from "../tempo.ts";

export type Email = {
  assunto: string;
  texto: string;
  html: string;
  anexos?: { nome: string; conteudo: string; tipo: string }[];
};

export type VisitaEmail = { atividade: string; morada: string | null; data: string; inicio: string; fim: string };

export function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;
const quando = (v: VisitaEmail) => `${dataPorExtensoMaiuscula(v.data)}, das ${horaTexto(v.inicio)} às ${horaTexto(v.fim)}`;

const RODAPE_TEXTO = "— Equipa ESTAR · Grupo de Jovens da Paróquia de Telheiras";

function envolver(o: { titulo: string; paragrafos: string[]; caixa?: string[]; botao?: { texto: string; url: string }; nota?: string }): string {
  const p = (h: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${h}</p>`;
  const caixa = o.caixa
    ? `<div style="background:#f1f2ef;border-radius:12px;padding:16px;margin:0 0 20px">${o.caixa.map((l) => `<p style="margin:0 0 6px;font-size:16px">${l}</p>`).join("")}</div>`
    : "";
  const botao = o.botao
    ? `<p style="margin:8px 0 24px"><a href="${esc(o.botao.url)}" style="display:inline-block;background:#00c060;color:#101512;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(o.botao.texto)}</a></p>`
    : "";
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#ffffff">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;padding:24px;color:#101512">
<h2 style="color:#0b5534;margin:0 0 20px">${o.titulo}</h2>
${o.paragrafos.map(p).join("\n")}
${caixa}${botao}${o.nota ? `<p style="font-size:14px;color:#3d4540">${o.nota}</p>` : ""}
<p style="color:#3d4540;font-size:13px;margin-top:28px">${esc(RODAPE_TEXTO)}</p>
</div></body></html>`;
}

function caixaVisita(v: VisitaEmail): string[] {
  return [
    `<strong>${esc(v.atividade)}</strong>`,
    esc(quando(v)),
    ...(v.morada ? [esc(v.morada)] : []),
  ];
}

function textoVisita(v: VisitaEmail): string {
  return [v.atividade, quando(v), ...(v.morada ? [v.morada] : [])].map((l) => `  ${l}`).join("\n");
}

// ------------------------------------------------------------------ para os voluntários
export function emailAlocado(o: { nome: string; visita: VisitaEmail; urlVisitas: string; ics?: string }): Email {
  const ola = `Olá, ${primeiroNome(o.nome)}!`;
  return {
    assunto: `Visita ESTAR: ${dataPorExtensoMaiuscula(o.visita.data)}, ${horaTexto(o.visita.inicio)}`,
    texto: [
      ola,
      "",
      "Foste incluído/a nesta visita:",
      textoVisita(o.visita),
      "",
      "Confirma (ou diz-nos que não podes) na tua área do site:",
      o.urlVisitas,
      "",
      ...(o.ics ? ["Em anexo vai o ficheiro para adicionares a visita ao calendário do telemóvel.", ""] : []),
      RODAPE_TEXTO,
    ].join("\n"),
    html: envolver({
      titulo: esc(ola),
      paragrafos: ["Foste incluído/a nesta visita:"],
      caixa: caixaVisita(o.visita),
      botao: { texto: "Confirmar ou dizer que não posso", url: o.urlVisitas },
      nota: o.ics ? "Em anexo vai o ficheiro para adicionares a visita ao calendário do telemóvel." : undefined,
    }),
    anexos: o.ics ? [{ nome: "visita-estar.ics", conteudo: o.ics, tipo: "text/calendar; charset=utf-8; method=PUBLISH" }] : undefined,
  };
}

export function emailVisitaCancelada(o: { nome: string; visita: VisitaEmail; urlVisitas: string }): Email {
  const ola = `Olá, ${primeiroNome(o.nome)}.`;
  return {
    assunto: `Visita ESTAR cancelada: ${dataPorExtensoMaiuscula(o.visita.data)}`,
    texto: [ola, "", "Esta visita foi cancelada pela equipa:", textoVisita(o.visita), "", "Não precisas de fazer nada. Obrigado pela disponibilidade!", "", RODAPE_TEXTO].join("\n"),
    html: envolver({
      titulo: esc(ola),
      paragrafos: ["Esta visita foi <strong>cancelada</strong> pela equipa:"],
      caixa: caixaVisita(o.visita),
      nota: "Não precisas de fazer nada. Obrigado pela disponibilidade!",
      botao: { texto: "Ver as minhas visitas", url: o.urlVisitas },
    }),
  };
}

export function emailVisitaAlterada(o: { nome: string; antes: VisitaEmail; depois: VisitaEmail; urlVisitas: string; ics?: string }): Email {
  const ola = `Olá, ${primeiroNome(o.nome)}.`;
  return {
    assunto: `Visita ESTAR alterada: agora ${dataPorExtensoMaiuscula(o.depois.data)}, ${horaTexto(o.depois.inicio)}`,
    texto: [ola, "", "Uma visita em que estás mudou. Passa a ser:", textoVisita(o.depois), "", "Antes era:", textoVisita(o.antes), "", "Se já não puderes ir, avisa-nos no site:", o.urlVisitas, "", RODAPE_TEXTO].join("\n"),
    html: envolver({
      titulo: esc(ola),
      paragrafos: ["Uma visita em que estás <strong>mudou</strong>. Passa a ser:"],
      caixa: caixaVisita(o.depois),
      botao: { texto: "Se já não puderes, avisa-nos", url: o.urlVisitas },
      nota: `Antes era: ${esc(quando(o.antes))} (${esc(o.antes.atividade)}).`,
    }),
    anexos: o.ics ? [{ nome: "visita-estar.ics", conteudo: o.ics, tipo: "text/calendar; charset=utf-8; method=PUBLISH" }] : undefined,
  };
}

export function emailRemovido(o: { nome: string; visita: VisitaEmail }): Email {
  const ola = `Olá, ${primeiroNome(o.nome)}.`;
  return {
    assunto: `Já não estás na visita de ${dataPorExtensoMaiuscula(o.visita.data)}`,
    texto: [ola, "", "A equipa reorganizou as pessoas e já não estás nesta visita:", textoVisita(o.visita), "", "Obrigado pela disponibilidade!", "", RODAPE_TEXTO].join("\n"),
    html: envolver({
      titulo: esc(ola),
      paragrafos: ["A equipa reorganizou as pessoas e <strong>já não estás</strong> nesta visita:"],
      caixa: caixaVisita(o.visita),
      nota: "Obrigado pela disponibilidade!",
    }),
  };
}

/** Enviado a todos (em cópia oculta): ninguém vê os endereços dos outros. */
export function emailPeriodoAberto(o: { mes: string; fechaEm: string; url: string }): Email {
  const mes = rotuloMes(o.mes);
  return {
    assunto: `ESTAR: já podes indicar as tuas disponibilidades para ${mes}`,
    texto: ["Olá!", "", `Já podes indicar quando estás disponível em ${mes}.`, `A recolha fecha a ${dataCurta(o.fechaEm)}.`, "", o.url, "", RODAPE_TEXTO].join("\n"),
    html: envolver({
      titulo: "Olá!",
      paragrafos: [`Já podes indicar quando estás disponível em <strong>${esc(mes)}</strong>.`, `A recolha fecha a <strong>${esc(dataCurta(o.fechaEm))}</strong>.`],
      botao: { texto: "Indicar disponibilidades", url: o.url },
    }),
  };
}

// ------------------------------------------------------------------ para a equipa (caixa do ESTAR)
export function emailEquipaResposta(o: { voluntario: string; resposta: "recusada" | "cancelada"; motivo: string | null; visita: VisitaEmail; urlVisita: string }): Email {
  const acao = o.resposta === "cancelada" ? "cancelou a presença" : "disse que não pode ir";
  return {
    assunto: `${o.voluntario} ${acao} — ${dataPorExtensoMaiuscula(o.visita.data)}, ${horaTexto(o.visita.inicio)}`,
    texto: [`${o.voluntario} ${acao} nesta visita:`, textoVisita(o.visita), "", `Motivo: ${o.motivo ?? "(não indicou)"}`, "", `Ver a visita: ${o.urlVisita}`].join("\n"),
    html: envolver({
      titulo: "Resposta a uma visita",
      paragrafos: [`<strong>${esc(o.voluntario)}</strong> ${acao} nesta visita:`],
      caixa: [...caixaVisita(o.visita), `Motivo: ${o.motivo ? esc(o.motivo) : "<em>não indicou</em>"}`],
      botao: { texto: "Ver a visita e alocar outra pessoa", url: o.urlVisita },
    }),
  };
}

export function emailEquipaTestemunho(o: { autor: string; atividade: string | null; texto: string; url: string }): Email {
  const excerto = o.texto.length > 300 ? `${o.texto.slice(0, 300)}…` : o.texto;
  return {
    assunto: `Novo testemunho de ${o.autor} para rever`,
    texto: [`${o.autor} enviou um testemunho${o.atividade ? ` (${o.atividade})` : ""}:`, "", excerto, "", `Rever: ${o.url}`].join("\n"),
    html: envolver({
      titulo: "Novo testemunho para rever",
      paragrafos: [`<strong>${esc(o.autor)}</strong> enviou um testemunho${o.atividade ? ` (${esc(o.atividade)})` : ""}:`],
      caixa: [esc(excerto).replace(/\n/g, "<br>")],
      botao: { texto: "Rever testemunho", url: o.url },
    }),
  };
}
