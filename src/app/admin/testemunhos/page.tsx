import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/tempo";
import { CartaoTestemunho, type TestemunhoAdmin } from "./cartao";

export const metadata: Metadata = { title: "Testemunhos" };

type Rel<T> = T | T[] | null;
const um = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

export default async function Testemunhos() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testemunhos")
    .select("id, estado, texto, texto_publicado, anonimo, nome_exibido, destaque, criado_em, revisto_em, atividades(nome), voluntarios(nome, email)")
    .order("criado_em", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[testemunhos] carregar:", error.code, error.message);
    return <p className="text-erro">Não foi possível carregar os testemunhos.</p>;
  }

  const todos: TestemunhoAdmin[] = ((data ?? []) as unknown as {
    id: string;
    estado: TestemunhoAdmin["estado"];
    texto: string;
    texto_publicado: string | null;
    anonimo: boolean;
    nome_exibido: string;
    destaque: boolean;
    criado_em: string;
    revisto_em: string | null;
    atividades: Rel<{ nome: string }>;
    voluntarios: Rel<{ nome: string; email: string }>;
  }[]).map((t) => ({
    id: t.id,
    estado: t.estado,
    textoOriginal: t.texto,
    textoPublicado: t.texto_publicado,
    anonimo: t.anonimo,
    nomeExibido: t.nome_exibido,
    destaque: t.destaque,
    autorNome: um(t.voluntarios)?.nome ?? "(conta apagada)",
    autorEmail: um(t.voluntarios)?.email ?? "",
    atividade: um(t.atividades)?.nome ?? null,
    criadoEm: dataCurta(t.criado_em),
    revistoEm: t.revisto_em,
  }));

  const grupos = [
    { titulo: "À espera de revisão", itens: todos.filter((t) => t.estado === "pendente"), vazio: "Não há testemunhos por rever." },
    { titulo: "Publicados no site", itens: todos.filter((t) => t.estado === "aprovado"), vazio: "Ainda não publicaste nenhum." },
    { titulo: "Não publicados", itens: todos.filter((t) => t.estado === "rejeitado"), vazio: "" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="titulo text-3xl">Testemunhos</h1>
        <p className="mt-3 max-w-3xl text-lg text-tinta-suave">
          Lê cada testemunho, retira nomes ou dados de utentes e decide se se publica. Os voluntários não veem as tuas edições
          nem sabem o motivo se rejeitares.
        </p>
      </div>
      {grupos.map((g) =>
        g.itens.length === 0 && !g.vazio ? null : (
          <section key={g.titulo} className="space-y-4">
            <h2 className="titulo text-xl">
              {g.titulo} <span className="text-tinta-suave">({g.itens.length})</span>
            </h2>
            {g.itens.length === 0 ? <p className="text-tinta-suave">{g.vazio}</p> : g.itens.map((t) => <CartaoTestemunho key={t.id} t={t} />)}
          </section>
        ),
      )}
    </div>
  );
}
