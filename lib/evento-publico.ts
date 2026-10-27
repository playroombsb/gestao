import "server-only";
import { db } from "./supabase";

export type EventoPublico = { id: string; titulo: string; tipo: string; inicio: string; local: string; encerrado: boolean };

const COLS = "id,titulo,tipo,inicio,local";
const UM_DIA = 86_400_000;

const montar = (d: Record<string, unknown>): EventoPublico => ({
  id: String(d.id), titulo: String(d.titulo ?? ""), tipo: String(d.tipo), inicio: String(d.inicio), local: String(d.local ?? ""),
  encerrado: Date.parse(String(d.inicio)) + UM_DIA < Date.now(),
});

/** O evento aceita aplicação: existe, é evento ou workshop. "encerrado" = passou mais de 1 dia do início. */
export async function eventoAberto(id: string): Promise<EventoPublico | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("agenda").select(COLS).eq("id", id).maybeSingle();
  if (!data || !["evento", "workshop"].includes(String(data.tipo))) return null;
  return montar(data);
}

/** Próxima festa do calendário (tipo evento), para o site baile.playroombsb.com.br. */
export async function proximoEvento(): Promise<EventoPublico | null> {
  const desde = new Date(Date.now() - UM_DIA).toISOString();
  const { data } = await db().from("agenda").select(COLS).eq("tipo", "evento").gte("inicio", desde).order("inicio").limit(1).maybeSingle();
  return data ? montar(data) : null;
}

/** "Sábado, 28 de novembro" e "19h" em Brasília. */
export function quando(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" });
  const [h, m] = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":");
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora: `${Number(h)}h${m === "00" ? "" : m}` };
}
