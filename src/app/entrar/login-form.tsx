"use client";

import { useActionState } from "react";
import { enviarCodigo, verificarCodigo, type EstadoEntrar } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import { Turnstile } from "@/components/turnstile";

export function LoginForm({ seguinte }: { seguinte?: string }) {
  const [estadoEmail, acaoEmail] = useActionState<EstadoEntrar, FormData>(enviarCodigo, { etapa: "email" });
  const [estadoCodigo, acaoCodigo] = useActionState<EstadoEntrar, FormData>(verificarCodigo, { etapa: "codigo" });

  // Passa para o passo do código depois de o email ser enviado
  const naEtapaCodigo = estadoEmail.etapa === "codigo" && estadoCodigo.etapa === "codigo";
  const email = estadoCodigo.email ?? estadoEmail.email ?? "";

  if (!naEtapaCodigo) {
    return (
      <form action={acaoEmail} className="space-y-6">
        <div>
          <Rotulo htmlFor="email">O teu email</Rotulo>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            defaultValue={estadoEmail.email}
            placeholder="nome@exemplo.pt"
            className={CAMPO}
          />
        </div>
        <Turnstile />
        {estadoEmail.erro && <Alerta tipo="erro">{estadoEmail.erro}</Alerta>}
        <BotaoSubmeter className="w-full sm:w-auto">Receber código por email</BotaoSubmeter>
        <p className="text-sm text-tinta-suave">
          Não precisas de password. Se ainda não tens conta, é criada automaticamente.
        </p>
      </form>
    );
  }

  return (
    <form action={acaoCodigo} className="space-y-6">
      <Alerta tipo="info">
        {estadoEmail.info} <span className="font-semibold">({email})</span>
      </Alerta>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="seguinte" value={seguinte ?? ""} />
      <div>
        <Rotulo htmlFor="codigo">Código</Rotulo>
        <input
          id="codigo"
          name="codigo"
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6,10}"
          maxLength={10}
          placeholder="123456"
          className={`${CAMPO} max-w-xs text-2xl tracking-[0.3em]`}
          autoFocus
        />
      </div>
      {estadoCodigo.erro && <Alerta tipo="erro">{estadoCodigo.erro}</Alerta>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BotaoSubmeter pendente="A verificar…">Entrar</BotaoSubmeter>
        <a href="/entrar" className="font-semibold text-verde underline underline-offset-4">
          Usar outro email / pedir novo código
        </a>
      </div>
      <p className="text-sm text-tinta-suave">Não chegou? Vê a pasta de spam. O código é válido durante pouco tempo.</p>
    </form>
  );
}
