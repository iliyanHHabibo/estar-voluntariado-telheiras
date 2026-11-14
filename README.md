# ESTAR — website de voluntariado

Site do **ESTAR**, o projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras.
O plano completo está em [`PLANO.md`](./PLANO.md).

## Como correr no teu computador

Precisas de [Node.js](https://nodejs.org) (versão LTS) e Git.

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

## Estado atual

- [x] Fase 1 (parte A): design base e site público (Início, Atividades, Como funciona, Testemunhos, Quem somos, Perguntas, Contactos, Privacidade, Termos)
- [ ] Fase 1 (parte B): base de dados, login, inscrição, disponibilidades, área de admin, emails

## Onde mexer

| Quero mudar… | Ficheiro |
|---|---|
| Textos das atividades, horários, regras | `src/lib/activities.ts` |
| Email, idade mínima, menu | `src/lib/site.ts` |
| Cores e tipografia | `src/app/globals.css` |
| Testemunhos publicados | `src/lib/testimonials.ts` (vai passar para a base de dados) |
| Cabeçalhos de segurança | `next.config.ts` |

## Notas

- **Enquanto estiver em testes**, o site pede aos motores de busca para não o indexar. Para o ativar em produção: definir `NEXT_PUBLIC_INDEXAVEL=true` no Vercel.
- **Segredos** (chaves da base de dados, password do email) ficam em `.env.local` e nunca vão para o GitHub (o `.gitignore` já os protege).
- As fontes (Unbounded e IBM Plex Sans) são instaladas via npm, sem pedidos à Google.
- Este projeto usa uma versão recente do Next.js com diferenças em relação a versões antigas. A documentação certa está em `node_modules/next/dist/docs/`.
