import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE = "sm_sessao";
export const DURACAO = 30 * 24 * 60 * 60; // 30 dias, em segundos

export type Sessao = { id: string; nome: string; admin: boolean };

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

function lerToken(token: string | undefined): Sessao | null {
  const [dados, sig] = (token ?? "").split(".");
  if (!dados || !sig) return null;
  const recebida = Buffer.from(sig);
  const certa = Buffer.from(assinar(dados));
  if (recebida.length !== certa.length || !timingSafeEqual(recebida, certa)) return null;
  try {
    const p = JSON.parse(Buffer.from(dados, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return { id: String(p.id), nome: String(p.nome), admin: Boolean(p.admin) };
  } catch {
    return null;
  }
}

export function sessao() {
  return lerToken(cookies().get(COOKIE)?.value);
}

/** Para páginas: sem sessão válida, manda para o login. */
export function exigirLogin() {
  const s = sessao();
  if (!s) redirect("/login");
  return s;
}
