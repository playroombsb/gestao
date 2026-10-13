import type { Campo, Produto } from "./types";

export const CAMPOS: { k: Campo; label: string; curto: string }[] = [
  { k: "ticket", label: "Ticket médio R$", curto: "ticket médio" },
  { k: "margem", label: "Margem %", curto: "margem" },
  { k: "vendas", label: "Vendas / mês", curto: "vendas por mês" },
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

/** "1.234,5" ou "1234.5" -> número; vazio -> null */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const f = parseFloat(norm);
  return Number.isFinite(f) ? f : null;
}

export const mostrar = (x: number | null) => (isNum(x) ? String(x).replace(".", ",") : "");
