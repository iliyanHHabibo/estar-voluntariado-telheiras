import { Suspense } from "react";
import { obterUtilizador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeLisboa } from "@/lib/tempo";
import { ContaNav } from "./conta-nav";

/** Separadores da conta, com o número de visitas à espera de resposta em "As minhas visitas". */
export function Separadores() {
  return (
    <ContaNav
      contador={
        <Suspense fallback={null}>
          <PorResponder />
        </Suspense>
      }
    />
  );
}

async function PorResponder() {
  const u = await obterUtilizador();
  if (!u) return null;
  const supabase = await createClient();
  const { count } = await supabase
    .from("alocacoes")
    .select("id, visitas!inner(estado, data)", { count: "exact", head: true })
    .eq("voluntario_id", u.id) // um admin vê as alocações de todos: contar só as minhas
    .eq("estado", "proposta")
    .eq("visitas.estado", "comunicada")
    .gte("visitas.data", hojeLisboa());
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex size-6 items-center justify-center rounded-full bg-erro text-sm font-bold text-white">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> {count === 1 ? "visita por responder" : "visitas por responder"}</span>
    </span>
  );
}
