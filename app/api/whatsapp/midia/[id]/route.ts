import { NextResponse } from "next/server";
import { sessao } from "@/lib/auth";
import { baixarMidia } from "@/lib/evolution";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
  Foto, áudio, vídeo ou documento de uma mensagem. Só admin. O arquivo não fica guardado no sistema:
  vem da Evolution na hora e o navegador não guarda cópia.
*/
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const s = await sessao();
  if (!s?.admin) return NextResponse.json({ erro: "sem acesso" }, { status: 401 });
  const { data } = await db().from("wa_mensagens").select("tipo,midia_nome,midia_mime").eq("id", params.id).maybeSingle();
  if (!data || !["imagem", "audio", "video", "documento", "figurinha"].includes(String(data.tipo))) {
    return NextResponse.json({ erro: "mensagem sem mídia" }, { status: 404 });
  }
  try {
    const audio = data.tipo === "audio";
    const m = await baixarMidia(params.id, audio);
    const nome = (m.nome || data.midia_nome || "arquivo").replace(/["\r\n]/g, "");
    // O tipo vem de quem mandou a mensagem: só foto, vídeo e áudio abrem na tela; o resto vira download
    const informado = (audio ? m.mime : String(data.midia_mime || m.mime)).toLowerCase().split(";")[0].trim();
    const naTela = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|3gpp)|audio\/[a-z0-9.+-]+)$/.test(informado) && data.tipo !== "documento";
    return new NextResponse(m.dados, {
      headers: {
        "content-type": naTela ? informado : "application/octet-stream",
        "content-disposition": `${naTela ? "inline" : "attachment"}; filename="${encodeURIComponent(nome)}"`,
        "content-security-policy": "default-src 'none'; sandbox",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ erro: "não foi possível buscar a mídia no WhatsApp" }, { status: 502 });
  }
}
