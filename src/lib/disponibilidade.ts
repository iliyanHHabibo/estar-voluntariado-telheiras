/**
 * Regras do calendário de disponibilidades (lógica pura, testada em disponibilidade.test.ts).
 *
 * Estas regras espelham as da base de dados (que é quem decide de facto): ajudam o site a só
 * oferecer opções válidas e a explicar o que foi ignorado, em vez de mostrar um erro técnico.
 */
import { diaDaSemana, diasDoMes, minutos } from "./tempo.ts";

export type AtividadeBase = { id: string; nome: string };
export type HorarioBase = { atividade_id: string; dia_semana: number; abre: string; fecha: string };
export type FechoBase = { atividade_id: string | null; data: string; motivo?: string | null };

/** Um fecho que tira mesmo uma atividade do dia (p.ex. "Natal — Centro de Dia fechado"). */
export type FechoDoDia = {
  /** null = fecha tudo */
  atividade_id: string | null;
  /** nome da atividade, ou null se fecha tudo */
  nome: string | null;
  motivo: string | null;
};

/** Uma atividade que está aberta num dado dia, com o horário (em minutos). */
export type Janela = { atividade_id: string; nome: string; abre: number; fecha: number };

export type Dia = { data: string; diaSemana: number; janelas: Janela[]; fechos: FechoDoDia[] };

export type Intervalo = { data: string; inicio: number; fim: number; atividade_id: string | null };

export const DURACAO_MINIMA = 60;

/** Que atividades estão abertas neste dia (tendo em conta o horário semanal e os dias de fecho)? */
export function janelasDoDia(
  data: string,
  atividades: AtividadeBase[],
  horarios: HorarioBase[],
  fechos: FechoBase[],
): Janela[] {
  const dow = diaDaSemana(data);
  const janelas: Janela[] = [];
  for (const a of atividades) {
    const h = horarios.find((x) => x.atividade_id === a.id && x.dia_semana === dow);
    if (!h) continue;
    const fechada = fechos.some((f) => f.data === data && (f.atividade_id === null || f.atividade_id === a.id));
    if (fechada) continue;
    janelas.push({ atividade_id: a.id, nome: a.nome, abre: minutos(h.abre), fecha: minutos(h.fecha) });
  }
  return janelas;
}

/**
 * Fechos que tiram de facto uma atividade deste dia. Um feriado que cai num dia em que a atividade
 * já estava fechada de qualquer forma (p.ex. o Centro de Dia ao sábado) não interessa mostrar.
 */
export function fechosDoDia(
  data: string,
  atividades: AtividadeBase[],
  horarios: HorarioBase[],
  fechos: FechoBase[],
): FechoDoDia[] {
  const dow = diaDaSemana(data);
  const abertasNormalmente = atividades.filter((a) => horarios.some((h) => h.atividade_id === a.id && h.dia_semana === dow));
  const r: FechoDoDia[] = [];
  for (const f of fechos) {
    if (f.data !== data) continue;
    if (f.atividade_id === null) {
      if (abertasNormalmente.length > 0) r.push({ atividade_id: null, nome: null, motivo: f.motivo ?? null });
      continue;
    }
    const a = abertasNormalmente.find((x) => x.id === f.atividade_id);
    if (a) r.push({ atividade_id: a.id, nome: a.nome, motivo: f.motivo ?? null });
  }
  return r;
}

/** Todos os dias do mês, cada um com as atividades abertas e os fechos (feriados, férias…). */
export function diasComJanelas(
  mes: string,
  atividades: AtividadeBase[],
  horarios: HorarioBase[],
  fechos: FechoBase[],
): Dia[] {
  return diasDoMes(mes).map((data) => ({
    data,
    diaSemana: diaDaSemana(data),
    janelas: janelasDoDia(data, atividades, horarios, fechos),
    fechos: fechosDoDia(data, atividades, horarios, fechos),
  }));
}

/**
 * Atividades que funcionam num dado dia da semana (em pelo menos uma data do mês), com o horário
 * mais largo entre essas datas. Serve para o atalho "repetir todas as semanas" só oferecer o que existe.
 */
export function janelasDoDiaDaSemana(dias: Dia[], diaSemana: number): Janela[] {
  const mapa = new Map<string, Janela>();
  for (const d of dias) {
    if (d.diaSemana !== diaSemana) continue;
    for (const j of d.janelas) {
      const atual = mapa.get(j.atividade_id);
      mapa.set(
        j.atividade_id,
        atual ? { ...atual, abre: Math.min(atual.abre, j.abre), fecha: Math.max(atual.fecha, j.fecha) } : { ...j },
      );
    }
  }
  return [...mapa.values()];
}

