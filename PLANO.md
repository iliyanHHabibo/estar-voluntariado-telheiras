# ESTAR — Plano do website de voluntariado

> **ESTAR** — Voluntariado do Grupo de Jovens da Paróquia de Telheiras
> *"Às vezes, basta ESTAR."*

Documento de planeamento. Reúne tudo o que foi decidido antes de começar o desenvolvimento.
Última atualização: novembro 2026.

---

## 1. Objetivo

Um site simples, que qualquer pessoa consiga usar, em que:

- **os voluntários** se inscrevem, dizem uma vez por mês quando estão disponíveis, veem as visitas para que foram alocados e partilham testemunhos;
- **os admins** alocam os voluntários às visitas (depois de falarem com os responsáveis de cada atividade), confirmam as visitas com os voluntários, têm os contactos e moderam os testemunhos.

Substitui o site atual feito no Canva e o Google Form de inscrições.

---

## 2. Atividades (situação atual)

| Atividade | Dias | Horário |
|---|---|---|
| Visita à Unidade 4 da Clínica de S. José | Todos os dias | 10h–18h |
| Visita ao Centro de Dia | Dias úteis | 10h–17h |

- Uma visita dura **no mínimo 1 hora** e pode ser mais longa.
- Por visita: **mínimo 2 e máximo 5 voluntários**. São apenas valores de referência: o site avisa, mas os admins podem alocar como quiserem.
- Os horários, dias, limites e dias de fecho (feriados, férias) podem ser editados pelos admins. Também é possível criar novas atividades.

---

## 3. Fluxo mensal

```
Dia 15–25 do mês anterior   → Voluntários indicam disponibilidades para o mês seguinte
Dia 26–fim do mês           → Admins falam com os responsáveis, criam as visitas e alocam pessoas
Até dia 1                   → Voluntários recebem email "Estás alocado para…" e confirmam
Durante o mês               → Lembretes; botão "Não posso ir" para cancelar
```

- As datas de abertura e fecho podem ser configuradas mês a mês.
- Depois do fecho, o voluntário já não pode alterar as disponibilidades. Os admins podem sempre acrescentar ou alterar.
- **Os responsáveis das atividades não usam o site.** Os admins falam com eles por fora e marcam a visita como "confirmada pelo responsável".

### Estados

**Visita (sessão):** `rascunho → confirmada pelo responsável → comunicada aos voluntários → realizada | cancelada`

**Alocação (voluntário numa visita):** `proposta → confirmada pelo voluntário | recusada → (cancelada) → presente | faltou`

---

## 4. Identidade e design

O site mantém a identidade do site atual no Canva.

- **Tom:** emocional, frases curtas, na 2.ª pessoa ("Junta-te à equipa!", "Às vezes, basta ESTAR.").
- **Cores:**
  - verde-escuro `#0B5534` (fundos de destaque);
  - verde vivo `#00C060` (botões);
  - cinza-claro `#E1E3DF`;
  - preto e branco.
- **Tipografia** (a escolher no Google Fonts):
  - títulos em maiúsculas, com letra larga ("extended"), por exemplo *Unbounded* ou *Archivo Expanded*;
  - texto corrido numa sans legível, por exemplo *IBM Plex Sans*.
- **Fotografias:** só de banco de imagens ou ilustrações. **Nunca fotos das atividades, dos utentes nem dos voluntários durante as visitas.**
- **Mobile first:** a maioria das pessoas vai usar o site no telemóvel.
- **Acessibilidade:** bom contraste, letra grande, botões grandes, navegação por teclado.
- Identificação clara: "Grupo de Jovens da Paróquia de Telheiras" no topo, na página "Quem somos" e no rodapé.

---

## 5. Site público (sem login)

1. **Início**
   - Frase forte e botão **"Quero ser voluntário"**.
   - O que é o ESTAR, em 2 ou 3 linhas.
   - Números de impacto: horas de voluntariado, visitas realizadas, voluntários. Mostram o projeto sem precisar de fotos.
   - Testemunhos em destaque.
   - "Começa onde estás", a ideia do site atual: o café, o banco do jardim, os avós.
