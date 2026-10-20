"use server";

import { sessao } from "@/lib/auth";
import { COLS, normalizar } from "@/lib/dados";
import { db } from "@/lib/supabase";
import type { Produto, ProdutoPatch, Secao, SecaoPatch, Tarefa, TarefaPatch } from "@/lib/types";

type Res<T> = { ok: true; data: T } | { ok: false; erro: string };

function negar(): Res<never> {
  return { ok: false, erro: "Sessão expirada. Entre de novo." };
}

/** Copia só as colunas permitidas; o resto do patch é ignorado. */
function filtrar<P extends object>(patch: P, permitidos: (keyof P)[]) {
  const limpo: Record<string, unknown> = {};
  for (const c of permitidos) if (c in patch) limpo[c as string] = patch[c];
  return limpo;
}

// Produtos

const PERMITIDOS: (keyof ProdutoPatch)[] = [
  "nome", "descricao", "ticket", "margem", "vendas", "ticket_ns", "margem_ns", "vendas_ns", "ordem",
];

export async function listar(): Promise<Res<Produto[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("produtos").select(COLS).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar os dados." };
  return { ok: true, data: (data ?? []).map(normalizar) };
}

export async function salvar(id: string, patch: ProdutoPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("produtos").update(filtrar(patch, PERMITIDOS)).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionar(ordem: number): Promise<Res<Produto>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("produtos").insert({ ordem }).select(COLS).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: normalizar(data) };
}

export async function remover(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("produtos").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}

// Estratégia

const COLS_SECAO = "id,titulo,conteudo,ordem";
const PERMITIDOS_SECAO: (keyof SecaoPatch)[] = ["titulo", "conteudo", "ordem"];

const secao = (r: Record<string, unknown>): Secao => ({
  id: String(r.id), titulo: String(r.titulo ?? ""), conteudo: String(r.conteudo ?? ""), ordem: Number(r.ordem ?? 0),
});

export async function listarSecoes(): Promise<Res<Secao[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("estrategia").select(COLS_SECAO).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar a estratégia." };
  return { ok: true, data: (data ?? []).map(secao) };
}

export async function salvarSecao(id: string, patch: SecaoPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("estrategia").update(filtrar(patch, PERMITIDOS_SECAO)).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionarSecao(ordem: number): Promise<Res<Secao>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("estrategia").insert({ ordem }).select(COLS_SECAO).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: secao(data) };
}

export async function removerSecao(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("estrategia").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}

// Tarefas

const COLS_TAREFA = "id,titulo,feita,ordem";
const PERMITIDOS_TAREFA: (keyof TarefaPatch)[] = ["titulo", "feita", "ordem"];

const tarefa = (r: Record<string, unknown>): Tarefa => ({
  id: String(r.id), titulo: String(r.titulo ?? ""), feita: Boolean(r.feita), ordem: Number(r.ordem ?? 0),
});

export async function listarTarefas(): Promise<Res<Tarefa[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("tarefas").select(COLS_TAREFA).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar as tarefas." };
  return { ok: true, data: (data ?? []).map(tarefa) };
}

export async function salvarTarefa(id: string, patch: TarefaPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("tarefas").update(filtrar(patch, PERMITIDOS_TAREFA)).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionarTarefa(titulo: string, ordem: number): Promise<Res<Tarefa>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("tarefas").insert({ titulo: titulo.trim(), ordem }).select(COLS_TAREFA).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: tarefa(data) };
}

export async function removerTarefa(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("tarefas").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}
