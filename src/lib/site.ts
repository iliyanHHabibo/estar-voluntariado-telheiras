/** Informação geral do site. Tudo o que for texto/valor partilhado fica aqui. */

export const SITE = {
  nome: "ESTAR",
  nomeCompleto: "ESTAR — Voluntariado do Grupo de Jovens da Paróquia de Telheiras",
  organizacao: "Grupo de Jovens da Paróquia de Telheiras",
  slogan: "Às vezes, basta ESTAR.",
  descricao:
    "Projeto de voluntariado do Grupo de Jovens da Paróquia de Telheiras que aproxima gerações através do nosso tempo e da nossa presença.",
  email: "estar.voluntariado@gmail.com",
  idadeMinima: 16,
  /** Dias do mês em que os voluntários podem indicar disponibilidades para o mês seguinte. */
  janelaDisponibilidades: { de: 15, ate: 25 },
} as const;

export const NAV = [
  { href: "/atividades", label: "Atividades" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/testemunhos", label: "Testemunhos" },
  { href: "/quem-somos", label: "Quem somos" },
  { href: "/faq", label: "Perguntas" },
] as const;

/** Inscrever-se e entrar são o mesmo passo: email → código. */
export const ROTA_INSCRICAO = "/entrar";
