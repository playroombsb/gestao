"use server";

import { COLS, normalizar } from "@/lib/dados";
import { chaveValida, db } from "@/lib/supabase";
import type { Produto, ProdutoPatch } from "@/lib/types";

const PERMITIDOS: (keyof ProdutoPatch)[] = [
  "nome", "descricao", "ticket", "margem", "vendas", "ticket_ns", "margem_ns", "vendas_ns", "ordem",
];

type Res<T> = { ok: true; data: T } | { ok: false; erro: string };

function negar(): Res<never> {
  return { ok: false, erro: "Link sem permissão. Peça um link novo." };
}

export async function listar(k: string): Promise<Res<Produto[]>> {
  if (!chaveValida(k)) return negar();
  const { data, error } = await db().from("produtos").select(COLS).order("ordem");
  if (error) return { ok: false, erro: "Não foi possível carregar os dados." };
  return { ok: true, data: (data ?? []).map(normalizar) };
}

export async function salvar(k: string, id: string, patch: ProdutoPatch): Promise<Res<null>> {
  if (!chaveValida(k)) return negar();
  const limpo: Record<string, unknown> = {};
  for (const c of PERMITIDOS) if (c in patch) limpo[c] = patch[c];
  const { error } = await db().from("produtos").update(limpo).eq("id", id);
  return error ? { ok: false, erro: "Não salvou. Tente de novo." } : { ok: true, data: null };
}

export async function adicionar(k: string, ordem: number): Promise<Res<Produto>> {
  if (!chaveValida(k)) return negar();
  const { data, error } = await db().from("produtos").insert({ ordem }).select(COLS).single();
  if (error || !data) return { ok: false, erro: "Não foi possível adicionar." };
  return { ok: true, data: normalizar(data) };
}

export async function remover(k: string, id: string): Promise<Res<null>> {
  if (!chaveValida(k)) return negar();
  const { error } = await db().from("produtos").delete().eq("id", id);
  return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, data: null };
}
