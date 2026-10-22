import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { instancia } from "@/lib/evolution";
import { db } from "@/lib/supabase";
import { lerAtualizacao, lerMensagem, statusAvanca, type MsgLida, type StatusMsg } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/*
  A Evolution avisa aqui cada mensagem do WhatsApp do Playroom:
    POST /api/whatsapp/webhook?t=<WHATSAPP_WEBHOOK_TOKEN>
  O endereço com o token é configurado sozinho ao conectar em Admin › Integrações.
  Eventos usados: messages.upsert (mensagem nova, recebida ou enviada pelo celular) e messages.update (entregue, lida).
  Responde 200 mesmo para eventos ignorados, senão a Evolution fica reenviando.
*/

const MAX_CORPO = 1_000_000;

function autorizado(req: Request) {
  const certo = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!certo) return false;
  const recebido = new URL(req.url).searchParams.get("t") ?? "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function gravarMensagem(m: MsgLida) {
  const banco = db();
  // Conversa nova entra com nome e telefone; o nome só é atualizado por mensagem da própria pessoa
  await banco.from("wa_conversas").upsert({ jid: m.jid, nome: m.de_mim ? "" : m.nome, telefone: m.telefone }, { onConflict: "jid", ignoreDuplicates: true });
  if (!m.de_mim && m.nome) await banco.from("wa_conversas").update({ nome: m.nome }).eq("jid", m.jid).neq("nome", m.nome);

  const { error } = await banco.from("wa_mensagens").upsert({
    id: m.id, jid: m.jid, de_mim: m.de_mim, tipo: m.tipo, texto: m.texto,
    midia_nome: m.midia_nome, midia_mime: m.midia_mime, status: m.status, em: m.em,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

async function atualizarStatus(id: string, status: StatusMsg) {
  const { data } = await db().from("wa_mensagens").select("status").eq("id", id).maybeSingle();
  if (data && statusAvanca(data.status as StatusMsg, status)) await db().from("wa_mensagens").update({ status }).eq("id", id);
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const bruto = await req.text();
  if (bruto.length > MAX_CORPO) return NextResponse.json({ ok: false, erro: "corpo grande demais" }, { status: 413 });

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  // Só a instância do Playroom
  if (corpo.instance && corpo.instance !== instancia()) return NextResponse.json({ ok: true, ignorado: "instância" });

  const evento = String(corpo.event ?? "").toLowerCase().replace(/_/g, ".");
  const itens = Array.isArray(corpo.data) ? corpo.data : [corpo.data];

  try {
    if (evento === "messages.upsert") {
      let n = 0;
      for (const item of itens) {
        const m = lerMensagem(item);
        if (m) { await gravarMensagem(m); n++; }
      }
      return NextResponse.json({ ok: true, gravadas: n });
    }
    if (evento === "messages.update") {
      for (const item of itens) {
        const u = lerAtualizacao(item);
        if (u) await atualizarStatus(u.id, u.status);
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("[whatsapp] webhook falhou:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ignorado: evento || "sem evento" });
}
