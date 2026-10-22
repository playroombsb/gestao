// Contas da página de Métricas (Marketing). Funções puras sobre as linhas já carregadas.
import type { Contato, Insta } from "./types";

export const PERIODOS = [
  { k: "30", t: "30 dias", dias: 30 },
  { k: "90", t: "90 dias", dias: 90 },
  { k: "365", t: "12 meses", dias: 365 },
] as const;
export type Periodo = (typeof PERIODOS)[number]["k"];

/** Ordem do funil: até onde o contato chegou. Perdido não entra nas etapas (sai do funil). */
export const FUNIL = [
  { k: "novo", t: "Novo contato" },
  { k: "conversa", t: "Conversa" },
  { k: "proposta", t: "Proposta" },
  { k: "agendado", t: "Agendado" },
  { k: "realizado", t: "Realizado" },
] as const;

const NIVEL: Record<string, number> = { novo: 0, conversa: 1, proposta: 2, agendado: 3, realizado: 4 };

/** Quantos contatos do período chegaram pelo menos a cada etapa (pela etapa atual). */
export function funil(cs: Contato[]) {
  const vivos = cs.filter((c) => c.etapa !== "perdido");
  return FUNIL.map((e) => ({ ...e, n: vivos.filter((c) => (NIVEL[c.etapa] ?? 0) >= NIVEL[e.k]).length }));
}

/** Contatos por origem: quantos, quantos realizados, conversão (realizado / decididos) e receita realizada. */
export function porOrigem(cs: Contato[]) {
  const mapa = new Map<string, Contato[]>();
  for (const c of cs) {
    const o = c.origem?.trim() || "Sem origem";
    mapa.set(o, [...(mapa.get(o) ?? []), c]);
  }
  return Array.from(mapa, ([origem, xs]) => {
    const realizados = xs.filter((c) => c.etapa === "realizado");
    const perdidos = xs.filter((c) => c.etapa === "perdido").length;
    return {
      origem,
      contatos: xs.length,
      realizados: realizados.length,
      conversao: realizados.length + perdidos ? realizados.length / (realizados.length + perdidos) : null,
      receita: realizados.reduce((s, c) => s + (c.valor ?? 0), 0),
    };
  }).sort((a, b) => b.contatos - a.contatos || a.origem.localeCompare(b.origem));
}

/** Seguidores ao longo do tempo (uma coleta por ponto), do mais antigo ao mais novo. */
export function serieSeguidores(linhas: Insta[]) {
  return linhas
    .filter((l) => l.seguidores != null)
    .map((l) => ({ em: l.coletado_em, n: l.seguidores as number }))
    .sort((a, b) => a.em.localeCompare(b.em));
}

/** Variação de seguidores dentro do período: última coleta menos a primeira coleta do período. */
export function variacao(serie: { em: string; n: number }[], desde: string) {
  const dentro = serie.filter((p) => p.em >= desde);
  if (dentro.length < 2) return null;
  return dentro[dentro.length - 1].n - dentro[0].n;
}
