"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, DURACAO, criarToken } from "@/lib/auth";
import { conferirSenha, normalizarLogin } from "@/lib/senha";
import { db } from "@/lib/supabase";

// Trava simples em memória: 5 erros seguidos no mesmo usuário bloqueiam por 15 minutos.
const TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;
const erros = new Map<string, { n: number; ate: number }>();

export async function entrar(_: string | null, form: FormData): Promise<string | null> {
  const login = normalizarLogin(form.get("usuario"));
  const senha = String(form.get("senha") ?? "");
  if (!login || !senha) return "Preencha usuário e senha.";

  const e = erros.get(login);
  if (e && e.n >= TENTATIVAS && e.ate > Date.now()) return "Muitas tentativas erradas. Espere 15 minutos.";

  // Aceita o login ("ana") ou o nome completo ("Ana Paula"). A tabela é pequena, então compara aqui.
  const { data: todos, error } = await db().from("usuarios").select("id,nome,login,admin,senha_hash");
  if (error) return "Não foi possível entrar agora. Tente de novo.";
  const data = (todos ?? []).find((u) => u.login === login || normalizarLogin(u.nome) === login);
  if (!data || !conferirSenha(senha, String(data.senha_hash))) {
    const n = e && e.ate > Date.now() ? e.n + 1 : 1;
    erros.set(login, { n, ate: Date.now() + BLOQUEIO_MS });
    return "Usuário ou senha não conferem.";
  }

  erros.delete(login);
  cookies().set(COOKIE, criarToken({ id: String(data.id), nome: String(data.nome), admin: Boolean(data.admin) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO,
  });
  redirect("/");
}

export async function sair() {
  cookies().delete(COOKIE);
  redirect("/login");
}