2. **Atividades:** um cartão por atividade com:
   - o que é e o que se faz;
   - onde é (morada e como chegar);
   - dias e horários;
   - o que esperar e regras: não tirar fotos, confidencialidade, pontualidade, avisar se não puder ir.
3. **Como funciona:** os passos do fluxo mensal, com ícones.
4. **Testemunhos:** os testemunhos aprovados, com primeiro nome ou "Anónimo" e a atividade.
5. **Quem somos:** o ESTAR e o Grupo de Jovens da Paróquia de Telheiras.
6. **Perguntas frequentes:**
   - "Preciso de experiência?"
   - "Quanto tempo dura uma visita?"
   - "E se não puder ir?"
   - "Qual a idade mínima?"
   - "Como são usados os meus dados?"
7. **Contactos:** `voluntariado.estar@gmail.com`.
8. **Política de Privacidade** e **Termos**.

---

## 6. Área do voluntário (com login)

### 6.1 Login

- Sem password: a pessoa escreve o email e recebe um **link de acesso** ("magic link").

### 6.2 Inscrição

- **Campos:** nome, email, telefone, data de nascimento e atividades de interesse.
- **Idade mínima:** 16 anos. O valor pode ser configurado.
- **Menores de 18 anos** indicam também o nome, o telefone e o email do encarregado de educação e marcam a caixa *"Declaro ter autorização do meu encarregado de educação"*.
- **O voluntário aceita:**
  - a Política de Privacidade;
  - que o seu contacto seja partilhado com o responsável da atividade;
  - as regras das atividades (confidencialidade, não tirar fotos).

### 6.3 As minhas disponibilidades

- Calendário do mês seguinte, aberto entre as datas definidas.
- Em cada dia o voluntário indica um ou mais intervalos: atividade (ou "qualquer"), hora de início e hora de fim, com no mínimo 1h, em passos de 30 min ou 1h.
  - Exemplo: *Terça, 12 — Clínica — das 14h às 17h*.
- Atalho **"Repetir todas as semanas"**, para preencher o mês em poucos cliques.
- Só aparecem os dias e as horas em que cada atividade funciona.
- Campo opcional de observações, por exemplo "este mês prefiro só 2 visitas".

### 6.4 As minhas visitas

- Lista das próximas visitas e das passadas, com atividade, data, hora, morada e estado.
- Botões **Confirmo** e **Não posso**. Os mesmos botões vêm também no email.
- Botão **"Adicionar ao calendário"**, que descarrega um ficheiro `.ics` e funciona no iPhone e no Android.
- Botão **"Não posso ir"**, que avisa os admins por email.

### 6.5 Outras funcionalidades

- **Enviar testemunho:** texto; escolha entre "mostrar o meu primeiro nome" e "anónimo"; atividade; autorização para publicar. Antes do formulário aparece a regra: *não incluir nomes nem dados de utentes*.
- **O meu perfil:**
  - editar os dados;
  - descarregar os meus dados;
  - apagar a conta.
- **(Fase 3)** Horas acumuladas e **certificado de voluntariado** em PDF.

---

## 7. Área de administração

Só há perfil de **admin**, e cada admin vê tudo. São pelo menos 5 contas, cada uma pessoal e com 2FA obrigatório.

1. **Painel inicial**
   - Próximas visitas.
   - Visitas abaixo do mínimo (a vermelho).
   - Quantos voluntários já entregaram disponibilidades este mês.
   - Testemunhos por rever.
   - Cancelamentos recentes.
2. **Planeamento do mês**
   - Grelha com os dias e, para cada atividade, as visitas criadas, as pessoas disponíveis e as alocadas.
   - Criar uma visita: atividade, dia, hora de início e de fim (mínimo 1h).
   - Ao criar ou abrir uma visita, o site mostra **quem está disponível nesse horário**. Os admins alocam com um clique.
   - Avisos (não bloqueiam): menos de 2 ou mais de 5 pessoas, voluntário já alocado nesse dia, voluntário menor de idade.
