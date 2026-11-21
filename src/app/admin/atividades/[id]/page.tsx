import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listaParaLinhas } from "@/lib/texto";
import { FormAtividade } from "../form";
import { ApagarAtividade } from "../apagar";

export const metadata: Metadata = { title: "Editar atividade" };

export default function EditarAtividade({ params }: PageProps<"/admin/atividades/[id]">) {
  return (
    <Suspense fallback={<p>A carregar…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/admin/atividades/[id]">["params"] }) {
  await exigirAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: a }, { data: c }, { data: hs }, { count: visitas }, { count: disponibilidades }] = await Promise.all([
    supabase.from("atividades").select("*").eq("id", id).maybeSingle(),
    supabase.from("atividade_contactos").select("responsavel_nome, responsavel_contacto, notas").eq("atividade_id", id).maybeSingle(),
    supabase.from("atividade_horarios").select("dia_semana, abre, fecha").eq("atividade_id", id),
    supabase.from("visitas").select("id", { count: "exact", head: true }).eq("atividade_id", id),
    supabase.from("disponibilidades").select("id", { count: "exact", head: true }).eq("atividade_id", id),
  ]);
  if (!a) notFound();

  const horarios: Record<number, { abre: string; fecha: string }> = {};
  for (const h of hs ?? []) horarios[h.dia_semana as number] = { abre: (h.abre as string).slice(0, 5), fecha: (h.fecha as string).slice(0, 5) };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/atividades" className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> Atividades
        </Link>
        <h1 className="titulo mt-4 text-3xl">{a.nome as string}</h1>
      </div>
      <FormAtividade
        inicial={{
          id: a.id as string,
          slug: a.slug as string,
          nome: a.nome as string,
          resumo: a.resumo as string,
          descricao: a.descricao as string,
          morada: (a.morada as string | null) ?? "",
          regras: listaParaLinhas(a.regras as string[]),
          oQueEsperar: listaParaLinhas(a.o_que_esperar as string[]),
          min: a.min_voluntarios as number,
          max: a.max_voluntarios as number,
          ordem: a.ordem as number,
          ativa: a.ativa as boolean,
          responsavelNome: (c?.responsavel_nome as string | null) ?? "",
          responsavelContacto: (c?.responsavel_contacto as string | null) ?? "",
          notas: (c?.notas as string | null) ?? "",
          horarios,
        }}
      />
      <section className="max-w-3xl space-y-4 rounded-3xl border-2 border-erro/20 bg-white p-6 sm:p-8">
        <h2 className="titulo text-xl text-erro">Apagar atividade</h2>
        <ApagarAtividade id={a.id as string} nome={a.nome as string} visitas={visitas ?? 0} disponibilidades={disponibilidades ?? 0} />
      </section>
    </div>
  );
}
