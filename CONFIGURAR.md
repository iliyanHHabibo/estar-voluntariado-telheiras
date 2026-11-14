# Configurar o ESTAR (Supabase + PC)

Guia passo a passo para pores o site a funcionar no teu computador, ligado ao projeto **estar-dev**.
Faz o mesmo mais tarde no **estar-prod** (com o endereço do site em vez de `localhost`).

> ⚠️ **Nunca** coloques a chave secreta do Supabase (`sb_secret_…` / `service_role`) no código, no `.env.local`
> ou em mensagens. Este site **não precisa dela**.

---

## 1. Criar o projeto

1. Em [supabase.com](https://supabase.com), cria uma conta (ativa o 2FA da conta em *Account → Security*).
2. **New project** → nome `estar-dev`, região **Frankfurt (eu-central-1)**, password da base de dados forte (guarda-a num gestor de passwords).

## 2. Criar a base de dados

No menu **SQL Editor** → **New query**, corre **por esta ordem** (copiar o ficheiro todo → *Run*):

1. `supabase/migrations/20261114120000_esquema_inicial.sql`
2. `supabase/seed.sql`

Deve aparecer "Success" nas duas.

## 3. Autenticação

### 3.1 Endereços (*Authentication → URL Configuration*)
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/**`
  (no estar-prod: o endereço do Vercel, ex.: `https://estar-telheiras.vercel.app` e `https://estar-telheiras.vercel.app/**`)

### 3.2 Email (*Authentication → Sign In / Providers → Email*)
- **Email** ativo; **Confirm email** ativo.
- **Email OTP Expiration:** `900` (15 minutos).
- **Email OTP Length:** `6`.

### 3.3 Enviar emails pelo Gmail (*Authentication → Emails → SMTP Settings*)

O Supabase, sem isto, só envia 2–3 emails por hora e só para a equipa do projeto.

1. Na conta Google `estar.voluntariado@gmail.com`: ativa a **Verificação em 2 passos** e cria uma
   **Palavra-passe de aplicação** em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (nome: "Supabase ESTAR").
2. No Supabase, **Enable custom SMTP**:
   - Sender email: `estar.voluntariado@gmail.com`
   - Sender name: `ESTAR`
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: `estar.voluntariado@gmail.com`
   - Password: a palavra-passe de aplicação (16 letras)
3. Em *Authentication → Rate Limits*, põe **Rate limit for sending emails** em ~`60` por hora.

### 3.4 Modelos de email (*Authentication → Emails → Templates*)

Muda **dois** modelos — **Magic Link** e **Confirm signup** — para o mesmo conteúdo:

**Assunto:** `O teu código de acesso ao ESTAR`

**Corpo (Source):**
```html
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; color: #101512">
  <h2 style="color: #0b5534">Olá!</h2>
  <p>O teu código para entrar no ESTAR é:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0">{{ .Token }}</p>
  <p>Ou carrega no botão:</p>
  <p>
    <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}"
       style="display: inline-block; background: #00c060; color: #101512; padding: 12px 24px;
              border-radius: 999px; text-decoration: none; font-weight: bold">Entrar no ESTAR</a>
  </p>
  <p style="color: #3d4540; font-size: 14px">O código é válido durante 15 minutos.
    Se não foste tu a pedir, podes ignorar este email.</p>
  <p style="color: #3d4540; font-size: 14px">— Equipa ESTAR · Grupo de Jovens da Paróquia de Telheiras</p>
</div>
```

### 3.5 2FA (*Authentication → Multi-Factor*)
- **TOTP (App Authenticator)**: ativo ("Enabled").

### 3.6 Anti-robôs (opcional, recomendado antes de abrir ao público)
1. Em [Cloudflare → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile), cria um widget para `localhost` (e mais tarde para o domínio do site). Guarda a **Site Key** e a **Secret Key**.
2. Supabase → *Authentication → Attack Protection* → **Enable Captcha protection** → Turnstile → cola a **Secret Key**.
3. No `.env.local`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Site Key>`.

> Se ativares o captcha no Supabase **sem** pôr a Site Key no site, ninguém consegue entrar.

## 4. Ligar o site ao Supabase (no teu PC)

1. *Project Settings → API Keys* → copia o **Project URL** e a **Publishable key** (`sb_publishable_…`).
2. Na pasta do projeto, copia `.env.example` para `.env.local` e preenche essas duas linhas.
3. Corre:
   ```bash
   npm install
   npm run dev
   ```
4. Abre http://localhost:3000.

## 5. Tornar-te o primeiro admin

1. No site, vai a **Entrar**, escreve o teu email e entra com o código.
   (Vais parar à inscrição de voluntário — não precisas de a preencher.)
2. No Supabase → **SQL Editor**, abre `supabase/primeiro-admin.sql`, troca o email pelo teu e corre.
3. No site, vai a http://localhost:3000/admin → configura o **2FA** com a app do telemóvel.
4. Os outros admins: cada um entra uma vez no site; depois tu adicionas em **Admin → Admins**.

## 6. Abrir um período de disponibilidades (enquanto o painel não tem esta opção)

No SQL Editor (ajusta as datas):
```sql
insert into public.availability_periods (mes, abre_em, fecha_em)
values ('2026-12-01', '2026-11-15', '2026-11-25');
```

## Se um admin perder o telemóvel (2FA)

Supabase → *Authentication → Users* → abre o utilizador → **Factors** → apaga o fator.
Na próxima entrada, a pessoa configura o 2FA de novo. **Antes**, confirma por telefone que é mesmo ela que pediu.