3. **Detalhe da visita**
   - Lista de quem vai, com telefone e email.
   - Caixa "Confirmada pelo responsável".
   - Botão **"Copiar lista"**, que dá um texto pronto a colar no WhatsApp ou num email para o responsável.
   - Botão **"Enviar confirmação aos voluntários"**.
   - Registar presenças e faltas depois da visita.
4. **Voluntários**
   - Lista com pesquisa e filtros: atividade, ativo/inativo, menor de idade.
   - Ficha de cada voluntário: contactos, dados do encarregado de educação (se for menor), histórico de visitas, horas e notas internas. Os voluntários nunca veem as notas.
5. **Disponibilidades:** ver e editar as disponibilidades de qualquer voluntário. Também serve para quem envia por WhatsApp em vez de usar o site.
6. **Testemunhos:** ler, editar o texto publicado, aprovar, rejeitar e marcar destaques.
7. **Atividades:** nome, descrição, morada, horários por dia da semana, dias de fecho, mínimo e máximo de voluntários, responsável e contacto (só para os admins), e regras.
8. **Períodos mensais:** abrir e fechar a recolha de disponibilidades de cada mês.
9. **Comunicações:** enviar email a todos os voluntários ou aos de uma atividade, por exemplo "As disponibilidades de dezembro estão abertas!".
10. **Exportar** voluntários e visitas para CSV/Excel.
11. **Admins:** convidar e remover admins.
12. **Registo de atividade:** quem fez o quê e quando (alocações, aprovações, apagamentos).

---

## 8. Emails e lembretes

| Momento | Email |
|---|---|
| Inscrição | Boas-vindas e link de acesso |
| Abertura do período | "Já podes indicar as tuas disponibilidades para \<mês\>" |
| 2 dias antes do fecho | Lembrete a quem ainda não entregou |
| Alocação | "Estás alocado para…", com os botões Confirmo e Não posso e o ficheiro `.ics` |
| **24h antes** | Lembrete com hora, morada e contacto para imprevistos (fase 2) |
| **3h antes** | Lembrete curto (fase 2) |
| Cancelamento por um voluntário | Aviso aos admins |
| Novo testemunho | Aviso aos admins |

**Lembretes no telemóvel:**
- O ficheiro `.ics` inclui alarmes, o que funciona em iPhone e Android sem instalar nenhuma app.
- **(Fase 2)** Cada voluntário pode subscrever um **calendário pessoal** através de um link secreto, que pode ser revogado. As visitas aparecem e atualizam-se sozinhas no telemóvel.
- **(Futuro)** SMS ou WhatsApp, que têm custo por mensagem.

**Envio dos emails:**
- **Durante os testes:** através do Gmail `voluntariado.estar@gmail.com`, com uma password de aplicação (cerca de 500 emails/dia).
- **Com domínio próprio:** através do Resend (gratuito até 3000/mês), com remetente do tipo `ola@<dominio>`. Os emails chegam melhor e não caem no spam.

---

## 9. Segurança

**Contas e acessos**
- **Admins:** código/link por email + **2FA obrigatório** (código numa app do telemóvel). Sem passwords, que se podem reutilizar ou roubar. Só se tornam admins por decisão de outro admin (ou, o primeiro, no Supabase).
- **O 2FA é exigido pela própria base de dados:** um admin que entre só com o email (sem o 2FA) não consegue ler nenhum dado pessoal.
- **Voluntários:** login por link enviado por email, sem passwords que se possam roubar.
- **Sessões** guardadas em cookies `httpOnly`/`secure`, que expiram.

**Proteção dos dados**
- Permissões aplicadas **na própria base de dados** (Row Level Security, em todas as tabelas):
  - cada voluntário só lê e altera os seus próprios dados;
  - o público só lê as atividades e os testemunhos aprovados;
  - só os admins leem contactos, notas e listas.
