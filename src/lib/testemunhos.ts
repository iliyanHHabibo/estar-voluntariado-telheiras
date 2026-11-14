/**
 * Testemunhos publicados.
 *
 * Fica vazio de propósito: só entram testemunhos reais, aprovados pelos admins.
 * Na fase da base de dados, este ficheiro é substituído por uma consulta à tabela `testemunhos`
 * (apenas os com estado "aprovado").
 */

export type Testemunho = {
  id: string;
  /** Primeiro nome ou "Anónimo" — a escolha é da pessoa. */
  autor: string;
  atividade: string;
  texto: string;
};

export const TESTEMUNHOS: Testemunho[] = [];
