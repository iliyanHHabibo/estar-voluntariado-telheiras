/**
 * Ficheiro de calendário (.ics) para uma visita. Funciona no iPhone, Android e computador.
 *
 * Usamos "hora flutuante" (sem fuso): o telemóvel mostra a visita à hora marcada, onde quer
 * que a pessoa esteja. É o comportamento certo para visitas presenciais em Lisboa.
 * Inclui dois alarmes: 1 dia antes e 2 horas antes.
 */

export type EventoIcs = {
  /** Identificador estável (o id da alocação), para o calendário atualizar em vez de duplicar */
  uid: string;
  titulo: string;
  /** "AAAA-MM-DD" */
  data: string;
  /** "HH:MM" ou "HH:MM:SS" */
  inicio: string;
  fim: string;
  local?: string | null;
  descricao?: string | null;
  /** Para o carimbo de criação; por omissão, agora */
  agora?: Date;
};

/** Escapa texto segundo a RFC 5545 (vírgulas, ponto e vírgula, barras e quebras de linha). */
export function escaparTexto(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Linhas com mais de 75 bytes têm de ser "dobradas" (continuam na linha seguinte com um espaço). */
export function dobrarLinha(linha: string): string {
  const enc = new TextEncoder();
  if (enc.encode(linha).length <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  let limite = 75;
  for (const ch of linha) {
    const b = enc.encode(ch).length;
    if (bytes + b > limite) {
      partes.push(atual);
      atual = "";
      bytes = 0;
      limite = 74; // o espaço inicial das linhas de continuação também conta
    }
    atual += ch;
    bytes += b;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

function dataHoraLocal(data: string, hora: string): string {
  const [h, m] = hora.split(":");
  return `${data.replaceAll("-", "")}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

function carimbo(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function gerarIcs(e: EventoIcs): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ESTAR//Voluntariado//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@estar`,
    `DTSTAMP:${carimbo(e.agora ?? new Date())}`,
    `DTSTART:${dataHoraLocal(e.data, e.inicio)}`,
    `DTEND:${dataHoraLocal(e.data, e.fim)}`,
    `SUMMARY:${escaparTexto(e.titulo)}`,
  ];
  if (e.local) linhas.push(`LOCATION:${escaparTexto(e.local)}`);
  if (e.descricao) linhas.push(`DESCRIPTION:${escaparTexto(e.descricao)}`);
  linhas.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escaparTexto(e.titulo)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escaparTexto(e.titulo)}`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return linhas.map(dobrarLinha).join("\r\n") + "\r\n";
}
