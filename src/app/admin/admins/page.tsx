import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdicionarAdminForm, RemoverAdminForm } from "./forms";

export const metadata: Metadata = { title: "Admins" };

type Admin = { utilizador_id: string; email: string; desde: string; tem_2fa: boolean };

export default async function Admins() {
  const eu = await exigirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_admins");
  const admins = (data ?? []) as Admin[];

  return (
    <div className="space-y-10">
      <h1 className="titulo text-3xl">Admins</h1>

      <section className="rounded-3xl bg-white p-6">
        {error ? (
          <p className="text-erro">Não foi possível carregar a lista.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {admins.map((a) => (
              <li key={a.utilizador_id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold break-all">
                    {a.email} {a.utilizador_id === eu.id && <span className="text-sm font-normal text-tinta-suave">(tu)</span>}
                  </p>
                  <p className="text-sm text-tinta-suave">
                    Desde {new Date(a.desde).toLocaleDateString("pt-PT")} ·{" "}
                    {a.tem_2fa ? (
                      <span className="text-verde">2FA ativo</span>
                    ) : (
                      <span className="text-aviso">2FA ainda não configurado</span>
                    )}
                  </p>
                </div>
                <RemoverAdminForm userId={a.utilizador_id} email={a.email} eu={a.utilizador_id === eu.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="text-lg font-semibold">Adicionar admin</h2>
        <div className="mt-4">
          <AdicionarAdminForm />
        </div>
      </section>
    </div>
  );
}
