"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export const CAMPO =
  "mt-2 block w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-base text-tinta placeholder:text-tinta-suave/60 focus:border-verde focus:outline-none";

export function Rotulo({ htmlFor, children, opcional }: { htmlFor: string; children: ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block font-semibold">
      {children}
      {opcional && <span className="ml-2 text-sm font-normal text-tinta-suave">(opcional)</span>}
    </label>
  );
}

export function BotaoSubmeter({
  children,
  pendente = "A enviar…",
  variante = "primario",
  className = "",
}: {
  children: ReactNode;
  pendente?: string;
  variante?: "primario" | "escuro" | "perigo";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const cores = {
    primario: "bg-verde-vivo text-tinta hover:bg-verde-vivo-hover",
    escuro: "bg-verde text-white hover:bg-verde-escuro",
    perigo: "bg-erro text-white hover:bg-red-800",
  }[variante];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${cores} ${className}`}
    >
      {pending ? pendente : children}
    </button>
  );
}

export function Alerta({ tipo, children }: { tipo: "erro" | "info" | "sucesso" | "aviso"; children: ReactNode }) {
  const estilos = {
    erro: "border-erro/30 bg-red-50 text-erro",
    info: "border-verde/20 bg-cinza-claro text-tinta",
    sucesso: "border-verde/30 bg-green-50 text-verde",
    aviso: "border-aviso/40 bg-amber-50 text-aviso",
  }[tipo];
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl border-2 px-4 py-3 ${estilos}`}>
      {children}
    </p>
  );
}
