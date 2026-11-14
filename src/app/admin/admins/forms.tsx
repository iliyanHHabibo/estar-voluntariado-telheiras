"use client";

import { useActionState } from "react";
import { adicionarAdmin, removerAdmin, type EstadoAdmins } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

export function AdicionarAdminForm() {
  const [estado, acao] = useActionState<EstadoAdmins, FormData>(adicionarAdmin, {});
  return (
    <form action={acao} className="space-y-4">
      <div>
        <Rotulo htmlFor="email">Email da pessoa</Rotulo>
        <input id="email" name="email" type="email" required className={`${CAMPO} max-w-md`} />
      </div>
      <p className="text-sm text-tinta-suave">A pessoa tem de ter entrado no site pelo menos uma vez (em /entrar).</p>
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.ok && <Alerta tipo="sucesso">{estado.ok}</Alerta>}
      <BotaoSubmeter variante="escuro">Adicionar admin</BotaoSubmeter>
    </form>
  );
}

export function RemoverAdminForm({ userId, email, eu }: { userId: string; email: string; eu: boolean }) {
  const [estado, acao] = useActionState<EstadoAdmins, FormData>(removerAdmin, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        const msg = eu ? "Vais remover-te a ti próprio de admin. Continuar?" : `Remover ${email} de admin?`;
        if (!confirm(msg)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" className="rounded-full border-2 border-erro/30 px-4 py-2 text-sm font-semibold text-erro hover:bg-red-50">
        Remover
      </button>
      {estado.erro && <span className="text-sm text-erro">{estado.erro}</span>}
    </form>
  );
}
