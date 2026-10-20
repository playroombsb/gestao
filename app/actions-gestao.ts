"use server";

import { sessao } from "@/lib/auth";
import { filtrar, negar, num, txt, type Res } from "@/lib/crud";
import { db } from "@/lib/supabase";
import type {
  Aplicacao, Contato, ContatoPatch, Evento, EventoPatch, Lancamento, Pauta, PautaPatch, Resposta, StatusAplicacao,
} from "@/lib/types";

const falha = (erro: string) => ({ ok: false as const, erro });
const ok = <T,>(data: T) => ({ ok: true as const, data });

// CRM

const COLS_CONTATO = "id,apelido,contato,tipo,etapa,data_hora,duracao,valor,sinal,origem,motivo_perda,observacoes,created_at";
const PERMITIDOS_CONTATO: (keyof ContatoPatch)[] = [
  "apelido", "contato", "tipo", "etapa", "data_hora", "duracao", "valor", "sinal", "origem", "motivo_perda", "observacoes",
];

const contato = (r: Record<string, unknown>): Contato => ({
  id: txt(r.id), apelido: txt(r.apelido), contato: txt(r.contato),
  tipo: r.tipo === "aluguel" ? "aluguel" : "sessao",
  etapa: txt(r.etapa) as Contato["etapa"],
  data_hora: r.data_hora ? txt(r.data_hora) : null,
  duracao: txt(r.duracao), valor: num(r.valor),
  sinal: (txt(r.sinal) || "sem") as Contato["sinal"],
  origem: txt(r.origem), motivo_perda: txt(r.motivo_perda), observacoes: txt(r.observacoes),
  created_at: txt(r.created_at),
});

export async function listarContatos(): Promise<Res<Contato[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("contatos").select(COLS_CONTATO).order("created_at", { ascending: false });
  return error ? falha("Não foi possível carregar o CRM.") : ok((data ?? []).map(contato));
}

export async function salvarContato(id: string, patch: ContatoPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const limpo = filtrar(patch, PERMITIDOS_CONTATO);
  if ("data_hora" in limpo && !limpo.data_hora) limpo.data_hora = null;
  const { error } = await db().from("contatos").update(limpo).eq("id", id);
  return error ? falha("Não salvou. Tente de novo.") : ok(null);
}

export async function adicionarContato(): Promise<Res<Contato>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("contatos").insert({}).select(COLS_CONTATO).single();
  return error || !data ? falha("Não foi possível adicionar.") : ok(contato(data));
}

export async function removerContato(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("contatos").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}

// Aplicações

const COLS_APLICACAO = "id,apelido,contato,interesse,respostas,status,nota,contato_id,created_at";

const aplicacao = (r: Record<string, unknown>): Aplicacao => ({
  id: txt(r.id), apelido: txt(r.apelido), contato: txt(r.contato), interesse: txt(r.interesse),
  respostas: Array.isArray(r.respostas) ? (r.respostas as Resposta[]) : [],
  status: (txt(r.status) || "nova") as StatusAplicacao,
  nota: txt(r.nota), contato_id: r.contato_id ? txt(r.contato_id) : null, created_at: txt(r.created_at),
});

export async function listarAplicacoes(): Promise<Res<Aplicacao[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("aplicacoes").select(COLS_APLICACAO).order("created_at", { ascending: false });
  return error ? falha("Não foi possível carregar as aplicações.") : ok((data ?? []).map(aplicacao));
}

export async function salvarAplicacao(id: string, patch: { status?: StatusAplicacao; nota?: string }): Promise<Res<null>> {
  if (!sessao()) return negar();
  const limpo = filtrar(patch, ["status", "nota"] as const);
  const { error } = await db().from("aplicacoes").update(limpo).eq("id", id);
  return error ? falha("Não salvou. Tente de novo.") : ok(null);
}

/** Aprova e cria o contato no CRM, na etapa "Novo contato". */
export async function aprovarAplicacao(id: string): Promise<Res<{ contato_id: string }>> {
  if (!sessao()) return negar();
  const { data: a, error } = await db().from("aplicacoes").select(COLS_APLICACAO).eq("id", id).single();
  if (error || !a) return falha("Aplicação não encontrada.");
  const ap = aplicacao(a);
  if (ap.contato_id) {
    await db().from("aplicacoes").update({ status: "aprovada" }).eq("id", id);
    return ok({ contato_id: ap.contato_id });
  }
  const { data: c, error: e2 } = await db().from("contatos").insert({
    apelido: ap.apelido,
    contato: ap.contato,
    tipo: /alug/i.test(ap.interesse) ? "aluguel" : "sessao",
    origem: "Site",
    observacoes: [ap.interesse && `Interesse: ${ap.interesse}`, ap.nota].filter(Boolean).join("\n"),
  }).select("id").single();
  if (e2 || !c) return falha("Não foi possível criar o contato no CRM.");
  const { error: e3 } = await db().from("aplicacoes").update({ status: "aprovada", contato_id: c.id }).eq("id", id);
  return e3 ? falha("Contato criado, mas a aplicação não atualizou.") : ok({ contato_id: txt(c.id) });
}

export async function removerAplicacao(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("aplicacoes").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}

// Financeiro

const COLS_LANC = "id,tipo,data,descricao,categoria,valor,recorrente,contato_id";

