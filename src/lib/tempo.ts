/**
 * Datas e horas. Funções simples, sem dependências, para o calendário de
 * disponibilidades e para as visitas.
 *
 * Convenções:
 *  - datas em texto "AAAA-MM-DD" (sem horas, para não haver surpresas com fusos horários);
 *  - horas em minutos desde a meia-noite (14h30 = 870) ou texto "HH:MM".
 */

export const DIAS_SEMANA_CURTO = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const DIAS_SEMANA_LONGO = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];
export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Hoje, em Lisboa, como "AAAA-MM-DD" (o servidor pode estar noutro fuso). */
export function hojeLisboa(agora: Date = new Date()): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
}

/** Dia da semana ISO: 1 = segunda … 7 = domingo. */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  return js === 0 ? 7 : js;
}

/** Todas as datas de um mês. `mes` = "AAAA-MM-01" (ou qualquer dia desse mês). */
export function diasDoMes(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number);
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${a}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
}

export function primeiroDiaDoMes(data: string): string {
  return data.slice(0, 8) + "01";
}

/** "2026-12-01" → "dezembro de 2026" */
export function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** "2026-12-06" → "06/12/2026" */
export function dataCurta(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-12-06" → "sábado, 6 de dezembro" */
export function dataPorExtenso(data: string): string {
  const [, m, d] = data.split("-").map(Number);
  return `${DIAS_SEMANA_LONGO[diaDaSemana(data) - 1]}, ${d} de ${MESES[m - 1]}`;
}

/** "14:30" ou "14:30:00" → 870 */
export function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 870 → "14:30" (formato para a base de dados) */
export function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** 870 → "14h30"; 840 → "14h" (formato para as pessoas) */
export function rotuloHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "14:00:00" → "14h" */
export function horaTexto(hora: string): string {
  return rotuloHora(minutos(hora));
}

/** Horas possíveis entre `de` e `ate` (inclusive), de `passo` em `passo` minutos. */
export function opcoesDeHora(de: number, ate: number, passo = 30): number[] {
  const r: number[] = [];
  for (let t = de; t <= ate; t += passo) r.push(t);
  return r;
}

/** O mês a seguir: "2026-11-15" → "2026-12-01" */
export function mesSeguinte(data: string): string {
  const [a, m] = data.split("-").map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Soma (ou subtrai) dias a uma data "AAAA-MM-DD". */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** O mês anterior: "2026-12-01" → "2026-11-01" */
export function mesAnterior(data: string): string {
  const [a, m] = data.split("-").map(Number);
  return m === 1 ? `${a - 1}-12-01` : `${a}-${String(m - 1).padStart(2, "0")}-01`;
}

/** "Sábado, 12 de dezembro" (primeira letra maiúscula, para começar frases) */
export function dataPorExtensoMaiuscula(data: string): string {
  const t = dataPorExtenso(data);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Idade em anos completos numa data (por omissão, hoje em Lisboa). */
export function idadeEm(nascimento: string, em: string = hojeLisboa()): number {
  const [na, nm, nd] = nascimento.slice(0, 10).split("-").map(Number);
  const [ea, em_, ed] = em.split("-").map(Number);
  let idade = ea - na;
  if (em_ < nm || (em_ === nm && ed < nd)) idade--;
  return idade;
}
