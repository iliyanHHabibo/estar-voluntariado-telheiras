# ESTAR — website de voluntariado

Site do **ESTAR**, o projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras.
O plano completo está em [`PLANO.md`](./PLANO.md).

**Site:** https://estar-voluntariado-telheiras.vercel.app — **em testes** (uso real a partir de janeiro de 2027).

## Como funciona (fluxo de trabalho de um mês)

1. **Recolha:** um admin abre o período de disponibilidades (normalmente de 15 a 25 do mês anterior) e carrega em
   "Avisar voluntários por email". Os voluntários indicam no site os dias e horas em que podem ir.
2. **Planeamento:** os admins criam as visitas e escolhem quem vai (o site mostra quem está livre e avisa de conflitos).
   Os voluntários ainda não veem nada.
3. **Responsável:** o site gera a mensagem com as visitas e os contactos; um admin envia-a ao responsável do local
   (os responsáveis não usam o site) e, quando ele aprova, marca a visita como "confirmada pelo responsável".
4. **Comunicar:** "Comunicar aos voluntários" envia a cada um um email com a visita e um ficheiro de calendário.
   Cada voluntário confirma ou diz que não pode.
5. **Imprevistos:** quem não pode ir gera um aviso à equipa e um número vermelho no menu de admin; alterações e
   cancelamentos são avisados por email automaticamente.
6. **Depois:** a visita é marcada como realizada, com as presenças. Os voluntários podem enviar testemunhos,
   que os admins revêem antes de publicar.

Guias de teste (para amigos): "ESTAR — Guia de teste para voluntários" e "… para admins" (documentos partilhados à parte).

## Como correr no teu computador

Precisas de [Node.js](https://nodejs.org) (versão LTS), Git e um projeto Supabase.
**Segue o guia [`CONFIGURAR.md`](./CONFIGURAR.md)** (Supabase, emails, primeiro admin).

```bash
npm install
npm run dev
```

Abre http://localhost:3000 no browser.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (atualiza ao guardar ficheiros) |
| `npm run build` | Compila a versão de produção (e deteta erros) |
| `npm start` | Corre a versão compilada |
| `npm run lint` | Verifica o código |
| `npm test` | Testes da lógica de datas, disponibilidades, visitas, exportações, ficheiros de calendário e texto dos emails |

## Estado atual

- [x] Fase 1A: design base e site público
- [x] Fase 1B: base de dados com permissões (RLS) e testes; login por código/link de email; inscrição (com menores);
      2FA obrigatório para admins; gestão de admins; descarregar/apagar dados (RGPD); CSP e cookies httpOnly
- [x] Fase 1C-1 (área do voluntário): calendário de disponibilidades (com "repetir todas as semanas"),
      as minhas visitas (confirmar / não posso / ficheiro de calendário), enviar testemunhos, resumo da conta
- [x] Fase 1C-2 (área de admin): períodos de disponibilidades, planeamento do mês, criar visitas, alocar
      (com avisos de conflitos), estados da visita, mensagem para o responsável, presenças
- [x] Fase 1C-3: voluntários (lista, pesquisa, ficha, notas, ativar/desativar), atividades (editar textos, horários,
      limites, contacto do responsável e feriados), moderação de testemunhos, páginas públicas a ler da base de dados,
      exportações para Excel
- [x] Emails automáticos pelo Gmail: "estás nesta visita" (com ficheiro de calendário), visita alterada/cancelada,
      retirado da visita, recolha de disponibilidades aberta; avisos à equipa (cancelamentos, testemunhos novos);
      registo de quem exporta dados pessoais
- [x] Publicação online no Vercel + Supabase de produção (`estar-prod`) — ver [`PUBLICAR.md`](./PUBLICAR.md);
      números vermelhos no menu (visitas por responder, testemunhos por rever, visitas com falta de pessoas);
      chamada diária para o Supabase grátis não adormecer
- [ ] Testes com amigos (voluntários e admins) e correções
- [ ] Antes de janeiro: rever textos de privacidade e termos, ativar o anti-robôs (Turnstile), deixar o Google
      indexar, apagar contas e visitas de teste

## Onde o site corre

| | Para quê | Base de dados |
|---|---|---|
| O teu PC (`npm run dev`) | experimentar mudanças | `estar-dev` (`.env.local`) |
| Vercel | o site a sério | `estar-prod` (variáveis no Vercel) |

Cada `git push` para `main` publica uma nova versão em ~2 minutos. Uma migração nova da base de dados corre-se
à mão no SQL Editor do Supabase: primeiro no `estar-dev`, depois de testada no `estar-prod`.

## Onde mexer

| Quero mudar… | Ficheiro |
|---|---|
| Textos das atividades, horários, regras, feriados | no site, em **Admin → Atividades** (`src/lib/atividades.ts` é só o texto de reserva se a base de dados falhar) |
| Email, idade mínima, menu | `src/lib/site.ts` |
| Texto dos emails automáticos | `src/lib/emails/modelos.ts` (testado em `modelos.test.ts`) |
| Cores e tipografia | `src/app/globals.css` |
| Testemunhos publicados | no site, em **Admin → Testemunhos** |
| Cabeçalhos de segurança e CSP | `next.config.ts` |
| Base de dados, permissões (RLS) | `supabase/migrations/` (nunca editar uma migração já aplicada: criar uma nova) |
| Login, sessão, quem é admin | `src/lib/auth.ts`, `src/proxy.ts` |
| Números vermelhos do menu | `src/lib/contadores.ts` |
| Envio de emails (Gmail) | `src/lib/emails/enviar.ts` e `avisos-visitas.ts` |
| Tarefas automáticas diárias | `vercel.json` |
| Regras do calendário de disponibilidades | `src/lib/disponibilidade.ts` (testado em `disponibilidade.test.ts`) |
| Dados de exemplo para experimentar visitas | `supabase/dados-de-teste.sql` |

## Testes das permissões da base de dados

`supabase/tests/correr.sh` cria uma base de dados Postgres temporária, aplica as migrações e verifica
~200 regras (incl. o fluxo completo do admin: criar → alocar → comunicar → responder; e a gestão de atividades, testemunhos e notas) (ex.: "voluntário NÃO vê dados de outro", "admin sem 2FA NÃO vê perfis").
Precisa de PostgreSQL instalado localmente. Corre-o sempre que mudares a base de dados.

## Notas

- **Enquanto estiver em testes**, o site pede aos motores de busca para não o indexar. Para o ativar em produção: definir `NEXT_PUBLIC_INDEXAVEL=true` no Vercel.
- **Segredos:** o site só usa a chave pública do Supabase. A chave secreta não é usada em lado nenhum (nem a
  integração Supabase ↔ Vercel, que a copiaria). A palavra-passe do Gmail só existe nas variáveis do Vercel e no
  `.env.local`, que nunca vai para o GitHub.
- As fontes (Unbounded e IBM Plex Sans) são instaladas via npm, sem pedidos à Google.
- Este projeto usa uma versão recente do Next.js com diferenças em relação a versões antigas. A documentação certa está em `node_modules/next/dist/docs/`.
