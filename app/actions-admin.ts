"use server";

import { cookies } from "next/headers";
import { COOKIE, criarToken, opcoesCookie, sessao } from "@/lib/auth";
import { negar, txt, type Res } from "@/lib/crud";
import { conferirSenha, gerarHash, normalizarLogin } from "@/lib/senha";
import { db } from "@/lib/supabase";

export type Usuario = { id: string; nome: string; login: string; admin: boolean; created_at: string };

const MIN_SENHA = 8;
const falha = (erro: string) => ({ ok: false as const, erro });
const ok = <T,>(data: T) => ({ ok: true as const, data });

async function exigirAdmin() {
  const s = await sessao();
  return s?.admin ? s : null;
}

async function admins() {
  const { count } = await db().from("usuarios").select("id", { count: "exact", head: true }).eq("admin", true);
  return count ?? 0;
}

/** Aumenta a versão: os logins abertos daquele usuário deixam de valer. */
async function derrubar(id: string, extra: Record<string, unknown> = {}) {
  const { data } = await db().from("usuarios").select("versao").eq("id", id).single();
  return db().from("usuarios").update({ ...extra, versao: Number(data?.versao ?? 1) + 1 }).eq("id", id);
}

export async function listarUsuarios(): Promise<Res<Usuario[]>> {
  if (!(await exigirAdmin())) return negar();
  const { data, error } = await db().from("usuarios").select("id,nome,login,admin,created_at").order("created_at");
  if (error) return falha("Não foi possível carregar os usuários.");
  return ok((data ?? []).map((r) => ({ id: txt(r.id), nome: txt(r.nome), login: txt(r.login), admin: Boolean(r.admin), created_at: txt(r.created_at) })));
}

export async function criarUsuario(nome: string, login: string, senha: string, admin: boolean): Promise<Res<Usuario>> {
  if (!(await exigirAdmin())) return negar();
  const n = nome.trim();
  const l = normalizarLogin(login);
  if (!n) return falha("Informe o nome.");
  if (!/^[a-z0-9._-]{2,30}$/.test(l)) return falha("Usuário: de 2 a 30 letras ou números, sem espaço.");
  if (senha.trim().length < MIN_SENHA) return falha(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
  const { data, error } = await db().from("usuarios")
    .insert({ nome: n, login: l, senha_hash: gerarHash(senha.trim()), admin }).select("id,nome,login,admin,created_at").single();
  if (error?.code === "23505") return falha("Já existe alguém com esse usuário.");
  if (error || !data) return falha("Não foi possível criar.");
  return ok({ id: txt(data.id), nome: txt(data.nome), login: txt(data.login), admin: Boolean(data.admin), created_at: txt(data.created_at) });
}

export async function renomearUsuario(id: string, nome: string): Promise<Res<null>> {
  if (!(await exigirAdmin())) return negar();
  if (!nome.trim()) return falha("Informe o nome.");
  const { error } = await db().from("usuarios").update({ nome: nome.trim() }).eq("id", id);
  return error ? falha("Não salvou.") : ok(null);
}

export async function redefinirSenha(id: string, senha: string): Promise<Res<null>> {
  const s = await exigirAdmin();
  if (!s) return negar();
  if (senha.trim().length < MIN_SENHA) return falha(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
  const { error } = await derrubar(id, { senha_hash: gerarHash(senha.trim()) });
  if (error) return falha("Não foi possível trocar a senha.");
  if (id === s.id) await renovarCookie(id); // quem trocou a própria senha continua logado
  return ok(null);
}

export async function definirAdmin(id: string, admin: boolean): Promise<Res<null>> {
  const s = await exigirAdmin();
  if (!s) return negar();
  if (id === s.id && !admin) return falha("Você não pode tirar o próprio acesso de admin.");
  const { error } = await db().from("usuarios").update({ admin }).eq("id", id);
  return error ? falha("Não salvou.") : ok(null);
}

export async function encerrarSessoes(id: string): Promise<Res<null>> {
  const s = await exigirAdmin();
  if (!s) return negar();
  const { error } = await derrubar(id);
  if (error) return falha("Não foi possível encerrar.");
  if (id === s.id) await renovarCookie(id);
  return ok(null);
}

export async function removerUsuario(id: string): Promise<Res<null>> {
  const s = await exigirAdmin();
  if (!s) return negar();
  if (id === s.id) return falha("Você não pode remover o próprio usuário.");
  const { data: alvo } = await db().from("usuarios").select("admin").eq("id", id).single();
  if (alvo?.admin && (await admins()) <= 1) return falha("Precisa sobrar pelo menos um admin.");
  const { error } = await db().from("usuarios").delete().eq("id", id);
  return error ? falha("Não foi possível remover.") : ok(null);
}

/** Qualquer pessoa logada troca a própria senha, confirmando a atual. */
export async function trocarMinhaSenha(atual: string, nova: string): Promise<Res<null>> {
  const s = await sessao();
  if (!s) return negar();
  if (nova.trim().length < MIN_SENHA) return falha(`A senha nova precisa ter pelo menos ${MIN_SENHA} caracteres.`);
  const { data } = await db().from("usuarios").select("senha_hash").eq("id", s.id).single();
  if (!data || !conferirSenha(atual.trim(), String(data.senha_hash))) return falha("A senha atual não confere.");
  const { error } = await derrubar(s.id, { senha_hash: gerarHash(nova.trim()) });
  if (error) return falha("Não foi possível trocar a senha.");
  await renovarCookie(s.id);
  return ok(null);
}

/** Depois de aumentar a própria versão, grava um cookie novo para não cair do sistema. */
async function renovarCookie(id: string) {
  const { data } = await db().from("usuarios").select("nome,admin,versao").eq("id", id).single();
  if (!data) return;
  cookies().set(COOKIE, criarToken({ id, nome: txt(data.nome), admin: Boolean(data.admin), v: Number(data.versao) }), opcoesCookie);
}
