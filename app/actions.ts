"use server";

import { sessao } from "@/lib/auth";
import { filtrar, negar, txt, type Res } from "@/lib/crud";
import { COLS, normalizar } from "@/lib/dados";
import { db } from "@/lib/supabase";
import type { Pagina, Produto, ProdutoPatch, Secao, SecaoPatch, Tarefa, TarefaPatch } from "@/lib/types";

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

// Seções de texto (posicionamento e linha editorial)

const COLS_SECAO = "id,titulo,conteudo,ordem";
const PERMITIDOS_SECAO: (keyof SecaoPatch)[] = ["titulo", "conteudo", "ordem"];
const PAGINAS: Pagina[] = ["posicionamento", "editorial"];

const secao = (r: Record<string, unknown>): Secao => ({
  id: txt(r.id), titulo: txt(r.titulo), conteudo: txt(r.conteudo), ordem: Number(r.ordem ?? 0),
});

export async function listarSecoes(pagina: Pagina): Promise<Res<Secao[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("estrategia").select(COLS_SECAO).eq("pagina", pagina).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar as seções." };
  return { ok: true, data: (data ?? []).map(secao) };
}

export async function salvarSecao(id: string, patch: SecaoPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("estrategia").update(filtrar(patch, PERMITIDOS_SECAO)).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionarSecao(pagina: Pagina, ordem: number): Promise<Res<Secao>> {
  if (!sessao()) return negar();
  if (!PAGINAS.includes(pagina)) return { ok: false, erro: "Página inválida." };
  const { data, error } = await db().from("estrategia").insert({ pagina, ordem }).select(COLS_SECAO).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: secao(data) };
}

export async function removerSecao(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("estrategia").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}

// Tarefas

const COLS_TAREFA = "id,titulo,feita,prazo,ordem";
const PERMITIDOS_TAREFA: (keyof TarefaPatch)[] = ["titulo", "feita", "prazo", "ordem"];

const tarefa = (r: Record<string, unknown>): Tarefa => ({
  id: txt(r.id), titulo: txt(r.titulo), feita: Boolean(r.feita), prazo: r.prazo ? txt(r.prazo) : null, ordem: Number(r.ordem ?? 0),
});

export async function listarTarefas(): Promise<Res<Tarefa[]>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("tarefas").select(COLS_TAREFA).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar as tarefas." };
  return { ok: true, data: (data ?? []).map(tarefa) };
}

export async function salvarTarefa(id: string, patch: TarefaPatch): Promise<Res<null>> {
  if (!sessao()) return negar();
  const limpo = filtrar(patch, PERMITIDOS_TAREFA);
  if ("prazo" in limpo && !limpo.prazo) limpo.prazo = null;
  const { error } = await db().from("tarefas").update(limpo).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionarTarefa(titulo: string, ordem: number, prazo: string | null = null): Promise<Res<Tarefa>> {
  if (!sessao()) return negar();
  const { data, error } = await db().from("tarefas")
    .insert({ titulo: titulo.trim(), ordem, prazo: prazo || null }).select(COLS_TAREFA).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: tarefa(data) };
}

export async function removerTarefa(id: string): Promise<Res<null>> {
  if (!sessao()) return negar();
  const { error } = await db().from("tarefas").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}

