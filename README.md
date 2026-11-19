# ESTAR — website de voluntariado

Site do **ESTAR**, o projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras.
O plano completo está em [`PLANO.md`](./PLANO.md).

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
| `npm test` | Testes da lógica de datas, disponibilidades e ficheiros de calendário |

## Estado atual

- [x] Fase 1A: design base e site público
- [x] Fase 1B: base de dados com permissões (RLS) e testes; login por código/link de email; inscrição (com menores);
      2FA obrigatório para admins; gestão de admins; descarregar/apagar dados (RGPD); CSP e cookies httpOnly
- [x] Fase 1C-1 (área do voluntário): calendário de disponibilidades (com "repetir todas as semanas"),
      as minhas visitas (confirmar / não posso / ficheiro de calendário), enviar testemunhos, resumo da conta
- [ ] Fase 1C-2 (área de admin): abrir períodos, planeamento do mês, visitas e alocações, voluntários,
      atividades, moderação de testemunhos
- [ ] Emails ("estás alocado", cancelamentos) e publicação online

## Onde mexer

| Quero mudar… | Ficheiro |
|---|---|
| Textos das atividades, horários, regras | `src/lib/atividades.ts` |
| Email, idade mínima, menu | `src/lib/site.ts` |
| Cores e tipografia | `src/app/globals.css` |
| Testemunhos publicados | `src/lib/testemunhos.ts` (vai passar para a base de dados) |
| Cabeçalhos de segurança e CSP | `next.config.ts` |
| Base de dados, permissões (RLS) | `supabase/migrations/` (nunca editar uma migração já aplicada: criar uma nova) |
| Login, sessão, quem é admin | `src/lib/auth.ts`, `src/proxy.ts` |
| Regras do calendário de disponibilidades | `src/lib/disponibilidade.ts` (testado em `disponibilidade.test.ts`) |
| Dados de exemplo para experimentar visitas | `supabase/dados-de-teste.sql` |

## Testes das permissões da base de dados

`supabase/tests/correr.sh` cria uma base de dados Postgres temporária, aplica a migração e verifica
~100 regras (ex.: "voluntário NÃO vê dados de outro", "admin sem 2FA NÃO vê perfis").
Precisa de PostgreSQL instalado localmente. Corre-o sempre que mudares a base de dados.

## Notas

- **Enquanto estiver em testes**, o site pede aos motores de busca para não o indexar. Para o ativar em produção: definir `NEXT_PUBLIC_INDEXAVEL=true` no Vercel.
- **Segredos:** o site só usa a chave pública do Supabase. A chave secreta não é usada em lado nenhum. O `.env.local` nunca vai para o GitHub.
- As fontes (Unbounded e IBM Plex Sans) são instaladas via npm, sem pedidos à Google.
- Este projeto usa uma versão recente do Next.js com diferenças em relação a versões antigas. A documentação certa está em `node_modules/next/dist/docs/`.
