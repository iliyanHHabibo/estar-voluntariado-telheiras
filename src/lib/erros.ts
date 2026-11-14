/**
 * Traduz erros técnicos (Supabase/Postgres) em mensagens simples.
 * Nunca mostramos ao utilizador a mensagem técnica original.
 */
const MENSAGENS: Record<string, string> = {
  idade_minima: "É preciso ter pelo menos 16 anos para ser voluntário.",
  encarregado_obrigatorio:
    "Como tens menos de 18 anos, precisamos do nome e telefone do teu encarregado de educação e da sua autorização.",
  data_nascimento_invalida: "A data de nascimento não é válida.",
  fora_do_horario: "Esse horário não coincide com o funcionamento da atividade nesse dia.",
  limite_disponibilidades: "Atingiste o limite de disponibilidades para este mês.",
  limite_testemunhos: "Já tens 3 testemunhos à espera de revisão. Aguarda que os admins os vejam.",
  voluntario_inativo: "A tua inscrição está inativa. Fala com a equipa.",
  ja_nao_e_possivel: "Já não é possível alterar esta visita. Fala com a equipa.",
  transicao_invalida: "Esta alteração não é possível.",
  nao_encontrado: "Não encontrado.",
  sem_permissao: "Não tens permissão para fazer isto.",
  ultimo_admin: "Não é possível: és o último admin.",
  utilizador_nao_encontrado:
    "Não existe conta com esse email. A pessoa tem de entrar no site uma vez (em /entrar) antes de ser adicionada.",
};

export function mensagemDeErro(erro: unknown, padrao = "Ocorreu um erro. Tenta outra vez."): string {
  const texto =
    typeof erro === "object" && erro !== null && "message" in erro ? String((erro as { message: unknown }).message) : "";
  for (const [codigo, msg] of Object.entries(MENSAGENS)) {
    if (texto.includes(codigo)) return msg;
  }
  if (/rate limit|too many|429/i.test(texto)) {
    return "Demasiadas tentativas. Espera alguns minutos e tenta outra vez.";
  }
  if (/row-level security|permission denied/i.test(texto)) {
    return "Não tens permissão para fazer isto.";
  }
  return padrao;
}
