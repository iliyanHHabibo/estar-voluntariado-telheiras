import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";

// Enquanto o site estiver em testes (endereço *.vercel.app) não queremos que apareça no Google.
// Quando for para produção, definir NEXT_PUBLIC_INDEXAVEL=true no Vercel.
const indexavel = process.env.NEXT_PUBLIC_INDEXAVEL === "true";

export const metadata: Metadata = {
  title: {
    default: `${SITE.nome} — Voluntariado · Paróquia de Telheiras`,
    template: `%s · ${SITE.nome}`,
  },
  description: SITE.descricao,
  robots: indexavel ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    title: SITE.nomeCompleto,
    description: SITE.descricao,
    locale: "pt_PT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b5534",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-verde-vivo focus:px-5 focus:py-3 focus:font-semibold focus:text-tinta"
        >
          Saltar para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
