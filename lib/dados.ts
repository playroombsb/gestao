import "server-only";
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
