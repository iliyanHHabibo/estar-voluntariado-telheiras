"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-verde-vivo px-7 py-3 font-semibold text-tinta transition-colors hover:bg-verde-vivo-hover"
    >
      <Printer aria-hidden className="size-5" /> Imprimir / guardar em PDF
    </button>
  );
}
