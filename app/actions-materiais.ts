"use server";

import { randomUUID } from "node:crypto";
import { sessao } from "@/lib/auth";
import { filtrar, negar, num, txt, type Res } from "@/lib/crud";
import { db } from "@/lib/supabase";
import { TIPOS_MATERIAL, type Material, type MaterialPatch, type TipoMaterial } from "@/lib/types";

const BUCKET_MATERIAIS = "studio-sm-materiais";
const MAX_ARQUIVO = 50 * 1024 * 1024;
const COLS = "id,secao,titulo,descricao,tipo,conteudo,link,arquivo_nome,arquivo_tamanho,ordem";
const PERMITIDOS: (keyof MaterialPatch)[] = ["secao", "titulo", "descricao", "conteudo", "link", "ordem"];
const TIPOS = TIPOS_MATERIAL.map((t) => t.k) as string[];

const falha = (erro: string) => ({ ok: false as const, erro });

const material = (r: Record<string, unknown>): Material => ({
  id: txt(r.id), secao: txt(r.secao), titulo: txt(r.titulo), descricao: txt(r.descricao),
  tipo: (TIPOS.includes(txt(r.tipo)) ? txt(r.tipo) : "outro") as TipoMaterial,
  conteudo: txt(r.conteudo), link: txt(r.link),
  arquivo_nome: r.arquivo_nome ? txt(r.arquivo_nome) : null, arquivo_tamanho: num(r.arquivo_tamanho), ordem: Number(r.ordem ?? 0),
});

/** Nome seguro para o caminho no bucket: sem acento, espaço vira hífen. */
const nomeSeguro = (n: string) =>
  n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-120) || "arquivo";

export async function listarMateriais(): Promise<Res<Material[]>> {
  if (!(await sessao())) return negar();
  const { data, error } = await db().from("materiais").select(COLS).order("secao").order("ordem").order("created_at");
  return error ? falha("Não foi possível carregar os materiais.") : { ok: true, data: (data ?? []).map(material) };
}

/** Cria o material a partir do formulário (com arquivo opcional). */
export async function criarMaterial(form: FormData): Promise<Res<Material>> {
  if (!(await sessao())) return negar();
  const titulo = String(form.get("titulo") ?? "").trim();
  const tipo = String(form.get("tipo") ?? "pdf");
  if (!titulo) return falha("Dê um título ao material.");
  if (!TIPOS.includes(tipo)) return falha("Tipo inválido.");
  const link = String(form.get("link") ?? "").trim();
  if (link && !/^https?:\/\//i.test(link)) return falha("O link precisa começar com http:// ou https://.");

  const linha: Record<string, unknown> = {
    secao: String(form.get("secao") ?? "").trim() || "Geral",
    titulo, tipo, link,
    descricao: String(form.get("descricao") ?? "").trim(),
    conteudo: String(form.get("conteudo") ?? ""),
  };

  const arquivo = form.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > MAX_ARQUIVO) return falha("Arquivo maior que 50 MB.");
    const path = `${randomUUID()}/${nomeSeguro(arquivo.name)}`;
    const { error } = await db().storage.from(BUCKET_MATERIAIS)
      .upload(path, Buffer.from(await arquivo.arrayBuffer()), { contentType: arquivo.type || "application/octet-stream" });
    if (error) return falha("Não foi possível enviar o arquivo.");
    Object.assign(linha, { arquivo_path: path, arquivo_nome: arquivo.name, arquivo_tamanho: arquivo.size });
  } else if (tipo === "pdf") {
    return falha("Escolha o arquivo PDF.");
  }

  const { data, error } = await db().from("materiais").insert(linha).select(COLS).single();
  if (error || !data) {
    if (linha.arquivo_path) await db().storage.from(BUCKET_MATERIAIS).remove([String(linha.arquivo_path)]);
    return falha("Não foi possível salvar o material.");
  }
  return { ok: true, data: material(data) };
}

export async function salvarMaterial(id: string, patch: MaterialPatch): Promise<Res<null>> {
  if (!(await sessao())) return negar();
  const { error } = await db().from("materiais").update(filtrar(patch, PERMITIDOS)).eq("id", id);
  return error ? falha("Não salvou. Tente de novo.") : { ok: true, data: null };
}

/** Remove o material e o arquivo dele no bucket. */
export async function removerMaterial(id: string): Promise<Res<null>> {
  if (!(await sessao())) return negar();
  const { data } = await db().from("materiais").select("arquivo_path").eq("id", id).single();
  const { error } = await db().from("materiais").delete().eq("id", id);
  if (error) return falha("Não foi possível remover.");
  if (data?.arquivo_path) await db().storage.from(BUCKET_MATERIAIS).remove([String(data.arquivo_path)]);
  return { ok: true, data: null };
}
