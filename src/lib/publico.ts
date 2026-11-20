import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import { ATIVIDADES as RESERVA } from "@/lib/atividades";
import { descreverHorario } from "@/lib/horario";

/**
 * Conteúdo público lido da base de dados, com cache.
 *
 *  - As páginas ficam rápidas (a leitura fica em cache e as páginas são pré-geradas).
 *  - Quando um admin guarda uma alteração, a cache é invalidada logo (updateTag) e a página atualiza.
 *  - Se a base de dados falhar, as atividades mostram o texto de reserva que está no código (não partem),
 *    e os testemunhos ficam vazios. Erros não ficam guardados em cache.
 */

export type AtividadePublica = {
  id: string;
  slug: string;
  nome: string;
  resumo: string;
  descricao: string;
  horario: string;
  morada: string | null;
  oQueEsperar: string[];
  regras: string[];
};

export type TestemunhoPublico = {
  id: string;
  autor: string;
  atividade: string | null;
  texto: string;
  destaque: boolean;
};

/** Resultado de uma leitura: nunca lançamos erros dentro da cache (fariam falhar a compilação das páginas). */
type Leitura<T> = { ok: true; dados: T } | { ok: false };

// Quando a leitura corre bem, fica em cache 1 hora (e é invalidada logo que um admin guarda alterações).
// Quando falha, fica só 1 minuto, para a falha não persistir.
const CACHE_FALHA = { stale: 300, revalidate: 60, expire: 600 };

async function lerAtividades(): Promise<Leitura<AtividadePublica[]>> {
  "use cache";
  cacheTag("atividades");
  try {
    const sb = clientePublico();
    const [a, h] = await Promise.all([
      sb
        .from("atividades")
        .select("id, slug, nome, resumo, descricao, morada, regras, o_que_esperar")
        .eq("ativa", true)
        .order("ordem"),
      sb.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
    ]);
    if (a.error || h.error) throw new Error(a.error?.message ?? h.error?.message ?? "erro desconhecido");

    const dados = (a.data ?? []).map((x) => ({
      id: x.id as string,
      slug: x.slug as string,
      nome: x.nome as string,
      resumo: x.resumo as string,
      descricao: x.descricao as string,
      morada: (x.morada as string | null) ?? null,
      regras: (x.regras as string[]) ?? [],
      oQueEsperar: (x.o_que_esperar as string[]) ?? [],
      horario: descreverHorario((h.data ?? []).filter((y) => y.atividade_id === x.id)),
    }));
    cacheLife("hours");
    return { ok: true, dados };
  } catch (e) {
    console.error("[publico] atividades:", e instanceof Error ? e.message : e);
    cacheLife(CACHE_FALHA);
    return { ok: false };
  }
}

/** Atividades ativas. Se a base de dados falhar, usa o texto de reserva. */
export async function getAtividades(): Promise<AtividadePublica[]> {
  const r = await lerAtividades();
  if (r.ok) return r.dados;
  return RESERVA.map((a) => ({
    id: a.slug,
    slug: a.slug,
    nome: a.nome,
    resumo: a.resumo,
    descricao: a.descricao,
    horario: a.horario,
    morada: a.morada ?? null,
    oQueEsperar: a.oQueEsperar,
    regras: a.regras,
  }));
}

async function lerTestemunhos(): Promise<Leitura<TestemunhoPublico[]>> {
  "use cache";
  cacheTag("testemunhos");
  try {
    const { data, error } = await clientePublico().rpc("testemunhos_publicados", { p_limite: 50 });
    if (error) throw new Error(error.message);
    const dados = ((data ?? []) as { id: string; autor: string; atividade: string | null; texto: string; destaque: boolean }[]).map((t) => ({
      id: t.id,
      autor: t.autor,
      atividade: t.atividade,
      texto: t.texto,
      destaque: t.destaque,
    }));
    cacheLife("hours");
    return { ok: true, dados };
  } catch (e) {
    console.error("[publico] testemunhos:", e instanceof Error ? e.message : e);
    cacheLife(CACHE_FALHA);
    return { ok: false };
  }
}

/** Testemunhos aprovados pelos admins. Se a base de dados falhar, devolve uma lista vazia. */
export async function getTestemunhos(): Promise<TestemunhoPublico[]> {
  const r = await lerTestemunhos();
  return r.ok ? r.dados : [];
}
