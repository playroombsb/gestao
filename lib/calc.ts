const isNum = (x: number | null): x is number => typeof x === "number" && Number.isFinite(x);

export const brl = (x: number) => "R$ " + Math.round(x).toLocaleString("pt-BR");

/** "1.234,5" ou "1234.5" -> número; vazio -> null */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const f = parseFloat(norm);
  return Number.isFinite(f) ? f : null;
}

export const mostrar = (x: number | null) => (isNum(x) ? String(x).replace(".", ",") : "");
