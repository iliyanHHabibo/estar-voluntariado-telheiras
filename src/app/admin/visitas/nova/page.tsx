import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeLisboa, primeiroDiaDoMes } from "@/lib/tempo";
import { NovaVisitaForm } from "./form";

export const metadata: Metadata = { title: "Nova visita" };

export default function NovaVisita({ searchParams }: PageProps<"/admin/visitas/nova">) {
  return (
    <Suspense fallback={<p>A carregar…</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/visitas/nova">["searchParams"] }) {
  await exigirAdmin();
  const sp = await searchParams;
  const hoje = hojeLisboa();
  const data = z.iso.date().safeParse(sp.data).data ?? hoje;
  const atividadePedida = z.uuid().safeParse(sp.atividade).data;

  const supabase = await createClient();
  const [{ data: atividades }, { data: horarios }, { data: fechos }] = await Promise.all([
    supabase.from("atividades").select("id, nome").eq("ativa", true).order("ordem"),
    supabase.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
    supabase.from("atividade_fechos").select("atividade_id, data, motivo").gte("data", hoje),
  ]);
  const lista = atividades ?? [];
  const atividadeInicial = lista.find((a) => a.id === atividadePedida)?.id ?? lista[0]?.id ?? "";
  const mes = primeiroDiaDoMes(data);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/planeamento?mes=${mes}`} className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> Planeamento
        </Link>
        <h1 className="titulo mt-4 text-3xl">Nova visita</h1>
        <p className="mt-2 text-tinta-suave">Depois de criada, escolhes quem vai. Os voluntários só a veem quando a comunicares.</p>
      </div>
      {lista.length === 0 ? (
        <p className="text-erro">Não há atividades ativas.</p>
      ) : (
        <NovaVisitaForm
          atividades={lista}
          horarios={horarios ?? []}
          fechos={fechos ?? []}
          hoje={hoje}
          dataInicial={data}
          atividadeInicial={atividadeInicial}
        />
      )}
    </div>
  );
}
