"use server";

import { headers } from "next/headers";
import { sessao } from "@/lib/auth";
import { negar, txt, type Res } from "@/lib/crud";
import * as evo from "@/lib/evolution";
import { db } from "@/lib/supabase";
import type { Conversa, Mensagem } from "@/lib/types";
import { destinoDoJid, lerMensagem, telefoneBonito } from "@/lib/whatsapp";

// Conversas do WhatsApp: só admin (decisão da Ana em 22/10/2026).

const falha = (erro: string) => ({ ok: false as const, erro });
const ok = <T,>(data: T) => ({ ok: true as const, data });

async function admin() {
  const s = await sessao();
  return s?.admin ? s : null;
}

const COLS_CONVERSA = "jid,nome,telefone,contato_id,ultima_em,ultima_previa,ultima_de_mim,nao_lidas";
const COLS_MENSAGEM = "id,jid,de_mim,tipo,texto,midia_nome,midia_mime,status,enviada_por,em";
const POR_PAGINA = 80;
const MAX_ENVIO = 4_000;

const conversa = (r: Record<string, unknown>): Conversa => ({
  jid: txt(r.jid), nome: txt(r.nome), telefone: txt(r.telefone),
  contato_id: r.contato_id ? txt(r.contato_id) : null,
  ultima_em: r.ultima_em ? txt(r.ultima_em) : null,
  ultima_previa: txt(r.ultima_previa), ultima_de_mim: Boolean(r.ultima_de_mim), nao_lidas: Number(r.nao_lidas ?? 0),
});

const mensagem = (r: Record<string, unknown>): Mensagem => ({
  id: txt(r.id), jid: txt(r.jid), de_mim: Boolean(r.de_mim), tipo: txt(r.tipo) as Mensagem["tipo"], texto: txt(r.texto),
  midia_nome: r.midia_nome ? txt(r.midia_nome) : null, midia_mime: r.midia_mime ? txt(r.midia_mime) : null,
  status: txt(r.status) as Mensagem["status"], enviada_por: r.enviada_por ? txt(r.enviada_por) : null, em: txt(r.em),
});

export async function listarConversas(): Promise<Res<Conversa[]>> {
  if (!(await admin())) return negar();
  const { data, error } = await db().from("wa_conversas").select(COLS_CONVERSA)
    .order("ultima_em", { ascending: false, nullsFirst: false }).limit(300);
  return error ? falha("Não foi possível carregar as conversas.") : ok((data ?? []).map(conversa));
}

/** Últimas mensagens de uma conversa (ou as anteriores a `antes`), em ordem do mais antigo para o mais novo. */
export async function listarMensagens(jid: string, antes?: string): Promise<Res<{ mensagens: Mensagem[]; maisAntigas: boolean }>> {
  if (!(await admin())) return negar();
  let q = db().from("wa_mensagens").select(COLS_MENSAGEM).eq("jid", jid).order("em", { ascending: false }).limit(POR_PAGINA + 1);
  if (antes) q = q.lt("em", antes);
  const { data, error } = await q;
  if (error) return falha("Não foi possível carregar as mensagens.");
  const linhas = data ?? [];
  return ok({ mensagens: linhas.slice(0, POR_PAGINA).map(mensagem).reverse(), maisAntigas: linhas.length > POR_PAGINA });
}

/** Conversa aberta na tela conta como lida. */
export async function marcarLida(jid: string): Promise<Res<null>> {
  if (!(await admin())) return negar();
  const { error } = await db().from("wa_conversas").update({ nao_lidas: 0 }).eq("jid", jid).gt("nao_lidas", 0);
  return error ? falha("Não foi possível marcar como lida.") : ok(null);
}

