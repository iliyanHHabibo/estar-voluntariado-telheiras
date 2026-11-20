import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, hojeLisboa, idadeEm } from "@/lib/tempo";
import { estatisticaVazia, estatisticasPorVoluntario, filtrarVoluntarios, formatarHoras, type AlocacaoParaEstatistica } from "@/lib/voluntarios";
import { nomeCurto } from "../planeamento/vista";
import { CAMPO } from "@/components/forms";

export const metadata: Metadata = { title: "Voluntários" };

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

export default async function Voluntarios({ searchParams }: PageProps<"/admin/voluntarios">) {
  await exigirAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const estado = sp.estado === "inativo" || sp.estado === "todos" ? sp.estado : "ativo";
  const soMenores = sp.menor === "1";
  const hoje = hojeLisboa();

  const supabase = await createClient();
  const [{ data: vols, error }, { data: interesses }, { data: aloc }] = await Promise.all([
    supabase.from("voluntarios").select("id, nome, email, telefone, data_nascimento, estado, criado_em").order("nome").limit(1000),
    supabase.from("voluntario_interesses").select("voluntario_id, atividades(nome)").limit(5000),
    supabase.from("alocacoes").select("voluntario_id, estado, presenca, visitas!inner(data, inicio, fim, estado)").limit(5000),
  ]);
  if (error) {
    console.error("[voluntarios] carregar:", error.code, error.message);
    return <p className="text-erro">Não foi possível carregar os voluntários.</p>;
  }

  const stats = estatisticasPorVoluntario(
    ((aloc ?? []) as unknown as { voluntario_id: string; estado: string; presenca: string | null; visitas: Rel<AlocacaoParaEstatistica["visita"]> }[])
      .map((a) => ({ voluntario_id: a.voluntario_id, estado: a.estado, presenca: a.presenca, visita: um(a.visitas)! }))
      .filter((a) => a.visita),
    hoje,
  );
  const interessesDe = new Map<string, string[]>();
  for (const i of (interesses ?? []) as unknown as { voluntario_id: string; atividades: Rel<{ nome: string }> }[]) {
    const nome = um(i.atividades)?.nome;
    if (nome) interessesDe.set(i.voluntario_id, [...(interessesDe.get(i.voluntario_id) ?? []), nomeCurto(nome)]);
  }

  const todos = (vols ?? []).map((v) => ({
    id: v.id as string,
    nome: v.nome as string,
    email: v.email as string,
    telefone: v.telefone as string,
    estado: v.estado as string,
    idade: idadeEm(v.data_nascimento as string, hoje),
    menor: idadeEm(v.data_nascimento as string, hoje) < 18,
    desde: v.criado_em as string,
  }));
  const lista = filtrarVoluntarios(todos, { q, estado, menor: soMenores });
  const inativos = todos.filter((v) => v.estado === "inativo").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="titulo text-3xl">Voluntários</h1>
          <p className="mt-2 text-tinta-suave">
            {todos.length - inativos} ativos{inativos > 0 ? ` · ${inativos} inativos` : ""}
          </p>
        </div>
        <a href="/admin/exportar/voluntarios" className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-verde px-5 font-semibold text-verde hover:bg-verde hover:text-white">
          <Download aria-hidden className="size-5" /> Exportar para Excel
        </a>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-4 rounded-3xl bg-white p-5">
        <div className="min-w-60 flex-1">
          <label htmlFor="q" className="block font-semibold">
            Pesquisar
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
            <input id="q" name="q" defaultValue={q} placeholder="Nome, email ou telefone" className={`${CAMPO} !mt-1 pl-12`} />
          </div>
        </div>
        <div>
          <label htmlFor="estado" className="block font-semibold">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={estado} className={`${CAMPO} !mt-1 !w-auto`}>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold">
          <input type="checkbox" name="menor" value="1" defaultChecked={soMenores} className="size-5 accent-verde" /> Só menores
        </label>
        <button type="submit" className="min-h-12 rounded-full bg-verde px-6 font-semibold text-white hover:bg-verde-escuro">
          Filtrar
        </button>
      </form>

      <p className="text-tinta-suave">{lista.length} {lista.length === 1 ? "resultado" : "resultados"}</p>

      {lista.length === 0 ? (
        <p className="text-lg">Nenhum voluntário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-black/10 text-sm">
                <th className="px-5 py-3">Nome</th>
                <th className="px-3 py-3">Contactos</th>
                <th className="px-3 py-3">Atividades</th>
                <th className="px-3 py-3">Visitas feitas</th>
                <th className="px-3 py-3">Próximas</th>
                <th className="px-3 py-3">Inscrito</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const s = stats.get(v.id) ?? estatisticaVazia();
                return (
                  <tr key={v.id} className="border-b border-black/5 align-top hover:bg-cinza-claro">
                    <td className="px-5 py-4">
                      <Link href={`/admin/voluntarios/${v.id}`} className="font-semibold text-verde underline underline-offset-4">
                        {v.nome}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <span className="text-tinta-suave">{v.idade} anos</span>
                        {v.menor && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-aviso">menor</span>}
                        {v.estado === "inativo" && <span className="rounded-full bg-cinza px-2 py-0.5 font-semibold text-tinta-suave">inativo</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div>{v.telefone}</div>
                      <div className="break-all text-tinta-suave">{v.email}</div>
                    </td>
                    <td className="px-3 py-4 text-sm">{interessesDe.get(v.id)?.join(", ") ?? <span className="text-tinta-suave">—</span>}</td>
                    <td className="px-3 py-4 text-sm">
                      {s.feitas} {s.feitas === 1 ? "visita" : "visitas"}
                      <div className="text-tinta-suave">{formatarHoras(s.horas)} h{s.faltas > 0 ? ` · ${s.faltas} falta${s.faltas === 1 ? "" : "s"}` : ""}</div>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {s.proximas}
                      {s.porResponder > 0 && <div className="font-semibold text-aviso">{s.porResponder} por responder</div>}
                    </td>
                    <td className="px-3 py-4 text-sm text-tinta-suave">{dataCurta(v.desde)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
