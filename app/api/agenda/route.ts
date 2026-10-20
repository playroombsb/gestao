import { timingSafeEqual } from "node:crypto";
import { num, txt } from "@/lib/crud";
import { gerarIcs } from "@/lib/ics";
import { db } from "@/lib/supabase";
import type { Contato, Evento } from "@/lib/types";

export const dynamic = "force-dynamic";

/*
  GET /api/agenda?t=<AGENDA_ICS_TOKEN>: calendário em formato .ics para assinar no Google Agenda.
  O token vai na URL porque o Google não manda cabeçalho; quem tiver o link vê a agenda.
  Janela: 60 dias para trás e 1 ano para frente.
*/

function autorizado(t: string | null) {
  const certo = process.env.AGENDA_ICS_TOKEN;
  if (!certo || !t) return false;
  const a = Buffer.from(t);
  const b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!autorizado(new URL(req.url).searchParams.get("t"))) return new Response("não autorizado", { status: 401 });

  const de = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const ate = new Date(Date.now() + 365 * 86_400_000).toISOString();
  const [c, e] = await Promise.all([
    db().from("contatos").select("id,apelido,tipo,etapa,data_hora,duracao,valor")
      .in("etapa", ["proposta", "agendado", "realizado"]).gte("data_hora", de).lt("data_hora", ate),
    db().from("agenda").select("id,titulo,tipo,inicio,fim,local,observacoes").gte("inicio", de).lt("inicio", ate),
  ]);
  if (c.error || e.error) return new Response("erro ao carregar a agenda", { status: 500 });

  const contatos = (c.data ?? []).map((r) => ({
    id: txt(r.id), apelido: txt(r.apelido), tipo: r.tipo, etapa: r.etapa, data_hora: txt(r.data_hora),
    duracao: txt(r.duracao), valor: num(r.valor),
  })) as Contato[];
  const eventos = (e.data ?? []).map((r) => ({
    id: txt(r.id), titulo: txt(r.titulo), tipo: r.tipo, inicio: txt(r.inicio), fim: r.fim ? txt(r.fim) : null,
    local: txt(r.local), observacoes: txt(r.observacoes),
  })) as Evento[];

  return new Response(gerarIcs(contatos, eventos), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="playroom.ics"',
      "cache-control": "no-store",
    },
  });
}