/**
  Atualização periódica da tela: lista de conversas e as mensagens mais recentes da conversa aberta
  (pega novas e mudanças de status). A conversa aberta é marcada como lida.
*/
export async function atualizarConversas(aberta: string | null): Promise<Res<{ conversas: Conversa[]; mensagens: Mensagem[] }>> {
  if (!(await admin())) return negar();
  if (aberta) await db().from("wa_conversas").update({ nao_lidas: 0 }).eq("jid", aberta).gt("nao_lidas", 0);
  const [c, m] = await Promise.all([
    db().from("wa_conversas").select(COLS_CONVERSA).order("ultima_em", { ascending: false, nullsFirst: false }).limit(300),
    aberta
      ? db().from("wa_mensagens").select(COLS_MENSAGEM).eq("jid", aberta).order("em", { ascending: false }).limit(40)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (c.error || m.error) return falha("Sem conexão com o servidor. Tentando de novo…");
  return ok({ conversas: (c.data ?? []).map(conversa), mensagens: (m.data ?? []).map(mensagem).reverse() });
}

export async function enviarMensagem(jid: string, texto: string): Promise<Res<Mensagem>> {
  const s = await admin();
  if (!s) return negar();
  const limpo = texto.replace(/\s+$/, "").replace(/^\s*\n/, "");
  if (!limpo.trim()) return falha("Escreva a mensagem.");
  if (limpo.length > MAX_ENVIO) return falha(`Mensagem longa demais (máximo ${MAX_ENVIO} caracteres).`);
  const { data: c } = await db().from("wa_conversas").select("jid").eq("jid", jid).maybeSingle();
  if (!c) return falha("Conversa não encontrada.");

  let resposta: Record<string, unknown>;
  try {
    resposta = await evo.enviarTexto(destinoDoJid(jid), limpo);
  } catch (e) {
    const status = e instanceof evo.ErroEvolution ? e.status : 0;
    return falha(status === 0 ? "O WhatsApp não respondeu. Confira a conexão em Admin › Integrações." : "O WhatsApp recusou o envio. A mensagem não saiu.");
  }
  const m = lerMensagem(resposta);
  if (!m) return falha("A mensagem saiu, mas não deu para registrar aqui. Ela aparece quando o WhatsApp confirmar.");

  // O webhook pode ter chegado antes e gravado a mesma mensagem: grava se não existir e marca quem enviou
  const banco = db();
  await banco.from("wa_mensagens").upsert({
    id: m.id, jid, de_mim: true, tipo: m.tipo, texto: m.texto, status: m.status || "pendente", em: m.em, enviada_por: s.id,
  }, { onConflict: "id", ignoreDuplicates: true });
  await banco.from("wa_mensagens").update({ enviada_por: s.id }).eq("id", m.id).is("enviada_por", null);
  const { data } = await banco.from("wa_mensagens").select(COLS_MENSAGEM).eq("id", m.id).single();
  return data ? ok(mensagem(data)) : falha("A mensagem saiu, mas não deu para registrar aqui.");
}

/** Liga a conversa a um contato do CRM (ou desliga, com null). */
export async function vincularContato(jid: string, contato_id: string | null): Promise<Res<null>> {
  if (!(await admin())) return negar();
  const { error } = await db().from("wa_conversas").update({ contato_id }).eq("jid", jid);
  return error ? falha("Não foi possível ligar ao CRM.") : ok(null);
}

/** Cria um contato no CRM a partir da conversa: só apelido (primeiro nome do WhatsApp) e o telefone. */
export async function criarContatoDaConversa(jid: string): Promise<Res<{ contato_id: string }>> {
  if (!(await admin())) return negar();
  const { data: c } = await db().from("wa_conversas").select(COLS_CONVERSA).eq("jid", jid).maybeSingle();
  if (!c) return falha("Conversa não encontrada.");
  const cv = conversa(c);
  if (cv.contato_id) return ok({ contato_id: cv.contato_id });
  const apelido = cv.nome.trim().split(/\s+/)[0] || "WhatsApp";
  const { data: novo, error } = await db().from("contatos").insert({
    apelido, contato: telefoneBonito(cv.telefone) || "WhatsApp", origem: "WhatsApp",
  }).select("id").single();
  if (error || !novo) return falha("Não foi possível criar o contato no CRM.");
  await db().from("wa_conversas").update({ contato_id: novo.id }).eq("jid", jid);
  return ok({ contato_id: txt(novo.id) });
}

// Conexão (Admin › Integrações)

function enderecoWebhook() {
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!token) throw new Error("Falta WHATSAPP_WEBHOOK_TOKEN no ambiente.");
  const h = headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  return `${base}/api/whatsapp/webhook?t=${token}`;
}

export async function estadoWhatsapp(): Promise<Res<Awaited<ReturnType<typeof evo.estado>>>> {
  if (!(await admin())) return negar();
  return ok(await evo.estado());
}

export async function conectarWhatsapp(): Promise<Res<{ qr: string | null; codigo: string | null }>> {
  if (!(await admin())) return negar();
  try {
    return ok(await evo.conectar(enderecoWebhook()));
  } catch (e) {
    console.error("[whatsapp] conectar falhou:", e instanceof Error ? e.message : e);
    return falha("Não foi possível falar com a Evolution. Tente de novo em instantes.");
  }
}

export async function desconectarWhatsapp(): Promise<Res<null>> {
  if (!(await admin())) return negar();
  try {
    await evo.desconectar();
    return ok(null);
  } catch {
    return falha("Não foi possível desconectar. Tente de novo.");
  }
}