const lancamento = (r: Record<string, unknown>): Lancamento => ({
  id: txt(r.id), tipo: r.tipo === "custo" ? "custo" : "receita", data: txt(r.data),
  descricao: txt(r.descricao), categoria: txt(r.categoria), valor: num(r.valor) ?? 0,
  recorrente: Boolean(r.recorrente), contato_id: r.contato_id ? txt(r.contato_id) : null,
});

/** Lançamentos do mês (AAAA-MM), mais os recorrentes que começaram antes. */
export async function listarLancamentos(mes: string): Promise<Res<Lancamento[]>> {
  if (!sessao()) return negar();
  if (!/^\d{4}-\d{2}$/.test(mes)) return falha("Mês inválido.");
  const [a, m] = mes.split("-").map(Number);
  const ini = `${mes}-01`;
  const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const { data, error } = await db().from("lancamentos").select(COLS_LANC)
    .or(`and(data.gte.${ini},data.lte.${fim}),and(recorrente.eq.true,data.lte.${fim})`)
    .order("data", { ascending: false });
  return error ? falha("Não foi possível carregar o financeiro.") : ok((data ?? []).map(lancamento));
}

export async function adicionarLancamento(l: Omit<Lancamento, "id" | "contato_id">): Promise<Res<Lancamento>> {
  if (!sessao()) return negar();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.data)) return falha("Data inválida.");
  if (!(l.valor > 0)) return falha("Informe um valor maior que zero.");
  const { data, error } = await db().from("lancamentos").insert({
    tipo: l.tipo === "custo" ? "custo" : "receita", data: l.data, descricao: l.descricao.trim(),
    categoria: l.categoria.trim(), valor: l.valor, recorrente: Boolean(l.recorrente),
  }).select(COLS_LANC).single();
  return error || !data ? falha("Não foi possível salvar.") : ok(lancamento(data));
}

export async function removerLancamento(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { data } = await db().from("lancamentos").select("contato_id").eq("id", id).single();
  if (data?.contato_id) return falha("Essa receita vem do CRM. Para tirar, mude a etapa do atendimento lá.");
  const { error } = await db().from("lancamentos").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}

// Pautas

const COLS_PAUTA = "id,titulo,pilar,formato,funil,status,data,ordem";
const PERMITIDOS_PAUTA: (keyof PautaPatch)[] = ["titulo", "pilar", "formato", "funil", "status", "data", "ordem"];

const pauta = (r: Record<string, unknown>): Pauta => ({
  id: txt(r.id), titulo: txt(r.titulo), pilar: txt(r.pilar), formato: txt(r.formato), funil: txt(r.funil),
  status: txt(r.status), data: r.data ? txt(r.data) : null, ordem: Number(r.ordem ?? 0),
});

export async function listarPautas(): Promise<Res<Pauta[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("pautas").select(COLS_PAUTA).order("ordem");
  return error ? falha("Não foi possível carregar as pautas.") : ok((data ?? []).map(pauta));
}

export async function salvarPauta(id: string, patch: PautaPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const limpo = filtrar(patch, PERMITIDOS_PAUTA);
  if ("data" in limpo && !limpo.data) limpo.data = null;
  const { error } = await db().from("pautas").update(limpo).eq("id", id);
  return error ? falha("Não salvou. Tente de novo.") : ok(null);
}

export async function adicionarPauta(ordem: number): Promise<Res<Pauta>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("pautas").insert({ ordem }).select(COLS_PAUTA).single();
  return error || !data ? falha("Não foi possível adicionar.") : ok(pauta(data));
}

export async function removerPauta(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("pautas").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}

// Calendário (workshops, eventos e outros; sessões e aluguéis vêm do CRM)

const COLS_EVENTO = "id,titulo,tipo,inicio,fim,local,observacoes";
const PERMITIDOS_EVENTO: (keyof EventoPatch)[] = ["titulo", "tipo", "inicio", "fim", "local", "observacoes"];

const evento = (r: Record<string, unknown>): Evento => ({
  id: txt(r.id), titulo: txt(r.titulo), tipo: (txt(r.tipo) || "evento") as Evento["tipo"],
  inicio: txt(r.inicio), fim: r.fim ? txt(r.fim) : null, local: txt(r.local), observacoes: txt(r.observacoes),
});

/** Eventos entre duas datas ISO. */
export async function listarAgenda(de: string, ate: string): Promise<Res<Evento[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("agenda").select(COLS_EVENTO).gte("inicio", de).lt("inicio", ate).order("inicio");
  return error ? falha("Não foi possível carregar o calendário.") : ok((data ?? []).map(evento));
}

export async function adicionarEvento(inicio: string, tipo: Evento["tipo"] = "evento"): Promise<Res<Evento>> {
  if (!sessao()) return negar();
  if (Number.isNaN(Date.parse(inicio))) return falha("Data inválida.");
  const { data, error } = await db().from("agenda").insert({ inicio, tipo }).select(COLS_EVENTO).single();
  return error || !data ? falha("Não foi possível adicionar.") : ok(evento(data));
}

export async function salvarEvento(id: string, patch: EventoPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const limpo = filtrar(patch, PERMITIDOS_EVENTO);
  if ("fim" in limpo && !limpo.fim) limpo.fim = null;
  if ("inicio" in limpo && !limpo.inicio) delete limpo.inicio; // início é obrigatório
  const { error } = await db().from("agenda").update(limpo).eq("id", id);
  return error ? falha("Não salvou. Tente de novo.") : ok(null);
}

export async function removerEvento(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("agenda").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}