- **Chaves secretas** guardadas apenas em variáveis de ambiente (Vercel e `.env.local`). Nunca vão para o GitHub nem para o browser. O `.env*` está no `.gitignore`.

**Formulários e páginas**
- **Validação no servidor** de todos os dados que entram.
- Os testemunhos são guardados como texto simples, sem HTML.
- **Anti-bots:** Cloudflare Turnstile (gratuito) nos formulários públicos, mais um limite de pedidos.
- **HTTPS obrigatório** e cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy).

**Controlo e recuperação**
- **Registo de atividade** das ações dos admins.
- **Cópia de segurança** semanal automática e cifrada da base de dados, guardada fora do GitHub.

**Repositório e infraestrutura**
- Repositório **privado**. Todos os colaboradores com 2FA.
- A branch `main` está protegida: as alterações entram por Pull Request.
- Dependabot e verificação de segredos ativos no GitHub.
- Dados alojados na **UE** (Supabase, região de Frankfurt).

---

## 10. Privacidade (RGPD)

- Recolher só o necessário: nome, contactos, data de nascimento (para a idade mínima e os menores) e disponibilidades. **Nenhum dado de saúde nem de utentes.**
- Consentimentos explícitos na inscrição, guardados com data e hora.
- Menores: dados do encarregado de educação e declaração de autorização.
- O voluntário pode ver, descarregar e apagar os seus dados.
- **Prazo de conservação:** voluntários inativos há mais de 24 meses são anonimizados. O prazo pode ser ajustado.
- Testemunhos revistos pelos admins antes de publicar, sem nomes de utentes.
- Sem fotos de pessoas reais das atividades.
- Página de Política de Privacidade em linguagem simples.

---

## 11. Tecnologia

| Peça | Escolha | Custo |
|---|---|---|
| Site (frontend e backend) | **Next.js** (App Router) + **TypeScript** + **Tailwind CSS** | grátis |
| Base de dados, login e permissões | **Supabase** (Postgres + Auth + RLS), região UE | grátis |
| Alojamento | **Vercel** (plano Hobby; projeto sem fins lucrativos) | grátis |
| Emails | Gmail SMTP nos testes, **Resend** com domínio próprio | grátis |
| Tarefas agendadas (lembretes) | **Supabase Cron** (pg_cron), a cada 15 min | grátis |
| Anti-bots | **Cloudflare Turnstile** | grátis |
| Código | **GitHub** (repositório privado na conta pessoal) | grátis |
| Domínio | Opcional, mais tarde | ~10–15 €/ano |

**Notas:**
- **Dois projetos Supabase:** `estar-dev`, para desenvolver e testar, e `estar-prod`, o site a sério. Assim **não é preciso instalar o Docker** no PC.
- **Pausa por inatividade:** o Supabase gratuito pausa um projeto ao fim de 7 dias sem uso. A tarefa agendada dos lembretes mantém-no ativo, e se mesmo assim pausar, retoma-se com um clique.

---

## 12. Ambientes e domínio

1. **Local:** `npm run dev` no PC, ligado ao `estar-dev`.
2. **Testes dos admins:** online num endereço gratuito do Vercel, por exemplo `estar-telheiras.vercel.app`, com HTTPS.
3. **Produção:** domínio próprio.
   - **Registadores:** `.pt` num registador português, ou `.org`/`.com` no Cloudflare Registrar (preço de custo, sem aumento na renovação).
   - **Pagamento:** pode-se pagar até 10 anos adiantados. Domínios "vitalícios" não existem.

---

## 13. Modelo de dados (resumo)

