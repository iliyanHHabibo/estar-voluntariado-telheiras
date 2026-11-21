# Publicar o ESTAR (Supabase de produção + Vercel)

Há **dois** projetos Supabase:

| | `estar-dev` | `estar-prod` |
|---|---|---|
| Para quê | testes no teu PC (`npm run dev`) | o site a sério, no Vercel |
| Dados de teste (`dados-de-teste.sql`) | sim | **nunca** |
| `apagar-tudo-dev.sql` | pode ser | **nunca** |
| 2FA dos admins | pode estar desligado | **sempre ligado** |

O `.env.local` do teu PC continua a apontar para o `estar-dev`. As chaves do `estar-prod` só vão para o Vercel.

> ⚠️ Nunca coles palavras-passe, a palavra-passe de aplicação do Gmail ou chaves secretas no chat, no código
> ou no GitHub. Só nos sítios indicados abaixo (Supabase e Vercel).

---

## Parte A — Supabase `estar-prod`

### A1. Base de dados
No **SQL Editor** do `estar-prod`, corre por esta ordem (copiar o ficheiro todo → *Run*):

1. `supabase/migrations/20261114120000_esquema_inicial.sql`
2. `supabase/migrations/20261120120000_atividades_o_que_esperar.sql`
3. `supabase/migrations/20261121120000_emails_e_exportacoes.sql`
4. `supabase/seed.sql`

Mais nada (nem dados de teste, nem desligar o 2FA).

### A2. Autenticação — igual ao `estar-dev`
Segue o [`CONFIGURAR.md`](./CONFIGURAR.md), secções **3.2 a 3.5**, no `estar-prod`:
- 3.2 Email (OTP 900 segundos, 6 dígitos)
- 3.3 SMTP do Gmail (podes usar a mesma palavra-passe de aplicação "Supabase ESTAR" do `estar-dev`)
- 3.4 Modelos de email (Magic Link e Confirm signup)
- 3.5 2FA (TOTP ativo)

O passo **3.1 (endereços)** faz-se no fim da parte B, quando souberes o endereço do Vercel.

### A3. Chaves para o Vercel
*Project Settings → API Keys* do `estar-prod`: vais precisar do **Project URL** e da **Publishable key**
(`sb_publishable_…`). **Não** a chave secreta.

---

## Parte B — Vercel

### B1. Importar o projeto
1. [vercel.com/new](https://vercel.com/new) → **Import** do repositório `estar-voluntariado-telheiras`.
2. **Project Name:** por exemplo `estar-telheiras` (o site fica em `https://estar-telheiras.vercel.app`, se o nome estiver livre).
3. Framework: **Next.js** (deteta sozinho). Não mexas nos comandos de build.

### B2. Variáveis de ambiente (antes de carregar em *Deploy*)
Em **Environment Variables**, junta:

| Nome | Valor | Sensível? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do **estar-prod** | não |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key do **estar-prod** | não (é pública) |
| `SMTP_USER` | `voluntariado.estar@gmail.com` | não |
| `SMTP_PASSWORD` | palavra-passe de aplicação **"Site ESTAR"** (16 letras, sem espaços) | **sim** — marca *Sensitive* |
| `SITE_URL` | `https://estar-telheiras.vercel.app` (o teu endereço) | não |
| `CRON_SECRET` | uma frase aleatória longa (ex.: gerada por um gestor de passwords) | **sim** |

Não ponhas `NEXT_PUBLIC_INDEXAVEL` enquanto o site estiver em testes (assim o Google não o mostra).
Opcional: `EMAIL_EQUIPA` se quiseres que os avisos à equipa vão para outra caixa.

Carrega em **Deploy**. Demora 1–2 minutos.

### B3. Ligar o Supabase ao endereço do site
No `estar-prod` → *Authentication → URL Configuration*:
- **Site URL:** `https://estar-telheiras.vercel.app`
- **Redirect URLs:** `https://estar-telheiras.vercel.app/**`

(Troca pelo teu endereço, se for outro.)

### B4. Primeiro admin
1. Abre o site → **Entrar** → o teu email → código.
2. SQL Editor do `estar-prod` → `supabase/primeiro-admin.sql` com o teu email → *Run*.
3. No site → **/admin** → configura o **2FA** com a app do telemóvel.
4. Os outros admins entram uma vez no site; depois adicionas em **Admin → Admins**.

### B5. Daqui para a frente
- Cada `git push` para `main` publica uma nova versão sozinho (em ~2 minutos).
- **Erros e emails falhados:** Vercel → projeto → **Logs** (procura `[email]`, `[visitas]`, etc.). Nunca aparecem
  endereços nem conteúdos, só o tipo de erro.
- Se mudares uma variável de ambiente, tens de fazer **Redeploy** (Deployments → ⋯ → Redeploy).
- Uma vez por dia o Vercel chama `/api/manter-ativo`, para o Supabase grátis não "adormecer" o projeto
  (acontece ao fim de 7 dias sem uso).

---

## Parte C — Verificar (lista para o primeiro dia)

- [ ] O site abre em `https://…vercel.app`, com cadeado.
- [ ] Entrar com um email novo: chega o email do Supabase **em português**, com código; o código funciona.
- [ ] Inscrição de voluntário completa (testa também com uma data de nascimento de 16–17 anos).
- [ ] Admin: o 2FA é pedido; **não** aparece o aviso amarelo "2FA desligado".
- [ ] Admin → Períodos: criar e abrir uma recolha → **Avisar voluntários por email** → o email chega.
- [ ] Indicar disponibilidades como voluntário.
- [ ] Criar uma visita → alocar → confirmar pelo responsável → **Comunicar** → aparece "Enviámos N emails"
      e o voluntário recebe o email com o ficheiro de calendário (abre no telemóvel).
- [ ] Voluntário diz "não posso" → chega um aviso à caixa do ESTAR.
- [ ] Enviar um testemunho → chega um aviso à caixa do ESTAR; aprová-lo → aparece em /testemunhos.
- [ ] Exportar voluntários e visitas para Excel.
- [ ] (Opcional) Verificar os cabeçalhos de segurança em [securityheaders.com](https://securityheaders.com).

## Antes de abrir ao público (janeiro)
- [ ] Rever os textos de **/privacidade** e **/termos** (estão como rascunho) — idealmente com alguém da paróquia.
- [ ] Ativar o anti-robôs (Turnstile, `CONFIGURAR.md` 3.6) com o domínio do Vercel e juntar
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no Vercel.
- [ ] Quando quiserem aparecer no Google: `NEXT_PUBLIC_INDEXAVEL=true` no Vercel + Redeploy.
- [ ] Apagar contas de teste criadas no `estar-prod` durante os testes.

## Limites dos planos grátis (para saberem)
- **Gmail:** ~500 emails por dia. Chega bem para o ESTAR.
- **Supabase grátis:** 500 MB de base de dados, 50 000 utilizadores por mês. Chega bem.
- **Vercel Hobby:** pensado para projetos pessoais e sem fins comerciais — é o caso.
