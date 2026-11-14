/**
 * Atividades de voluntariado.
 *
 * Por agora vivem aqui no código. Na fase da base de dados passam a ser geridas
 * pelos admins (tabela `atividades`), e este ficheiro deixa de ser a fonte de verdade.
 */

export type Atividade = {
  slug: string;
  nome: string;
  resumo: string;
  descricao: string;
  /** Texto legível, ex.: "Todos os dias, das 10h às 18h" */
  horario: string;
  /** Morada pública. Se for undefined, mostramos que é enviada na confirmação. */
  morada?: string;
  oQueEsperar: string[];
  regras: string[];
};

export const REGRAS_GERAIS = [
  "Não tirar fotografias nem fazer gravações de utentes, de outros voluntários ou das instalações.",
  "Manter a confidencialidade: o que se vê e ouve durante a visita não se partilha.",
  "Ser pontual e avisar com antecedência se não puder ir.",
  "Respeitar as indicações dos responsáveis do local.",
];

export const ATIVIDADES: Atividade[] = [
  {
    slug: "clinica-sao-jose",
    nome: "Clínica de S. José — Unidade 4",
    resumo: "Visitas para fazer companhia e conversar com quem está internado.",
    descricao:
      "Visitamos a Unidade 4 da Clínica de S. José. Não é preciso fazer nada de especial: o que importa é estar, ouvir e conversar. Pode ser uma conversa, um jogo de cartas ou simplesmente companhia.",
    horario: "Todos os dias, das 10h às 18h",
    oQueEsperar: [
      "Visitas de 1 hora (pode ficar mais tempo, se for combinado).",
      "Normalmente vais com mais 1 a 4 voluntários.",
      "Os responsáveis do local explicam-te tudo à chegada.",
    ],
    regras: [
      "Seguir as indicações de higiene e segurança do local.",
      "Não ir se estiveres doente (constipação, febre, gripe…). Avisa-nos que alocamos outra pessoa.",
    ],
  },
  {
    slug: "centro-de-dia",
    nome: "Centro de Dia",
    resumo: "Tardes e manhãs de convívio com pessoas idosas.",
    descricao:
      "Passamos tempo com as pessoas que frequentam o Centro de Dia: conversa, jogos, passeios curtos ou apenas companhia. É um bom primeiro passo para quem nunca fez voluntariado.",
    horario: "Dias úteis, das 10h às 17h",
    oQueEsperar: [
      "Visitas de 1 hora (pode ficar mais tempo, se for combinado).",
      "Normalmente vais com mais 1 a 4 voluntários.",
      "Ambiente descontraído, com muita conversa.",
    ],
    regras: [
      "Só há visitas em dias úteis (não há fins de semana nem feriados).",
      "Não partilhar informação pessoal dos utentes fora do centro.",
    ],
  },
];
