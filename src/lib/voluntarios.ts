/** Estatísticas e pesquisa de voluntários (lógica pura, testada em voluntarios.test.ts). */
import { minutos } from "./tempo.ts";

export type AlocacaoParaEstatistica = {
  voluntario_id: string;
  estado: string;
  presenca: string | null;
  visita: { data: string; inicio: string; fim: string; estado: string };
};

export type Estatistica = {
  /** visitas em que esteve presente */
  feitas: number;
  faltas: number;
  /** horas de voluntariado (só visitas em que esteve presente) */
  horas: number;
  /** visitas comunicadas, de hoje para a frente, confirmadas ou por confirmar */
  proximas: number;
  /** destas, as que ainda esperam resposta dele/dela */
  porResponder: number;
};

const VAZIA: Estatistica = { feitas: 0, faltas: 0, horas: 0, proximas: 0, porResponder: 0 };

export function estatisticasPorVoluntario(alocacoes: AlocacaoParaEstatistica[], hoje: string): Map<string, Estatistica> {
  const mapa = new Map<string, Estatistica>();
  for (const a of alocacoes) {
    if (a.visita.estado === "cancelada") continue; // visitas canceladas não contam para nada
    const e = mapa.get(a.voluntario_id) ?? { ...VAZIA };
    if (a.presenca === "presente") {
      e.feitas++;
      e.horas += (minutos(a.visita.fim) - minutos(a.visita.inicio)) / 60;
    } else if (a.presenca === "faltou") {
      e.faltas++;
    }
    if (a.visita.estado === "comunicada" && a.visita.data >= hoje && (a.estado === "confirmada" || a.estado === "proposta")) {
      e.proximas++;
      if (a.estado === "proposta") e.porResponder++;
    }
    mapa.set(a.voluntario_id, e);
  }
  return mapa;
}

export const estatisticaVazia = (): Estatistica => ({ ...VAZIA });

/** "1,5" em vez de "1.5"; sem casas decimais se for inteiro. */
export function formatarHoras(h: number): string {
  const arredondado = Math.round(h * 10) / 10;
  return String(arredondado).replace(".", ",");
}

/** Minúsculas e sem acentos, para pesquisar "joao" e encontrar "João". */
export function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type VoluntarioPesquisavel = { nome: string; email: string; telefone: string; estado: string; menor: boolean };

export function filtrarVoluntarios<T extends VoluntarioPesquisavel>(
  lista: T[],
  filtro: { q?: string; estado?: string; menor?: boolean },
): T[] {
  const q = normalizar(filtro.q ?? "");
  const so_digitos = q.replace(/\D/g, "");
  return lista.filter((v) => {
    if (filtro.estado && filtro.estado !== "todos" && v.estado !== filtro.estado) return false;
    if (filtro.menor && !v.menor) return false;
    if (!q) return true;
    if (normalizar(v.nome).includes(q) || normalizar(v.email).includes(q)) return true;
    // Telefone: compara só os números (ignora espaços e o +351)
    return so_digitos.length >= 3 && v.telefone.replace(/\D/g, "").includes(so_digitos);
  });
}
