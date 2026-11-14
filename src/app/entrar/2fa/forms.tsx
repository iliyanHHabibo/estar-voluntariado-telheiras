"use client";

import { useActionState } from "react";
import { iniciarConfiguracao, verificarCodigo2fa, type EstadoConfig, type EstadoVerificar } from "./actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";

function CampoCodigo() {
  return (
    <div>
      <Rotulo htmlFor="codigo">Código de 6 dígitos da app</Rotulo>
      <input
        id="codigo"
        name="codigo"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="123456"
        autoFocus
        className={`${CAMPO} max-w-xs text-2xl tracking-[0.3em]`}
      />
    </div>
  );
}

export function VerificarForm({ factorId }: { factorId: string }) {
  const [estado, acao] = useActionState<EstadoVerificar, FormData>(verificarCodigo2fa, {});
  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="factorId" value={factorId} />
      <CampoCodigo />
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter pendente="A verificar…">Verificar</BotaoSubmeter>
    </form>
  );
}

export function ConfigurarForm() {
  const [config, iniciar] = useActionState<EstadoConfig, FormData>(iniciarConfiguracao, {});
  const [estado, verificar] = useActionState<EstadoVerificar, FormData>(verificarCodigo2fa, {});

  if (!config.factorId) {
    return (
      <form action={iniciar} className="space-y-6">
        <ol className="list-decimal space-y-2 pl-5 text-lg">
          <li>
            Instala no telemóvel uma app de autenticação: <strong>Google Authenticator</strong>,{" "}
            <strong>Microsoft Authenticator</strong> ou a app <strong>Palavras-passe</strong> do iPhone.
          </li>
          <li>Carrega no botão abaixo para ver o código QR.</li>
          <li>Lê o QR com a app e escreve o código de 6 dígitos que aparece.</li>
        </ol>
        {config.erro && <Alerta tipo="erro">{config.erro}</Alerta>}
        <BotaoSubmeter variante="escuro" pendente="A preparar…">
          Mostrar código QR
        </BotaoSubmeter>
      </form>
    );
  }

  return (
    <form action={verificar} className="space-y-6">
      <input type="hidden" name="factorId" value={config.factorId} />
      <div className="inline-block rounded-2xl border-2 border-black/10 bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- QR em data: URI gerado pelo Supabase */}
        <img src={config.qr} alt="Código QR para a app de autenticação" width={200} height={200} />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Não consegues ler o QR? Escreve este código na app</summary>
        <code className="mt-2 block break-all rounded-lg bg-cinza-claro p-3 font-mono text-base">{config.segredo}</code>
      </details>
      <CampoCodigo />
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter pendente="A verificar…">Ativar 2FA</BotaoSubmeter>
    </form>
  );
}
