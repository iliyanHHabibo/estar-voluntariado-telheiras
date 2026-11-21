/** Círculo vermelho com um número (coisas à espera de resposta). Não mostra nada se for 0. */
export function Contador({ n, singular, plural }: { n: number; singular: string; plural: string }) {
  if (!n) return null;
  return (
    <span className="ml-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-erro text-sm font-bold text-white">
      {n > 9 ? "9+" : n}
      <span className="sr-only"> {n === 1 ? singular : plural}</span>
    </span>
  );
}
