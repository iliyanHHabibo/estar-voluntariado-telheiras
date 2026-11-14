"use client";

import Script from "next/script";

/**
 * Verificação anti-robôs (Cloudflare Turnstile, gratuita e sem cookies de rastreio).
 * Só aparece se NEXT_PUBLIC_TURNSTILE_SITE_KEY estiver definido. Coloca dentro do <form>
 * um campo escondido "cf-turnstile-response", que o Supabase verifica do lado dele.
 */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="pt-PT" data-theme="light" />
    </>
  );
}
