import { Suspense } from "react";
import { obterUtilizador } from "@/lib/auth";
import { visitasPorResponder } from "@/lib/contadores";
import { Contador } from "@/components/contador";
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
  return <Contador n={await visitasPorResponder(u.id)} singular="visita por responder" plural="visitas por responder" />;
}
