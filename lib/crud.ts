import "server-only";

export type Res<T> = { ok: true; data: T } | { ok: false; erro: string };

export function negar(): Res<never> {
  return { ok: false, erro: "Sessão expirada. Entre de novo." };
}

/** Copia só as colunas permitidas; o resto do patch é ignorado. */
export function filtrar<P extends object>(patch: P, permitidos: readonly (keyof P)[]) {
  const limpo: Record<string, unknown> = {};
  for (const c of permitidos) if (c in patch) limpo[c as string] = patch[c];
  return limpo;
}

/** Supabase devolve numeric como string em alguns casos. */
export const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
export const txt = (v: unknown) => String(v ?? "");

/** Hoje em Brasília, AAAA-MM-DD. */
export function hojeBR() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
