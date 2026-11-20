"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, UserRound } from "lucide-react";
import { atalhosDeArea } from "@/lib/areas";

/**
 * Atalhos de um admin no cabeçalho, conforme a área onde está:
 * dentro do admin leva à conta de voluntário; fora dele, ao admin.
 */
export function TrocaDeArea({ voluntario, variante }: { voluntario: boolean; variante: "desktop" | "movel" }) {
  const { principal, secundario } = atalhosDeArea(usePathname(), voluntario);
  const Icone = principal.tipo === "admin" ? Shield : UserRound;

  if (variante === "desktop") {
    return (
      <>
        {secundario && (
          <Link href={secundario.href} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium hover:bg-cinza">
            <UserRound aria-hidden className="size-4" /> {secundario.rotulo}
          </Link>
        )}
        <Link
          href={principal.href}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-verde-vivo px-4 text-[0.9rem] font-semibold text-tinta transition-colors hover:bg-verde-vivo-hover"
        >
          <Icone aria-hidden className="size-4" /> {principal.rotulo}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={principal.href} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-verde-vivo px-6 font-semibold text-tinta">
        <Icone aria-hidden className="size-4" /> {principal.rotulo}
      </Link>
      {secundario && (
        <Link href={secundario.href} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 font-semibold">
          <UserRound aria-hidden className="size-4" /> {secundario.rotulo}
        </Link>
      )}
    </>
  );
}