| Tabela | Conteúdo |
|---|---|
| `voluntarios` | voluntário: nome, email, telefone, data de nascimento, encarregado (nome/telefone/email), autorização, atividades de interesse, estado, consentimentos (com data) |
| `admins` | quem é admin |
| `notas_admin` | notas internas sobre voluntários (só admins) |
| `atividades` | nome, descrição, morada, mín./máx. de voluntários, responsável, contacto, regras, ativa |
| `atividade_horarios` | horário por dia da semana (abre, fecha) |
| `atividade_fechos` | dias de fecho (data, motivo) |
| `periodos_disponibilidade` | mês, data de abertura, data de fecho |
| `disponibilidades` | voluntário, dia, início, fim, atividade (ou "qualquer"), observações |
| `visitas` | visita: atividade, dia, início, fim, estado, confirmada pelo responsável, notas |
| `alocacoes` | visita ↔ voluntário, estado, datas de confirmação e cancelamento, motivo, presença |
| `testemunhos` | autor, nome a mostrar ou anónimo, atividade, texto original, texto publicado, estado, destaque, quem reviu |
| `auditoria` | admin, ação, alvo, data |
| `registo_emails` | que email foi enviado a quem e quando (evita lembretes duplicados) |

---

## 14. Fases

### Fase 0 — Preparação
- [ ] Instalar o Node.js (LTS) e o Git no PC
- [ ] Criar contas: GitHub (com 2FA), Supabase, Vercel e Cloudflare
- [ ] Criar o repositório privado `estar` no GitHub e convidar o colaborador
- [ ] Criar uma password de aplicação no Gmail `voluntariado.estar@gmail.com` (é preciso ter o 2FA do Gmail ativo)

### Fase 1 — MVP
- [ ] Estrutura do projeto, design base (cores, fontes, componentes)
- [ ] Site público: Início, Atividades, Como funciona, Testemunhos, Quem somos, FAQ, Privacidade
- [ ] Inscrição e login por link (incluindo menores e encarregado de educação)
- [ ] Disponibilidades mensais, com "repetir todas as semanas"
- [ ] Admin: painel, planeamento do mês, visitas e alocações, voluntários, atividades, períodos
- [ ] Emails: boas-vindas, período aberto, alocação (com Confirmo/Não posso e `.ics`), cancelamento
- [ ] Testemunhos: envio e moderação
- [ ] Segurança: RLS, 2FA dos admins, Turnstile, cabeçalhos e registo de atividade
- [ ] Publicar em `*.vercel.app` para os admins testarem

### Fase 2
- [ ] Lembretes automáticos 24h e 3h antes
- [ ] Calendário pessoal subscrito
- [ ] Lembrete de fecho do período a quem não entregou
- [ ] Comunicações em massa, exportação CSV
- [ ] Domínio próprio e emails pelo Resend

### Fase 3
- [ ] Presenças, horas acumuladas e certificado em PDF
- [ ] Estatísticas (números de impacto automáticos na página inicial)
- [ ] SMS/WhatsApp (se fizer sentido)

---

## 15. Decisões tomadas

| Tema | Decisão |
|---|---|
| Nome | ESTAR, Voluntariado do Grupo de Jovens da Paróquia de Telheiras |
| Duração mínima de uma visita | 1 hora |
| Voluntários por visita | 2–5 como referência, sem bloquear |
| Idade mínima | 16 anos; menores com autorização do encarregado de educação |
| Requisitos dos locais | nenhum por agora |
| Responsáveis das atividades | não usam o site; os admins confirmam com eles |
| Perfis | só admin (≥ 5), cada um com 2FA |
| Login | sem passwords: código/link por email para todos; admins + 2FA (app de autenticação) |
| Calendário | disponibilidades de 15 a 25; alocação até ao fim do mês; confirmação até dia 1 |
| Repositório | GitHub, privado, conta pessoal, mais 1 colaborador |
| Domínio | nenhum por agora; testes em `*.vercel.app` |
| Fotos das atividades | não |

## 16. Por decidir mais tarde

- Nome do domínio definitivo.
- Texto final das páginas (Quem somos, regras das atividades, Política de Privacidade).
- Se o logótipo da paróquia pode ser usado.
- Se se aceitam testemunhos de pessoas sem conta. A proposta é **não**, para evitar spam.
