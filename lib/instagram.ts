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

/** Última coleta e a coleta de 7 dias antes (ou a mais antiga, se ainda não houver 7 dias). */
export async function carregarInsta(): Promise<{ atual: Insta | null; antes: Insta | null }> {
  const base = () => db().from("instagram").select("*").eq("perfil", PERFIL);
  const { data: ult } = await base().order("coletado_em", { ascending: false }).limit(1);
  const atual = ult?.[0] ? linha(ult[0]) : null;
  if (!atual) return { atual: null, antes: null };
  const corte = new Date(Date.parse(atual.coletado_em) - 7 * 86_400_000).toISOString();
  const { data: velha } = await base().lte("coletado_em", corte).order("coletado_em", { ascending: false }).limit(1);
  const { data: primeira } = velha?.length ? { data: velha } : await base().order("coletado_em").limit(1);
  const antes = primeira?.[0] ? linha(primeira[0]) : null;
  return { atual, antes: antes && antes.coletado_em !== atual.coletado_em ? antes : null };
}
