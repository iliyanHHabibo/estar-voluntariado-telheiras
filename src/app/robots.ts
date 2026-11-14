import type { MetadataRoute } from "next";

// Em testes: bloqueia tudo. Em produção (NEXT_PUBLIC_INDEXAVEL=true): permite, exceto áreas privadas.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXAVEL !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/conta", "/api"] } };
}
