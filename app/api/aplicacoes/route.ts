import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import type { Resposta } from "@/lib/types";

export const dynamic = "force-dynamic";

/*
  Recebe as aplicações do formulário do site. Chamada servidor a servidor:
    POST /api/aplicacoes
    Authorization: Bearer <APLICACOES_TOKEN>
    { "apelido": "...", "contato": "...", "interesse": "...", "respostas": [{ "pergunta": "...", "resposta": "..." }] }
  Também aceita form-urlencoded. Campos que não forem apelido, contato ou interesse viram respostas.
*/

const MAX_CORPO = 20_000;
const MAX_TEXTO = 2_000;
const MAX_RESPOSTAS = 40;

const APELIDO = ["apelido", "nome", "name"];
const CONTATO = ["contato", "whatsapp", "telefone", "email", "instagram"];
const INTERESSE = ["interesse", "servico", "produto"];

function autorizado(req: Request) {
  const certo = process.env.APLICACOES_TOKEN;
  if (!certo) return false;
  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

const corta = (v: unknown) => String(v ?? "").trim().slice(0, MAX_TEXTO);

function pegar(campos: Record<string, unknown>, chaves: string[]) {
  for (const k of chaves) if (corta(campos[k])) return corta(campos[k]);
  return "";
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });

  const bruto = await req.text();
  if (bruto.length > MAX_CORPO) return NextResponse.json({ ok: false, erro: "corpo grande demais" }, { status: 413 });

  let campos: Record<string, unknown>;
  try {
    campos = (req.headers.get("content-type") ?? "").includes("application/json")
      ? JSON.parse(bruto)
      : Object.fromEntries(new URLSearchParams(bruto));
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  if (!campos || typeof campos !== "object" || Array.isArray(campos)) {
    return NextResponse.json({ ok: false, erro: "formato inválido" }, { status: 400 });
  }

  const respostas: Resposta[] = [];
  if (Array.isArray(campos.respostas)) {
    for (const r of campos.respostas as Record<string, unknown>[]) {
      if (r && typeof r === "object") respostas.push({ pergunta: corta(r.pergunta), resposta: corta(r.resposta) });
    }
  }
  const conhecidos = new Set([...APELIDO, ...CONTATO, ...INTERESSE, "respostas"]);
  for (const [k, v] of Object.entries(campos)) {
    if (!conhecidos.has(k) && v !== null && typeof v !== "object") respostas.push({ pergunta: corta(k), resposta: corta(v) });
  }

  const apelido = pegar(campos, APELIDO);
  const contato = pegar(campos, CONTATO);
  if (!apelido && !contato) return NextResponse.json({ ok: false, erro: "falta apelido ou contato" }, { status: 422 });

  const { data, error } = await db().from("aplicacoes").insert({
    apelido, contato, interesse: pegar(campos, INTERESSE), respostas: respostas.slice(0, MAX_RESPOSTAS),
  }).select("id").single();
  if (error || !data) return NextResponse.json({ ok: false, erro: "não foi possível salvar" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
