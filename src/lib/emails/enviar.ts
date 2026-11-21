import "server-only";
import nodemailer from "nodemailer";
import type { Email } from "./modelos";

/**
 * Envio de emails pela conta Gmail do ESTAR (SMTP). Só corre no servidor.
 *
 * Configuração (variáveis de ambiente, NUNCA no código):
 *   SMTP_USER      a conta Gmail (voluntariado.estar@gmail.com)
 *   SMTP_PASSWORD  a "palavra-passe de aplicação" do Google (16 letras)
 *   SMTP_HOST / SMTP_PORT  opcionais (por omissão smtp.gmail.com / 587)
 *   EMAIL_EQUIPA   opcional: para onde vão os avisos à equipa (por omissão, a própria conta)
 *   SITE_URL       o endereço público do site, para os links dos emails
 *
 * Sem configuração, nada é enviado (e o site continua a funcionar): fica só um aviso no registo.
 * Nunca escrevemos endereços de email nem conteúdo nos registos.
 */

export type Destino = { para?: string; bcc?: string[] };

function config() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return null;
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user,
    pass,
  };
}

export function emailConfigurado(): boolean {
  return config() !== null;
}

/** Caixa da equipa (recebe cancelamentos, testemunhos novos…). */
export function emailEquipa(): string | null {
  return process.env.EMAIL_EQUIPA || process.env.SMTP_USER || null;
}

/** Endereço do site para os links (de configuração; nunca do pedido, que pode ser falsificado). */
export function urlDoSite(caminho: string): string {
  const base =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return new URL(caminho, base).toString();
}

const pareceEmail = (e: string) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(e);

/** Um "carteiro" para vários emails seguidos (reutiliza a mesma ligação). */
export function criarCarteiro() {
  const c = config();
  if (!c) return null;
  const transporte = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    requireTLS: c.port !== 465, // 587: obriga a cifrar (STARTTLS) antes de enviar a palavra-passe
    auth: { user: c.user, pass: c.pass },
    pool: true,
    maxConnections: 1,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  const de = { name: "ESTAR · Voluntariado", address: c.user };
  const responder = emailEquipa() ?? c.user;

  return {
    /** Devolve true se o servidor de email aceitou. Nunca lança erro. */
    async enviar(d: Destino, e: Email, motivo: string): Promise<boolean> {
      const para = d.para && pareceEmail(d.para) ? d.para : undefined;
      const bcc = (d.bcc ?? []).filter(pareceEmail);
      if (!para && bcc.length === 0) return false;
      try {
        await transporte.sendMail({
          from: de,
          // Envios em massa: o destinatário visível é a própria conta, os voluntários vão em cópia oculta
          to: para ?? de,
          bcc: bcc.length ? bcc : undefined,
          replyTo: responder,
          subject: e.assunto,
          text: e.texto,
          html: e.html,
          attachments: e.anexos?.map((a) => ({ filename: a.nome, content: a.conteudo, contentType: a.tipo })),
        });
        return true;
      } catch (err) {
        const x = err as { code?: string; responseCode?: number };
        console.error(`[email] falhou (${motivo}):`, x.code ?? "", x.responseCode ?? "");
        return false;
      }
    },
    fechar() {
      transporte.close();
    },
  };
}

/** Atalho para um só email. */
export async function enviarEmail(d: Destino, e: Email, motivo: string): Promise<boolean> {
  const carteiro = criarCarteiro();
  if (!carteiro) {
    console.warn(`[email] não configurado — não enviado (${motivo})`);
    return false;
  }
  try {
    return await carteiro.enviar(d, e, motivo);
  } finally {
    carteiro.fechar();
  }
}
