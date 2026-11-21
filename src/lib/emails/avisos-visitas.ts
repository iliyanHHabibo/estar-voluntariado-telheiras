import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarIcs } from "@/lib/ics";
import { criarCarteiro, urlDoSite } from "./enviar";
import { emailAlocado, emailRemovido, emailVisitaAlterada, emailVisitaCancelada, type Email, type VisitaEmail } from "./modelos";

/**
 * Avisos por email aos voluntários sobre as visitas. Chamado pelas ações dos admins, com o cliente
 * Supabase do admin (as regras RLS continuam a valer: só um admin lê emails de outros voluntários).
 */

export type Resultado = { enviados: number; falhados: number; semConfiguracao: boolean };

type Alocacao = { id: string; estado: string; notificada_em: string | null; voluntarios: { nome: string; email: string } | null };

const ATIVAS = ["proposta", "confirmada"];

export async function lerVisitaParaEmail(supabase: SupabaseClient, visitaId: string) {
  const { data, error } = await supabase
    .from("visitas")
    .select("id, estado, data, inicio, fim, atividades(nome, morada), alocacoes(id, estado, notificada_em, voluntarios(nome, email))")
    .eq("id", visitaId)
    .maybeSingle();
  if (error || !data) return null;
  const a = data.atividades as unknown as { nome: string; morada: string | null } | null;
  const visita: VisitaEmail = { atividade: a?.nome ?? "Visita", morada: a?.morada ?? null, data: data.data, inicio: data.inicio, fim: data.fim };
  return { estado: data.estado as string, visita, alocacoes: (data.alocacoes ?? []) as unknown as Alocacao[] };
}

function ics(alocacaoId: string, v: VisitaEmail): string {
  return gerarIcs({
    uid: alocacaoId,
    titulo: `ESTAR — ${v.atividade}`,
    data: v.data,
    inicio: v.inicio,
    fim: v.fim,
    local: v.morada,
    descricao: "Visita de voluntariado ESTAR. Se não puderes ir, avisa a equipa o mais cedo possível.",
  });
}

async function enviarATodos(
  lista: Alocacao[],
  fazer: (a: Alocacao & { voluntarios: { nome: string; email: string } }) => Email,
  motivo: string,
  depois?: (enviadas: string[]) => Promise<void>,
): Promise<Resultado> {
  const r: Resultado = { enviados: 0, falhados: 0, semConfiguracao: false };
  const comEmail = lista.filter((a): a is Alocacao & { voluntarios: { nome: string; email: string } } => Boolean(a.voluntarios?.email));
  r.falhados = lista.length - comEmail.length;
  if (comEmail.length === 0) return r;
  const carteiro = criarCarteiro();
  if (!carteiro) {
    console.warn(`[email] não configurado — ${comEmail.length} email(s) não enviado(s) (${motivo})`);
    return { enviados: 0, falhados: lista.length, semConfiguracao: true };
  }
  const enviadas: string[] = [];
  try {
    for (const a of comEmail) {
      if (await carteiro.enviar({ para: a.voluntarios.email }, fazer(a), motivo)) {
        r.enviados++;
        enviadas.push(a.id);
      } else r.falhados++;
    }
  } finally {
    carteiro.fechar();
  }
  if (depois && enviadas.length) await depois(enviadas);
  return r;
}

async function marcarNotificadas(supabase: SupabaseClient, ids: string[]) {
  const { error } = await supabase.from("alocacoes").update({ notificada_em: new Date().toISOString() }).in("id", ids);
  if (error) console.error("[email] marcar notificadas:", error.code, error.message);
}

