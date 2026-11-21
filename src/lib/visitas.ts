/**
 * Regras das visitas (lógica pura, testada em visitas.test.ts): estados, quem pode passar para
 * onde, lotação, conflitos de horário, avisos ao criar e o texto para enviar ao responsável.
 */
import { dataPorExtensoMaiuscula, diaDaSemana, horaTexto, hojeLisboa, minutos, rotuloHora } from "./tempo.ts";
import { fechosDoDia, janelasDoDia, type AtividadeBase, type FechoBase, type HorarioBase } from "./disponibilidade.ts";

export type EstadoVisita = "rascunho" | "confirmada_responsavel" | "comunicada" | "realizada" | "cancelada";
export type EstadoAlocacao = "proposta" | "confirmada" | "recusada" | "cancelada";

export const ESTADOS_VISITA: Record<EstadoVisita, { texto: string; cor: string }> = {
  rascunho: { texto: "Rascunho", cor: "bg-cinza text-tinta" },
  confirmada_responsavel: { texto: "Confirmada pelo responsável", cor: "bg-amber-100 text-aviso" },
  comunicada: { texto: "Comunicada aos voluntários", cor: "bg-green-100 text-verde" },
  realizada: { texto: "Realizada", cor: "bg-verde text-white" },
  cancelada: { texto: "Cancelada", cor: "bg-red-50 text-erro" },
};

export const ESTADOS_ALOCACAO: Record<EstadoAlocacao, { texto: string; cor: string }> = {
  proposta: { texto: "A aguardar resposta", cor: "bg-amber-100 text-aviso" },
  confirmada: { texto: "Confirmou", cor: "bg-green-100 text-verde" },
  recusada: { texto: "Disse que não pode", cor: "bg-red-50 text-erro" },
  cancelada: { texto: "Cancelou", cor: "bg-red-50 text-erro" },
};

/** Para que estados se pode mudar a partir de cada um (os que não estão aqui não são permitidos). */
export const TRANSICOES: Record<EstadoVisita, EstadoVisita[]> = {
  rascunho: ["confirmada_responsavel", "cancelada"],
  confirmada_responsavel: ["comunicada", "rascunho", "cancelada"],
  comunicada: ["realizada", "cancelada"],
  realizada: ["comunicada"],
  cancelada: ["rascunho"],
};

export function transicaoPermitida(de: EstadoVisita, para: EstadoVisita): boolean {
  return TRANSICOES[de].includes(para);
}

/** Botões de mudança de estado que mostramos a cada passo, com a explicação para quem os usa. */
export const ACOES_DO_ESTADO: Record<EstadoVisita, { para: EstadoVisita; rotulo: string; ajuda?: string; perigo?: boolean }[]> = {
  rascunho: [
    {
      para: "confirmada_responsavel",
      rotulo: "Marcar como confirmada pelo responsável",
      ajuda: "Usa isto depois de falares com o responsável do local e ele confirmar a visita.",
    },
    { para: "cancelada", rotulo: "Cancelar visita", perigo: true },
  ],
  confirmada_responsavel: [
    {
      para: "comunicada",
      rotulo: "Comunicar aos voluntários",
      ajuda: "Os voluntários alocados recebem um email (com o ficheiro para o calendário do telemóvel) e passam a ver a visita na conta deles, onde a confirmam.",
    },
    { para: "rascunho", rotulo: "Voltar a rascunho" },
    { para: "cancelada", rotulo: "Cancelar visita", perigo: true },
  ],
  comunicada: [
    { para: "realizada", rotulo: "Marcar como realizada", ajuda: "Só depois de a visita acontecer." },
    { para: "cancelada", rotulo: "Cancelar visita", perigo: true, ajuda: "Quem já tinha sido avisado recebe um email a dizer que a visita foi cancelada." },
  ],
  realizada: [{ para: "comunicada", rotulo: "Reabrir (voltar a comunicada)" }],
  cancelada: [{ para: "rascunho", rotulo: "Reativar (voltar a rascunho)" }],
};

/** Regras extra para uma mudança de estado, para além de estar na lista de permitidas. */
export function motivoParaNaoMudar(o: { de: EstadoVisita; para: EstadoVisita; data: string; hoje: string; alocacoesAtivas: number }): string | null {
  if (!transicaoPermitida(o.de, o.para)) return "Essa mudança de estado não é possível.";
  if (o.para === "comunicada" && o.alocacoesAtivas === 0) return "Aloca pelo menos uma pessoa antes de comunicar a visita.";
  if (o.para === "realizada" && o.data > o.hoje) return "Só podes marcar como realizada depois do dia da visita.";
  return null;
}

/** Os voluntários só veem a visita a partir deste estado (espelha a regra da base de dados). */
export function visivelParaVoluntarios(estado: EstadoVisita): boolean {
  return estado === "comunicada" || estado === "realizada" || estado === "cancelada";
}

