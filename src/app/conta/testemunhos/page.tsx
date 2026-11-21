import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Section } from "@/components/ui";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/tempo";
import { Separadores } from "../separadores";
import { ApagarTestemunho, NovoTestemunho } from "./formularios";

export const metadata: Metadata = { title: "Testemunhos", robots: { index: false } };

export default function Testemunhos() {
  return (
    <>
      <PageHeader titulo="Testemunhos" subtitulo="Conta-nos como foi. Talvez a tua história inspire alguém." />
      <Section>
        <Container>
          <Separadores />
          <Suspense fallback={<p>A carregar…</p>}>
            <Conteudo />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

const ESTADOS = {
  pendente: { texto: "À espera de revisão", cor: "bg-amber-100 text-aviso" },
  aprovado: { texto: "Publicado no site", cor: "bg-green-100 text-verde" },
  rejeitado: { texto: "Não publicado", cor: "bg-cinza text-tinta-suave" },
} as const;

async function Conteudo() {
  const { u } = await exigirVoluntario("/conta/testemunhos");
  const supabase = await createClient();
  const [{ data: atividades }, { data: meus }] = await Promise.all([
    supabase.from("atividades").select("id, nome").eq("ativa", true).order("ordem"),
    supabase
      .from("testemunhos")
      .select("id, texto, estado, anonimo, criado_em")
      .eq("autor_id", u.id)
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <div className="grid gap-12 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h2 className="titulo mb-6 text-xl">Escrever um testemunho</h2>
        <NovoTestemunho atividades={atividades ?? []} />
      </div>

      <aside className="lg:col-span-2">
        <h2 className="titulo mb-6 text-xl">Os que já enviei</h2>
        {!meus?.length ? (
          <p className="text-tinta-suave">Ainda não enviaste nenhum.</p>
        ) : (
          <ul className="space-y-4">
            {meus.map((t) => {
              const e = ESTADOS[t.estado as keyof typeof ESTADOS];
              return (
                <li key={t.id as string} className="space-y-3 rounded-2xl border-2 border-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${e.cor}`}>{e.texto}</span>
                    <span className="text-sm text-tinta-suave">{dataCurta(t.criado_em as string)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">“{t.texto as string}”</p>
                  <p className="text-sm text-tinta-suave">{t.anonimo ? "Publicado como Anónimo" : "Com o teu primeiro nome"}</p>
                  {t.estado === "pendente" && <ApagarTestemunho id={t.id as string} />}
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
