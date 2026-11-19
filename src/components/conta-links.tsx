import Link from "next/link";
import { LogOut, Shield, UserRound } from "lucide-react";
import { obterUtilizador, souAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/entrar/actions";
import { ROTA_INSCRICAO } from "@/lib/site";

/**
 * Ligações de conta no cabeçalho. Lê a sessão (no servidor, em cada pedido),
 * por isso é usado dentro de <Suspense> — o resto do cabeçalho continua estático.
 */
export async function ContaLinks({ variante }: { variante: "desktop" | "movel" }) {
  const u = await obterUtilizador();
  const admin = u ? await souAdmin() : false;
  // Um admin também pode ser voluntário: nesse caso mostramos as duas áreas
  let voluntario = false;
  if (u) {
    const supabase = await createClient();
    const { data } = await supabase.from("voluntarios").select("id").eq("id", u.id).maybeSingle();
    voluntario = Boolean(data);
  }
  const mostrarConta = !admin || voluntario;

  if (variante === "desktop") {
    if (!u) {
      return (
        <div className="flex items-center gap-1">
          <Link href="/entrar" className="whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium hover:bg-cinza">
            Entrar
          </Link>
          <Link
            href={ROTA_INSCRICAO}
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-verde-vivo px-4 text-[0.9rem] font-semibold text-tinta transition-colors hover:bg-verde-vivo-hover"
          >
            Quero ser voluntário
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        {admin && mostrarConta && (
          <Link href="/conta" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium hover:bg-cinza">
            <UserRound aria-hidden className="size-4" /> A minha conta
          </Link>
        )}
        <Link
          href={admin ? "/admin" : "/conta"}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-verde-vivo px-4 text-[0.9rem] font-semibold text-tinta transition-colors hover:bg-verde-vivo-hover"
        >
          {admin ? <Shield aria-hidden className="size-4" /> : <UserRound aria-hidden className="size-4" />}
          {admin ? "Admin" : "A minha conta"}
        </Link>
        <form action={sair}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium hover:bg-cinza"
          >
            <LogOut aria-hidden className="size-4" /> Sair
          </button>
        </form>
      </div>
    );
  }

  // Menu do telemóvel
  if (!u) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <Link href="/entrar" className="flex min-h-12 items-center justify-center rounded-full border-2 border-black/15 px-6 font-semibold">
          Entrar
        </Link>
        <Link href={ROTA_INSCRICAO} className="flex min-h-12 items-center justify-center rounded-full bg-verde-vivo px-6 font-semibold text-tinta">
          Quero ser voluntário
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-5 flex flex-col gap-3">
      {admin && (
        <Link href="/admin" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-verde px-6 font-semibold text-white">
          <Shield aria-hidden className="size-4" /> Admin
        </Link>
      )}
      {mostrarConta && (
        <Link href="/conta" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-verde-vivo px-6 font-semibold text-tinta">
          <UserRound aria-hidden className="size-4" /> A minha conta
        </Link>
      )}
      <form action={sair}>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 font-semibold">
          <LogOut aria-hidden className="size-4" /> Sair
        </button>
      </form>
    </div>
  );
}

/** Espaço reservado enquanto a sessão é lida (evita saltos no cabeçalho). */
export function ContaLinksEspera({ variante }: { variante: "desktop" | "movel" }) {
  return variante === "desktop" ? <div aria-hidden className="h-11 w-48" /> : <div aria-hidden className="mt-5 h-28" />;
}
