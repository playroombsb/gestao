import "server-only";
import { db } from "./supabase";
import type { Produto } from "./types";

export const COLS = "id,nome,descricao,ticket,margem,vendas,ticket_ns,margem_ns,vendas_ns,ordem";

// Supabase devolve numeric como string em alguns casos
export function normalizar(r: Record<string, unknown>): Produto {
  const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    id: String(r.id),
    nome: String(r.nome ?? ""),
    descricao: String(r.descricao ?? ""),
    ticket: n(r.ticket),
    margem: n(r.margem),
    vendas: n(r.vendas),
    ticket_ns: Boolean(r.ticket_ns),
    margem_ns: Boolean(r.margem_ns),
    vendas_ns: Boolean(r.vendas_ns),
    ordem: Number(r.ordem ?? 0),
  };
}

/** Produtos e a data da última alteração, para o painel de leitura. */
export async function carregarPainel(): Promise<{ produtos: Produto[]; atualizado: string | null } | null> {
  const { data, error } = await db().from("produtos").select(`${COLS},updated_at`).order("ordem");
  if (error) return null;
  const linhas = data ?? [];
  const atualizado = linhas.reduce<string | null>(
    (m, r) => (!m || String(r.updated_at) > m ? String(r.updated_at) : m), null);
  return { produtos: linhas.map(normalizar), atualizado };
}
