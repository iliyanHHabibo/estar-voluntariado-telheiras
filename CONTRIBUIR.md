# Contribuir para o ESTAR

Bem-vindo! Este guia explica como pôr o site a correr no teu computador e como propor alterações sem pôr
em risco o site a sério nem os dados dos voluntários.

O site guarda dados pessoais reais (nomes, telemóveis, idades — incluindo de menores de 16–17 anos).
Por isso há algumas regras que não são opcionais: estão marcadas com ⚠️.

---

## 1. Contas e segurança (antes de tudo)

- ⚠️ Ativa o **2FA** na tua conta do **GitHub** (*Settings → Password and authentication*) e na do
  **Supabase** (*Account → Security*).
- ⚠️ **Nunca** escrevas palavras-passe, chaves ou códigos em chats, issues, pull requests ou no código.
- Tens acesso aos dois projetos Supabase:

  | Projeto | Para quê | Podes… |
  |---|---|---|
  | `estar-dev` | testes | usar à vontade (criar dados falsos, apagar, experimentar) |
  | `estar-prod` | o site a sério, com dados reais | ⚠️ **não mexer** — nem SQL, nem ver dados — sem combinar antes |

- ⚠️ A **chave secreta** do Supabase (`sb_secret_…` / `service_role`) **nunca** é usada neste projeto: nem no
  código, nem no `.env.local`, nem no Vercel. O site só usa a chave pública (`sb_publishable_…`).
- Não instales a integração Supabase ↔ Vercel (copiaria a chave secreta para o Vercel).

## 2. Instalar

Precisas de: [Node.js](https://nodejs.org) (versão LTS), Git, um editor (ex.: VS Code).
Opcional: PostgreSQL, para correr os testes da base de dados.

```bash
git clone https://github.com/iliyanHHabibo/estar-voluntariado-telheiras.git
cd estar-voluntariado-telheiras
npm install
```

## 3. Ligar ao `estar-dev`

1. No Supabase, abre o projeto **`estar-dev`** → *Project Settings → API Keys*. Copia o **Project URL** e a
   **Publishable key** (`sb_publishable_…`).
2. Copia `.env.example` para `.env.local` e preenche essas duas linhas.
   - ⚠️ Confirma que são do **`estar-dev`**, nunca do `estar-prod`.
   - O `.env.local` nunca vai para o GitHub (está no `.gitignore`).
   - Não precisas do Gmail (SMTP): sem ele, o site funciona e só não envia os emails das visitas.
3. Corre:
   ```bash
   npm run dev
   ```
   e abre http://localhost:3000.

### Tornares-te admin no `estar-dev`
1. Entra no site local com o teu email (o código chega por email).
2. No SQL Editor do **`estar-dev`**, corre `supabase/primeiro-admin.sql` com o teu email.
3. Vai a http://localhost:3000/admin e configura o 2FA (ou, só no `estar-dev`, desliga-o — ver `CONFIGURAR.md`).

Para ter visitas e voluntários de exemplo: `supabase/dados-de-teste.sql` (só no `estar-dev`).

## 4. Como propor uma alteração

Nunca trabalhes diretamente no `main`: tudo o que entra no `main` vai para o site a sério em ~2 minutos.

```bash
git switch main
git pull
git switch -c nome-curto-da-alteracao
```
```bash
# … fazes as alterações …
npm run lint
npm test
npm run build
```
```bash
git add -A
git commit -m "O que mudou, em português"
git push -u origin nome-curto-da-alteracao
```

Depois, no GitHub, abre um **Pull Request** para o `main`. Explica o que mudou e como testaste.
Quem faz o merge revê primeiro.

## 5. Regras do código

- **Português (PT-PT)** em tudo: textos do site, nomes de variáveis, tabelas e comentários.
- **Base de dados:** cada alteração é um **ficheiro de migração novo** em `supabase/migrations/` (nunca editar
  um já aplicado). Corre `supabase/tests/correr.sh` se tiveres PostgreSQL, e acrescenta testes para regras novas.
  As migrações correm-se à mão: primeiro no `estar-dev`; **no `estar-prod` só depois de combinado**.
- **Permissões:** quem pode ver ou mudar o quê é decidido pelas regras RLS na base de dados — não só no site.
  Qualquer tabela nova tem de ter RLS ativo e testes.
- **Dependências:** evita acrescentar pacotes. Se for mesmo preciso, fixa a versão exata e escolhe uma com
  pelo menos 2 semanas.
- **Dados de teste:** só inventados (`@exemplo.pt`). Nunca dados reais de voluntários em código, testes,
  capturas de ecrã ou issues.
- **Next.js:** este projeto usa uma versão recente com diferenças importantes. Antes de mexer, lê
  `AGENTS.md` e a documentação em `node_modules/next/dist/docs/`. (Se usares um assistente de IA, ele também
  deve ler o `AGENTS.md`.)

Onde está cada coisa: tabela **"Onde mexer"** no [`README.md`](./README.md).
Como o site está configurado: [`CONFIGURAR.md`](./CONFIGURAR.md) e [`PUBLICAR.md`](./PUBLICAR.md).

## 6. Se algo correr mal

- Fizeste commit de uma palavra-passe ou chave por engano? **Avisa logo**: é preciso trocá-la (apagar o commit
  não chega, porque o repositório é público).
- Mexeste no `estar-prod` sem querer? Avisa logo, sem tentar corrigir sozinho.
- Dúvidas: pergunta antes de fazer. É sempre mais rápido do que desfazer.
