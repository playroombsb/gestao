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
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function rotuloPrazo(prazo: string | null, ref = hoje()): { t: string; tom: "atrasada" | "hoje" | "normal" | "sem" } {
  if (!prazo) return { t: "sem prazo", tom: "sem" };
  const dias = Math.round((Date.parse(prazo) - Date.parse(ref)) / DIA);
  if (dias < 0) return { t: dias === -1 ? "Atrasada · ontem" : `Atrasada · ${-dias} dias`, tom: "atrasada" };
  if (dias === 0) return { t: "Hoje", tom: "hoje" };
  if (dias === 1) return { t: "Amanhã", tom: "normal" };
  const [, m, d] = prazo.split("-");
  const sem = SEMANA[new Date(prazo + "T12:00:00Z").getUTCDay()];
  return { t: dias < 7 ? `${sem}, ${d}/${m}` : `${d}/${m}`, tom: "normal" };
}

export const TOM_PRAZO = {
  atrasada: "bg-red text-white px-2 py-0.5 font-bold",
  hoje: "border-[1.5px] border-ink px-2 py-[1px] font-bold",
  normal: "font-semibold text-muted",
  sem: "text-[#9a8e8c]",
} as const;
