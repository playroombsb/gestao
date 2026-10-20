import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./supabase";

export const COOKIE = "sm_sessao";
export const DURACAO = 30 * 24 * 60 * 60; // 30 dias, em segundos

/** v = versão da sessão do usuário; se mudar no banco, o cookie deixa de valer. */
export type Sessao = { id: string; nome: string; admin: boolean; v: number };

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Falta SESSION_SECRET (32 caracteres ou mais) no ambiente.");
  return s;
}

const assinar = (dados: string) => createHmac("sha256", segredo()).update(dados).digest("base64url");

/** Cookie assinado com HMAC: <dados base64url>.<assinatura>. Quem não tem o segredo não forja. */
export function criarToken(s: Sessao) {
  const dados = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + DURACAO })).toString("base64url");
  return `${dados}.${assinar(dados)}`;
}

export const opcoesCookie = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: DURACAO,
};

function lerToken(token: string | undefined): { id: string; v: number } | null {
  const [dados, sig] = (token ?? "").split(".");
  if (!dados || !sig) return null;
  const recebida = Buffer.from(sig);
  const certa = Buffer.from(assinar(dados));
  if (recebida.length !== certa.length || !timingSafeEqual(recebida, certa)) return null;
  try {
    const p = JSON.parse(Buffer.from(dados, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000 || typeof p.v !== "number") return null;
    return { id: String(p.id), v: p.v };
  } catch {
    return null;
  }
}

/**
  Sessão válida: cookie assinado e usuário ainda existe com a mesma versão.
  Nome e admin vêm do banco, então mudanças valem na hora. Uma consulta por requisição.
*/
export const sessao = cache(async (): Promise<Sessao | null> => {
  const t = lerToken(cookies().get(COOKIE)?.value);
  if (!t) return null;
  const { data } = await db().from("usuarios").select("nome,admin,versao").eq("id", t.id).maybeSingle();
  if (!data || Number(data.versao) !== t.v) return null;
  return { id: t.id, nome: String(data.nome), admin: Boolean(data.admin), v: t.v };
});

/** Para páginas: sem sessão válida, manda para o login. */
export async function exigirLogin() {
  const s = await sessao();
  if (!s) redirect("/login");
  return s;
}

/** Para páginas de admin: quem não é admin volta para o início. */
export async function exigirAdmin() {
  const s = await exigirLogin();
  if (!s.admin) redirect("/");
  return s;
}