// ---------------------------------------------------------------- lotação
/** Conta as alocações que "contam" (propostas e confirmadas; quem recusou ou cancelou não). */
export function contarAlocacoes(estados: string[]): { ativas: number; confirmadas: number; propostas: number } {
  const confirmadas = estados.filter((e) => e === "confirmada").length;
  const propostas = estados.filter((e) => e === "proposta").length;
  return { ativas: confirmadas + propostas, confirmadas, propostas };
}

/** São apenas avisos: os admins podem alocar como quiserem. */
export function lotacao(ativas: number, min: number, max: number): { estado: "falta" | "ok" | "excesso"; texto: string } {
  if (ativas < min) return { estado: "falta", texto: `Faltam ${min - ativas} (mínimo ${min})` };
  if (ativas > max) return { estado: "excesso", texto: `${ativas - max} acima do máximo (${max})` };
  return { estado: "ok", texto: "Completa" };
}

// ---------------------------------------------------------------- conflitos
export type Ocupacao = { inicio: string; fim: string; atividade: string };

/** Esta pessoa já tem outra visita nesse dia? Sobreposta no horário, ou só no mesmo dia? */
export function conflito(
  visita: { inicio: string; fim: string },
  outras: Ocupacao[],
): { tipo: "sobrepoe" | "mesmo_dia"; com: Ocupacao } | null {
  const i = minutos(visita.inicio);
  const f = minutos(visita.fim);
  const sobreposta = outras.find((o) => i < minutos(o.fim) && f > minutos(o.inicio));
  if (sobreposta) return { tipo: "sobrepoe", com: sobreposta };
  if (outras.length > 0) return { tipo: "mesmo_dia", com: outras[0] };
  return null;
}

export function descreverConflito(c: NonNullable<ReturnType<typeof conflito>>): string {
  const quando = `${horaTexto(c.com.inicio)}–${horaTexto(c.com.fim)}`;
  return c.tipo === "sobrepoe"
    ? `Já está alocada a outra visita à mesma hora (${c.com.atividade}, ${quando})`
    : `Já tem outra visita nesse dia (${c.com.atividade}, ${quando})`;
}

// ---------------------------------------------------------------- criar/editar visitas
/** Erros que impedem de guardar (ao contrário dos avisos, que só avisam). */
export function erroDeVisita(inicio: string, fim: string): string | null {
  if (minutos(fim) - minutos(inicio) < 60) return "Cada visita dura pelo menos 1 hora.";
  return null;
}

/** Avisos (não bloqueiam): data passada, atividade fechada, fora do horário normal… */
export function avisosDaVisita(o: {
  data: string;
  inicio: string;
  fim: string;
  atividadeId: string;
  atividades: AtividadeBase[];
  horarios: HorarioBase[];
  fechos: FechoBase[];
  hoje?: string;
}): string[] {
  const avisos: string[] = [];
  const hoje = o.hoje ?? hojeLisboa();
  if (o.data < hoje) avisos.push("Esta data já passou.");

  const nome = o.atividades.find((a) => a.id === o.atividadeId)?.nome ?? "A atividade";
  const fecho = fechosDoDia(o.data, o.atividades, o.horarios, o.fechos).find(
    (f) => f.atividade_id === null || f.atividade_id === o.atividadeId,
  );
  if (fecho) {
    avisos.push(`${nome} está fechado nesse dia${fecho.motivo ? ` (${fecho.motivo})` : ""}.`);
    return avisos;
  }

  const janela = janelasDoDia(o.data, o.atividades, o.horarios, o.fechos).find((j) => j.atividade_id === o.atividadeId);
  if (!janela) {
    avisos.push(`${nome} não funciona normalmente ${emDia(o.data)}.`);
  } else if (minutos(o.inicio) < janela.abre || minutos(o.fim) > janela.fecha) {
    avisos.push(`Fora do horário normal de ${nome} (${rotuloHora(janela.abre)}–${rotuloHora(janela.fecha)}).`);
  }
  return avisos;
}

const EM_DIA = ["às segundas-feiras", "às terças-feiras", "às quartas-feiras", "às quintas-feiras", "às sextas-feiras", "aos sábados", "aos domingos"];

function emDia(data: string): string {
  return EM_DIA[diaDaSemana(data) - 1];
}

// ---------------------------------------------------------------- texto para o responsável
/** Mensagem pronta a colar no WhatsApp ou num email para o responsável do local. */
export function textoParaResponsavel(v: {
  atividade: string;
  data: string;
  inicio: string;
  fim: string;
  pessoas: { nome: string; telefone: string; menor: boolean }[];
}): string {
  const linhas = [
    `ESTAR — ${v.atividade}`,
    `${dataPorExtensoMaiuscula(v.data)}, das ${horaTexto(v.inicio)} às ${horaTexto(v.fim)}`,
    "",
  ];
  if (v.pessoas.length === 0) {
    linhas.push("Ainda sem voluntários alocados.");
  } else {
    linhas.push(`Voluntários (${v.pessoas.length}):`);
    for (const p of v.pessoas) linhas.push(`• ${p.nome} — ${p.telefone}${p.menor ? " (menor de idade)" : ""}`);
  }
  return linhas.join("\n");
}
