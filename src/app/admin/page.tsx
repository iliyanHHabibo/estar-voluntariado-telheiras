import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function contar(tabela: string, filtro?: (q: any) => any): Promise<number | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient();
  let q = supabase.from(tabela).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count, error } = await q;
  return error ? null : count;
}

export default async function PainelAdmin() {
  await exigirAdmin();
  const hoje = new Date().toISOString().slice(0, 10);

  const [voluntarios, testemunhos, visitas] = await Promise.all([
    contar("profiles", (q) => q.eq("estado", "ativo")),
    contar("testimonials", (q) => q.eq("estado", "pendente")),
    contar("sessions", (q) => q.gte("data", hoje).neq("estado", "cancelada")),
  ]);

  const cartoes = [
    { titulo: "Voluntários ativos", valor: voluntarios },
    { titulo: "Testemunhos por rever", valor: testemunhos },
    { titulo: "Próximas visitas", valor: visitas },
  ];

  return (
    <div className="space-y-10">
      <h1 className="titulo text-3xl">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className="rounded-3xl bg-white p-6">
            <p className="text-tinta-suave">{c.titulo}</p>
            <p className="titulo mt-2 text-4xl">{c.valor ?? "—"}</p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-white p-6">
        <h2 className="text-lg font-semibold">Em construção</h2>
        <p className="mt-2 text-tinta-suave">
          Planeamento do mês, voluntários, testemunhos e atividades vão aparecer aqui nas próximas etapas.
          Por agora podes <Link href="/admin/admins" className="font-semibold text-verde underline">gerir os admins</Link>.
        </p>
      </div>
    </div>
  );
}
