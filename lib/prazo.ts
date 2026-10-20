import type { Tarefa } from "./types";

/** Hoje em Brasília, AAAA-MM-DD (funciona no servidor e no navegador). */
export function hoje() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Abertas primeiro por prazo (atrasadas no topo), depois as sem prazo na ordem de criação. */
export function ordenar(ts: Tarefa[]) {
  return [...ts].sort((a, b) =>
    a.prazo && b.prazo ? a.prazo.localeCompare(b.prazo) || a.ordem - b.ordem
      : a.prazo ? -1 : b.prazo ? 1 : a.ordem - b.ordem);
}

const DIA = 86_400_000;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Versão curta para os cartões: "Sem prazo", "Hoje", "Amanhã", "Até 3 nov", "Atrasada · 18 out". */
export function prazoCurto(prazo: string | null, feito = false, ref = hoje()): { t: string; tom: "atrasada" | "hoje" | "normal" | "sem" } {
  if (!prazo) return { t: "Sem prazo", tom: "sem" };
  const [, m, d] = prazo.split("-").map(Number);
  const data = `${d} ${MESES[m - 1]}`;
  const dias = Math.round((Date.parse(prazo) - Date.parse(ref)) / DIA);
  if (!feito && dias < 0) return { t: `Atrasada · ${data}`, tom: "atrasada" };
  if (!feito && dias === 0) return { t: "Hoje", tom: "hoje" };
  if (!feito && dias === 1) return { t: "Amanhã", tom: "normal" };
  return { t: `Até ${data}`, tom: "normal" };
}
