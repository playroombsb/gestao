import type { Campo, Produto } from "./types";

export const CAMPOS: { k: Campo; label: string; mobile: string; curto: string }[] = [
  { k: "ticket", label: "Ticket médio R$", mobile: "Ticket R$", curto: "ticket médio" },
  { k: "margem", label: "Margem %", mobile: "Margem %", curto: "margem" },
  { k: "vendas", label: "Vendas / mês", mobile: "Vendas/mês", curto: "vendas por mês" },
];

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Os três números preenchidos: entra no cálculo. */
export const preenchido = (p: Produto) => isNum(p.ticket) && isNum(p.margem) && isNum(p.vendas);

/** Cada campo tem número ou "não sei": conta como respondido. */
export const respondido = (p: Produto) =>
  CAMPOS.every(({ k }) => isNum(p[k]) || p[`${k}_ns`]);

export const naoSei = (p: Produto) => CAMPOS.filter(({ k }) => p[`${k}_ns`]).map((c) => c.curto);

export const lucro = (p: Produto) =>
  preenchido(p) ? (p.ticket! * p.margem!) / 100 * p.vendas! : 0;

export const brl = (x: number) => "R$ " + Math.round(x).toLocaleString("pt-BR");

export function mediana(a: number[]) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export type Quadrante = "carro" | "premium" | "caixa" | "repensar";
export const QUADRANTES: Record<Quadrante, string> = {
  carro: "Carro-chefe",
  premium: "Nicho premium",
  caixa: "Gerador de caixa",
  repensar: "Repensar",
};

export function quadrante(p: Produto, mm: number, mv: number): Quadrante {
  const hm = p.margem! >= mm;
  const hv = p.vendas! >= mv;
  return hm && hv ? "carro" : hm ? "premium" : hv ? "caixa" : "repensar";
}

/** Tudo que as telas mostram a partir da lista de produtos. */
export function resumo(itens: Produto[]) {
  const feitos = itens.filter((p) => p.nome.trim() && preenchido(p));
  let rec = 0, luc = 0, vol = 0;
  for (const p of feitos) { rec += p.ticket! * p.vendas!; luc += lucro(p); vol += p.vendas!; }
  const mm = mediana(feitos.map((p) => p.margem!));
  const mv = mediana(feitos.map((p) => p.vendas!));
  const ranking = [...feitos].sort((a, b) => lucro(b) - lucro(a));
  const max = Math.max(1, ...ranking.map((p) => Math.abs(lucro(p))));
  const resp = itens.filter(respondido).length;
  const lacunas = itens.filter((p) => p.nome.trim() && naoSei(p).length);
  return { feitos, rec, luc, vol, mm, mv, ranking, max, resp, lacunas };
}
export type Resumo = ReturnType<typeof resumo>;

/** "1.234,5" ou "1234.5" -> número; vazio -> null */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const f = parseFloat(norm);
  return Number.isFinite(f) ? f : null;
}

export const mostrar = (x: number | null) => (isNum(x) ? String(x).replace(".", ",") : "");
