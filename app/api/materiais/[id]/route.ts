import { NextResponse } from "next/server";
import { sessao } from "@/lib/auth";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Baixa o arquivo de um material: só com login. Redireciona para um link assinado que vale 60 segundos. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await sessao())) return NextResponse.json({ erro: "faça login" }, { status: 401 });
  const { data } = await db().from("materiais").select("arquivo_path,arquivo_nome").eq("id", params.id).maybeSingle();
  if (!data?.arquivo_path) return NextResponse.json({ erro: "material sem arquivo" }, { status: 404 });
  const { data: url, error } = await db().storage.from("studio-sm-materiais")
    .createSignedUrl(String(data.arquivo_path), 60, { download: String(data.arquivo_nome ?? "arquivo") });
  if (error || !url) return NextResponse.json({ erro: "não foi possível gerar o download" }, { status: 500 });
  return NextResponse.redirect(url.signedUrl);
}
