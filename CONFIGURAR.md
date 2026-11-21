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
2. `supabase/migrations/20261120120000_atividades_o_que_esperar.sql`
3. `supabase/migrations/20261121120000_emails_e_exportacoes.sql`
4. `supabase/seed.sql`

> **Se o projeto já estava a funcionar:** corre só as migrações que ainda não correste (pela ordem). Não apagam
> nada. A 2 junta o campo "o que esperar" às atividades; a 3 prepara os emails automáticos (lembra-se de quem já
> foi avisado), o registo das exportações Excel e o limite de avisos à equipa.

Deve aparecer "Success" em todas. O aviso *"destructive operations"* é esperado (são as linhas `revoke`,
que retiram permissões por omissão) — podes confirmar.

> **Recomeçar do zero (só no estar-dev):** corre `supabase/apagar-tudo-dev.sql` e depois outra vez os
> ficheiros acima. Apaga todas as tabelas e dados (mas não as contas de utilizador). **Nunca no estar-prod.**

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

1. Na conta Google `voluntariado.estar@gmail.com`: ativa a **Verificação em 2 passos** e cria uma
   **Palavra-passe de aplicação** em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (nome: "Supabase ESTAR").
2. No Supabase, **Enable custom SMTP**:
   - Sender email: `voluntariado.estar@gmail.com`
   - Sender name: `ESTAR`
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: `voluntariado.estar@gmail.com`
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
3. *(Opcional, para o site enviar os emails das visitas)* preenche também `SMTP_USER`, `SMTP_PASSWORD`
   (uma palavra-passe de aplicação do Google — podes criar uma só para o teu PC) e `SITE_URL=http://localhost:3000`.
   Sem isto, o site funciona na mesma e avisa os admins de que os emails não estão configurados.
4. Corre:
   ```bash
   npm install
   npm run dev
   ```
5. Abre http://localhost:3000.

## 5. Tornar-te o primeiro admin

1. No site, vai a **Entrar**, escreve o teu email e entra com o código.
   (Vais parar à inscrição de voluntário — não precisas de a preencher.)
2. No Supabase → **SQL Editor**, abre `supabase/primeiro-admin.sql`, troca o email pelo teu e corre.
3. No site, vai a http://localhost:3000/admin → configura o **2FA** com a app do telemóvel.
4. Os outros admins: cada um entra uma vez no site; depois tu adicionas em **Admin → Admins**.

### Modo de testes: desligar o 2FA (só no estar-dev)

Para testar sem a app de autenticação, corre no **SQL Editor**:
```sql
update private.definicoes set exigir_2fa_admins = false;
```
O painel de admin mostra um aviso amarelo enquanto estiver desligado. **Antes de usar dados reais** (e sempre no estar-prod):
```sql
update private.definicoes set exigir_2fa_admins = true;
```
Isto só se muda no Supabase — ninguém o consegue mudar através do site.

### Testes rápidos sem configurar o Gmail

Sem o SMTP do passo 3.3, o Supabase só envia ~2 emails por hora e **só para emails da equipa do projeto Supabase**
(o teu). Chega para os primeiros testes feitos por ti; muda os modelos de email (3.4) na mesma.
Para testar com mais pessoas, configura o Gmail.

## 6. Abrir um período de disponibilidades

No painel: **Admin → Períodos → Abrir uma nova recolha**. Enquanto está aberto, o botão
**"Avisar voluntários por email"** envia um email a todos os voluntários ativos (em cópia oculta).

## Se um admin perder o telemóvel (2FA)

Supabase → *Authentication → Users* → abre o utilizador → **Factors** → apaga o fator.
Na próxima entrada, a pessoa configura o 2FA de novo. **Antes**, confirma por telefone que é mesmo ela que pediu.
