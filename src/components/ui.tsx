import Link from "next/link";
import type { ReactNode } from "react";

/** Largura máxima e margens laterais comuns a todas as secções. */
export function Container({
  children,
  className = "",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={`mx-auto w-full px-5 sm:px-8 ${narrow ? "max-w-3xl" : "max-w-6xl"} ${className}`}>
      {children}
    </div>
  );
}

const TONS = {
  branco: "bg-white text-tinta",
  cinza: "bg-cinza text-tinta",
  verde: "bg-verde text-white",
  preto: "bg-tinta text-white",
} as const;

export function Section({
  children,
  tom = "branco",
  id,
  className = "",
}: {
  children: ReactNode;
  tom?: keyof typeof TONS;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`${TONS[tom]} py-16 sm:py-24 ${className}`}>
      {children}
    </section>
  );
}

const BOTAO_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-colors";

const BOTAO_VARIANTES = {
  primario: "bg-verde-vivo text-tinta hover:bg-verde-vivo-hover",
  escuro: "bg-verde text-white hover:bg-verde-escuro",
  contorno: "border-2 border-current hover:bg-white/10",
} as const;

export function ButtonLink({
  href,
  children,
  variante = "primario",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variante?: keyof typeof BOTAO_VARIANTES;
  className?: string;
}) {
  const classes = `${BOTAO_BASE} ${BOTAO_VARIANTES[variante]} ${className}`;
  // Links externos / mailto não passam pelo router do Next
  if (/^(mailto:|https?:)/.test(href)) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** Cabeçalho das páginas interiores. */
export function PageHeader({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <header className="bg-verde text-white">
      <Container className="py-14 sm:py-20">
        <h1 className="titulo text-3xl sm:text-5xl">{titulo}</h1>
        {subtitulo && <p className="mt-5 max-w-2xl text-lg text-white/85 sm:text-xl">{subtitulo}</p>}
      </Container>
    </header>
  );
}
