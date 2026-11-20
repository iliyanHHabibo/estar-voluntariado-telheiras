import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { FormAtividade } from "../form";

export const metadata: Metadata = { title: "Nova atividade" };

export default async function NovaAtividade() {
  await exigirAdmin();
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/atividades" className="inline-flex items-center gap-2 font-semibold text-verde hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> Atividades
        </Link>
        <h1 className="titulo mt-4 text-3xl">Nova atividade</h1>
      </div>
      <FormAtividade
        inicial={{
          nome: "",
          resumo: "",
          descricao: "",
          morada: "",
          regras: "",
          oQueEsperar: "",
          min: 2,
          max: 5,
          ordem: 10,
          ativa: true,
          responsavelNome: "",
          responsavelContacto: "",
          notas: "",
          horarios: {},
        }}
      />
    </div>
  );
}
