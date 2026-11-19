"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirVoluntario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";
import { hojeLisboa, minutos } from "@/lib/tempo";
import { DURACAO_MINIMA, diasComJanelas, repetirSemanalmente, sobrepoe } from "@/lib/disponibilidade";

export type EstadoDisp = { ok?: string; erro?: string; n?: number };

const ROTA = "/conta/disponibilidades";
const data = z.iso.date();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");
const atividade = z
  .string()
  .transform((v) => (v === "" || v === "qualquer" ? null : v))
  .pipe(z.uuid().nullable());

/** Um mês só aceita alterações enquanto o período está aberto (a base de dados também o exige). */
async function periodoAberto(mes: string): Promise<boolean> {
  const supabase = await createClient();
  const hoje = hojeLisboa();
  const { data: p } = await supabase
    .from("periodos_disponibilidade")
    .select("mes")
    .eq("mes", mes)
    .lte("abre_em", hoje)
    .gte("fecha_em", hoje)
    .maybeSingle();
  return Boolean(p);
}

const MSG_FECHADO = "O período de disponibilidades deste mês já não está aberto. Fala com a equipa se precisares de mudar algo.";

// ---------------------------------------------------------------- adicionar um intervalo
const adicionarSchema = z.object({ data, inicio: hora, fim: hora, atividade_id: atividade });

export async function adicionarDisponibilidade(_prev: EstadoDisp, fd: FormData): Promise<EstadoDisp> {
  const { u, perfil } = await exigirVoluntario(ROTA);
  if (perfil.estado !== "ativo") return { erro: "A tua inscrição está inativa. Fala com a equipa." };

  const r = adicionarSchema.safeParse({
    data: fd.get("data"),
    inicio: fd.get("inicio"),
    fim: fd.get("fim"),
    atividade_id: fd.get("atividade_id") ?? "",
  });
  if (!r.success) return { erro: "Verifica o dia e as horas." };
  const { data: dia, inicio, fim, atividade_id } = r.data;

  if (minutos(fim) - minutos(inicio) < DURACAO_MINIMA) return { erro: "Cada visita dura pelo menos 1 hora." };
  if (dia < hojeLisboa()) return { erro: "Esse dia já passou." };
  if (!(await periodoAberto(dia.slice(0, 8) + "01"))) return { erro: MSG_FECHADO };

  const supabase = await createClient();
  const { data: doDia } = await supabase.from("disponibilidades").select("inicio, fim").eq("voluntario_id", u.id).eq("data", dia);
  const existentes = (doDia ?? []).map((x) => ({ inicio: minutos(x.inicio), fim: minutos(x.fim) }));
  if (sobrepoe(existentes, minutos(inicio), minutos(fim))) {
    return { erro: "Já tens uma disponibilidade que se sobrepõe a esta. Apaga-a primeiro, se quiseres mudar." };
  }

  const { error } = await supabase
    .from("disponibilidades")
    .insert({ voluntario_id: u.id, data: dia, inicio, fim, atividade_id });
  if (error) {
    console.error("[disponibilidades] adicionar:", error.code, error.message);
    return { erro: mensagemDeErro(error, "Não foi possível guardar. Tenta outra vez.") };
  }
  revalidatePath(ROTA);
  return { ok: "Guardado.", n: 1 };
}