/** O intervalo cabe no horário de alguma atividade (a escolhida, ou qualquer uma se for "qualquer")? */
export function intervaloValido(janelas: Janela[], atividadeId: string | null, inicio: number, fim: number): boolean {
  if (fim - inicio < DURACAO_MINIMA) return false;
  return janelas.some(
    (j) => (atividadeId === null || j.atividade_id === atividadeId) && inicio >= j.abre && fim <= j.fecha,
  );
}

/** Dois intervalos do mesmo dia sobrepõem-se? (encostados, p.ex. 14–15 e 15–16, não contam) */
export function sobrepoe(existentes: { inicio: number; fim: number }[], inicio: number, fim: number): boolean {
  return existentes.some((e) => inicio < e.fim && fim > e.inicio);
}

export type ResultadoRepeticao = {
  adicionar: Intervalo[];
  /** O que ficou de fora, e porquê (para o explicarmos à pessoa) */
  ignoradas: {
    /** datas em que a atividade estava fechada (feriado, férias…) */
    fechado: { data: string; motivo: string | null }[];
    /** datas em que a atividade não funciona a essas horas */
    foraDoHorario: number;
    jaTinha: number;
    passado: number;
  };
};

/**
 * "Repetir todas as semanas": todos os `diaSemana` do mês, com o mesmo horário.
 * Só adiciona onde é válido; regista o que ignorou para o explicarmos à pessoa.
 */
export function repetirSemanalmente(opts: {
  dias: Dia[];
  diaSemana: number;
  atividadeId: string | null;
  inicio: number;
  fim: number;
  existentes: Intervalo[];
  hoje: string;
}): ResultadoRepeticao {
  const r: ResultadoRepeticao = { adicionar: [], ignoradas: { fechado: [], foraDoHorario: 0, jaTinha: 0, passado: 0 } };
  for (const dia of opcoesDoDia(opts.dias, opts.diaSemana)) {
    if (dia.data < opts.hoje) {
      r.ignoradas.passado++;
      continue;
    }
    // Fechada por feriado/férias? (com "qualquer atividade", só conta se não sobrar nenhuma aberta)
    const fecho =
      opts.atividadeId === null
        ? dia.janelas.length === 0
          ? dia.fechos[0]
          : undefined
        : dia.fechos.find((f) => f.atividade_id === null || f.atividade_id === opts.atividadeId);
    if (fecho) {
      r.ignoradas.fechado.push({ data: dia.data, motivo: fecho.motivo });
      continue;
    }
    if (!intervaloValido(dia.janelas, opts.atividadeId, opts.inicio, opts.fim)) {
      r.ignoradas.foraDoHorario++;
      continue;
    }
    const doDia = opts.existentes.filter((e) => e.data === dia.data);
    if (sobrepoe(doDia, opts.inicio, opts.fim)) {
      r.ignoradas.jaTinha++;
      continue;
    }
    r.adicionar.push({ data: dia.data, inicio: opts.inicio, fim: opts.fim, atividade_id: opts.atividadeId });
  }
  return r;
}

/** "2026-12-08" → "8/12" */
function diaMes(data: string): string {
  return `${Number(data.slice(8))}/${Number(data.slice(5, 7))}`;
}

/** Frase para a pessoa: o que o atalho deixou de fora e porquê (nomeia os feriados). */
export function explicarIgnoradas(i: ResultadoRepeticao["ignoradas"], atividade: string | null): string {
  const partes: string[] = [];
  const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
  if (i.fechado.length) {
    const lista = i.fechado.map((f) => (f.motivo ? `${diaMes(f.data)} (${f.motivo})` : diaMes(f.data))).join(", ");
    partes.push(`${lista} — ${atividade ? `${atividade} está fechado` : "fechado"}`);
  }
  if (i.foraDoHorario) partes.push(`${dias(i.foraDoHorario)} em que a atividade não funciona a essas horas`);
  if (i.jaTinha) partes.push(`${dias(i.jaTinha)} em que já tinhas disponibilidade`);
  if (i.passado) partes.push(`${dias(i.passado)} que já ${i.passado === 1 ? "passou" : "passaram"}`);
  return partes.join("; ");
}

function opcoesDoDia(dias: Dia[], diaSemana: number): Dia[] {
  return dias.filter((d) => d.diaSemana === diaSemana);
}
