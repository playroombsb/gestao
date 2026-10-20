import type { TipoEvento } from "./types";

/** Tipos que aparecem na agenda: sessões e aluguéis vêm do CRM, o resto da tabela agenda. */
export type TipoAgenda = "sessao" | "aluguel" | TipoEvento;

export const TIPOS_AGENDA: { k: TipoAgenda; t: string; um: string; cor: string; ponto: string }[] = [
  { k: "sessao", t: "Sessões", um: "Sessão", cor: "bg-ink text-white", ponto: "bg-ink" },
  { k: "aluguel", t: "Aluguéis", um: "Aluguel", cor: "bg-red-soft text-red-deep", ponto: "bg-red-soft border border-red-deep" },
  { k: "workshop", t: "Workshops", um: "Workshop", cor: "bg-red text-white", ponto: "bg-red" },
  { k: "evento", t: "Eventos", um: "Evento", cor: "border-[1.5px] border-ink bg-paper", ponto: "border-[1.5px] border-ink bg-paper" },
  { k: "outro", t: "Outros", um: "Outro", cor: "bg-line text-ink", ponto: "bg-side-label" },
];

export const COR_AGENDA = Object.fromEntries(TIPOS_AGENDA.map((t) => [t.k, t])) as Record<TipoAgenda, (typeof TIPOS_AGENDA)[number]>;

export const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