// ---------------------------------------------------------------- apagar um intervalo
export async function removerDisponibilidade(_prev: EstadoDisp, fd: FormData): Promise<EstadoDisp> {
  await exigirVoluntario(ROTA);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { erro: "Pedido inválido." };

  const supabase = await createClient();
  const { data: apagadas, error } = await supabase.from("disponibilidades").delete().eq("id", id.data).select("id");
  if (error) {
    console.error("[disponibilidades] remover:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  if (!apagadas?.length) return { erro: MSG_FECHADO };
  revalidatePath(ROTA);
  return { ok: "Apagado." };
}

// ---------------------------------------------------------------- repetir todas as semanas
const repetirSchema = z.object({
  mes: data,
  dia_semana: z.coerce.number().int().min(1).max(7),
  inicio: hora,
  fim: hora,
  atividade_id: atividade,
});

export async function repetirTodasAsSemanas(_prev: EstadoDisp, fd: FormData): Promise<EstadoDisp> {
  const { u, perfil } = await exigirVoluntario(ROTA);
  if (perfil.estado !== "ativo") return { erro: "A tua inscrição está inativa. Fala com a equipa." };

  const r = repetirSchema.safeParse({
    mes: fd.get("mes"),
    dia_semana: fd.get("dia_semana"),
    inicio: fd.get("inicio"),
    fim: fd.get("fim"),
    atividade_id: fd.get("atividade_id") ?? "",
  });
  if (!r.success) return { erro: "Verifica o dia da semana e as horas." };
  const { mes, dia_semana, inicio, fim, atividade_id } = r.data;

  if (mes.slice(8) !== "01") return { erro: "Pedido inválido." };
  if (minutos(fim) - minutos(inicio) < DURACAO_MINIMA) return { erro: "Cada visita dura pelo menos 1 hora." };
  if (!(await periodoAberto(mes))) return { erro: MSG_FECHADO };

  const supabase = await createClient();
  const [{ data: atividades }, { data: horarios }, { data: fechos }, { data: minhas }] = await Promise.all([
    supabase.from("atividades").select("id, nome").eq("ativa", true),
    supabase.from("atividade_horarios").select("atividade_id, dia_semana, abre, fecha"),
    supabase.from("atividade_fechos").select("atividade_id, data").gte("data", mes).lt("data", proximoMes(mes)),
    supabase
      .from("disponibilidades")
      .select("data, inicio, fim, atividade_id")
      .eq("voluntario_id", u.id)
      .gte("data", mes)
      .lt("data", proximoMes(mes)),
  ]);

  const dias = diasComJanelas(mes, atividades ?? [], horarios ?? [], fechos ?? []);
  const existentes = (minhas ?? []).map((x) => ({
    data: x.data as string,
    inicio: minutos(x.inicio),
    fim: minutos(x.fim),
    atividade_id: x.atividade_id as string | null,
  }));

  const res = repetirSemanalmente({
    dias,
    diaSemana: dia_semana,
    atividadeId: atividade_id,
    inicio: minutos(inicio),
    fim: minutos(fim),
    existentes,
    hoje: hojeLisboa(),
  });

  if (res.adicionar.length === 0) {
    return { erro: "Não foi possível adicionar nenhum dia: " + explicarIgnorados(res.ignoradas) + "." };
  }

  const { error } = await supabase.from("disponibilidades").insert(
    res.adicionar.map((x) => ({
      voluntario_id: u.id,
      data: x.data,
      inicio,
      fim,
      atividade_id: x.atividade_id,
    })),
  );
  if (error) {
    console.error("[disponibilidades] repetir:", error.code, error.message);
    return { erro: mensagemDeErro(error, "Não foi possível guardar. Tenta outra vez.") };
  }

  revalidatePath(ROTA);
  const n = res.adicionar.length;
  const ign = explicarIgnorados(res.ignoradas);
  return {
    ok: `Adicionadas ${n} ${n === 1 ? "disponibilidade" : "disponibilidades"}.` + (ign ? ` Ignorámos: ${ign}.` : ""),
    n,
  };
}

function proximoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

function explicarIgnorados(i: { fechado: number; foraDoHorario: number; jaTinha: number; passado: number }): string {
  const partes: string[] = [];
  const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
  if (i.foraDoHorario) partes.push(`${dias(i.foraDoHorario)} fora do horário da atividade (ou em que fecha)`);
  if (i.fechado) partes.push(`${dias(i.fechado)} sem atividades abertas`);
  if (i.jaTinha) partes.push(`${dias(i.jaTinha)} em que já tinhas disponibilidade`);
  if (i.passado) partes.push(`${dias(i.passado)} que já passaram`);
  return partes.join("; ");
}

// ---------------------------------------------------------------- observações do mês
const notaSchema = z.object({ mes: data, texto: z.string().trim().max(500, "No máximo 500 letras.") });

export async function guardarObservacao(_prev: EstadoDisp, fd: FormData): Promise<EstadoDisp> {
  const { u } = await exigirVoluntario(ROTA);
  const r = notaSchema.safeParse({ mes: fd.get("mes"), texto: fd.get("texto") ?? "" });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Verifica o texto." };
  if (r.data.mes.slice(8) !== "01") return { erro: "Pedido inválido." };
  if (!(await periodoAberto(r.data.mes))) return { erro: MSG_FECHADO };

  const supabase = await createClient();
  const { error } = r.data.texto
    ? await supabase
        .from("disponibilidade_notas")
        .upsert({ voluntario_id: u.id, mes: r.data.mes, texto: r.data.texto }, { onConflict: "voluntario_id,mes" })
    : await supabase.from("disponibilidade_notas").delete().eq("voluntario_id", u.id).eq("mes", r.data.mes);
  if (error) {
    console.error("[disponibilidades] observação:", error.code, error.message);
    return { erro: mensagemDeErro(error) };
  }
  revalidatePath(ROTA);
  return { ok: r.data.texto ? "Observação guardada." : "Observação apagada." };
}
