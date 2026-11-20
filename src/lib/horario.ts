/** Descreve o horário semanal de uma atividade em português: "Dias úteis, das 10h às 17h". */
import { horaTexto } from "./tempo.ts";

export type HorarioSemanal = { dia_semana: number; abre: string; fecha: string };

const PLURAL = ["segundas", "terças", "quartas", "quintas", "sextas", "sábados", "domingos"];
const SINGULAR = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Os dias de um grupo, ditos da forma mais natural (todos os dias, dias úteis, "de segunda a quarta"…). */
function nomearDias(dias: number[]): string {
  const d = [...new Set(dias)].sort((a, b) => a - b);
  const chave = d.join(",");
  if (chave === "1,2,3,4,5,6,7") return "Todos os dias";
  if (chave === "1,2,3,4,5") return "Dias úteis";
  if (chave === "6,7") return "Fins de semana";
  const seguidos = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  if (d.length >= 3 && seguidos) return `De ${SINGULAR[d[0] - 1]} a ${SINGULAR[d[d.length - 1] - 1]}`;
  return capitalizar(listar(d.map((x) => PLURAL[x - 1])));
}

export function descreverHorario(horas: HorarioSemanal[]): string {
  if (horas.length === 0) return "Sem horário definido";
  // Agrupa os dias que têm exatamente as mesmas horas
  const grupos = new Map<string, number[]>();
  for (const h of horas) {
    const k = `${h.abre.slice(0, 5)}-${h.fecha.slice(0, 5)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), h.dia_semana]);
  }
  return [...grupos]
    .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))
    .map(([k, dias]) => {
      const [abre, fecha] = k.split("-");
      return `${nomearDias(dias)}, das ${horaTexto(abre)} às ${horaTexto(fecha)}`;
    })
    .join("; ");
}