/** Visita comunicada: avisa quem está alocado e ainda não foi avisado (ou só uma alocação). */
export async function avisarAlocados(supabase: SupabaseClient, visitaId: string, soAlocacao?: string): Promise<Resultado> {
  const v = await lerVisitaParaEmail(supabase, visitaId);
  if (!v || v.estado !== "comunicada") return { enviados: 0, falhados: 0, semConfiguracao: false };
  const urlVisitas = urlDoSite("/conta/visitas");
  const lista = v.alocacoes.filter((a) => ATIVAS.includes(a.estado) && !a.notificada_em && (!soAlocacao || a.id === soAlocacao));
  return enviarATodos(
    lista,
    (a) => emailAlocado({ nome: a.voluntarios.nome, visita: v.visita, urlVisitas, ics: ics(a.id, v.visita) }),
    "alocado",
    (ids) => marcarNotificadas(supabase, ids),
  );
}

/** Visita cancelada: avisa quem já tinha sido avisado. Depois "esquece" os avisos, para o caso de a visita ser reaberta. */
export async function avisarCancelamento(supabase: SupabaseClient, visitaId: string): Promise<Resultado> {
  const v = await lerVisitaParaEmail(supabase, visitaId);
  if (!v) return { enviados: 0, falhados: 0, semConfiguracao: false };
  const urlVisitas = urlDoSite("/conta/visitas");
  const lista = v.alocacoes.filter((a) => ATIVAS.includes(a.estado) && a.notificada_em);
  const r = await enviarATodos(lista, (a) => emailVisitaCancelada({ nome: a.voluntarios.nome, visita: v.visita, urlVisitas }), "cancelada");
  const { error } = await supabase.from("alocacoes").update({ notificada_em: null }).eq("visita_id", visitaId).not("notificada_em", "is", null);
  if (error) console.error("[email] limpar notificadas:", error.code, error.message);
  return r;
}

/** Visita comunicada mudou de dia, hora ou atividade: avisa quem já sabia dela. */
export async function avisarAlteracao(supabase: SupabaseClient, visitaId: string, antes: VisitaEmail): Promise<Resultado> {
  const v = await lerVisitaParaEmail(supabase, visitaId);
  if (!v || v.estado !== "comunicada") return { enviados: 0, falhados: 0, semConfiguracao: false };
  const urlVisitas = urlDoSite("/conta/visitas");
  const lista = v.alocacoes.filter((a) => ATIVAS.includes(a.estado) && a.notificada_em);
  return enviarATodos(
    lista,
    (a) => emailVisitaAlterada({ nome: a.voluntarios.nome, antes, depois: v.visita, urlVisitas, ics: ics(a.id, v.visita) }),
    "alterada",
  );
}

/** Pessoa retirada de uma visita de que já tinha sido avisada. */
export async function avisarRemocao(alocacao: { nome: string; email: string }, visita: VisitaEmail): Promise<Resultado> {
  return enviarATodos(
    [{ id: "", estado: "proposta", notificada_em: "x", voluntarios: alocacao }],
    () => emailRemovido({ nome: alocacao.nome, visita }),
    "removido",
  );
}

export function mudouParaOsVoluntarios(antes: VisitaEmail, depois: VisitaEmail): boolean {
  return (
    antes.data !== depois.data ||
    antes.inicio.slice(0, 5) !== depois.inicio.slice(0, 5) ||
    antes.fim.slice(0, 5) !== depois.fim.slice(0, 5) ||
    antes.atividade !== depois.atividade
  );
}

/** Frase para o admin, depois de um envio. */
export function resumoDoEnvio(r: Resultado): { ok?: string; aviso?: string } {
  if (r.semConfiguracao) return { aviso: "O envio de emails não está configurado: avisa as pessoas por outra via." };
  const partes: { ok?: string; aviso?: string } = {};
  if (r.enviados) partes.ok = r.enviados === 1 ? "Enviámos 1 email." : `Enviámos ${r.enviados} emails.`;
  if (r.falhados) partes.aviso = `${r.falhados === 1 ? "1 email não foi enviado" : `${r.falhados} emails não foram enviados`}. Avisa essa(s) pessoa(s) por outra via.`;
  return partes;
}
