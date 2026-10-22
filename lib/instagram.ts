import "server-only";
import { num, txt } from "./crud";
import { db } from "./supabase";
import type { Insta } from "./types";

export const PERFIL = process.env.INSTAGRAM_PERFIL || "playroombsb";

const linha = (r: Record<string, unknown>): Insta => ({
  coletado_em: txt(r.coletado_em), perfil: txt(r.perfil),
  seguidores: num(r.seguidores), seguindo: num(r.seguindo), posts: num(r.posts),
  media_curtidas: num(r.media_curtidas), media_comentarios: num(r.media_comentarios),
  engajamento: num(r.engajamento), posts_30d: num(r.posts_30d),
});

/** Última coleta e a de 7 dias antes (ou a mais antiga, se ainda não houver 7 dias). Uma consulta só. */
export async function carregarInsta(): Promise<{ atual: Insta | null; antes: Insta | null }> {
  const { data } = await db().from("instagram").select("*").eq("perfil", PERFIL)
    .order("coletado_em", { ascending: false }).limit(60);
  const linhas = (data ?? []).map(linha);
  const atual = linhas[0] ?? null;
  if (!atual) return { atual: null, antes: null };
  const corte = Date.parse(atual.coletado_em) - 7 * 86_400_000;
  const antes = linhas.find((l) => Date.parse(l.coletado_em) <= corte) ?? linhas[linhas.length - 1];
  return { atual, antes: antes && antes.coletado_em !== atual.coletado_em ? antes : null };
}

/** Todas as coletas do perfil (até 2 anos de coleta semanal), para o gráfico de Métricas. */
export async function carregarSerieInsta(): Promise<Insta[]> {
  const { data } = await db().from("instagram").select("*").eq("perfil", PERFIL)
    .order("coletado_em", { ascending: false }).limit(110);
  return (data ?? []).map(linha);
}
