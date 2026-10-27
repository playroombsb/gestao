import { listarSecoes } from "@/app/actions";
import { sessao } from "@/lib/auth";
import { posicionamentoMd } from "@/lib/posicionamento";

export const dynamic = "force-dynamic";

/** Baixa o posicionamento em Markdown (só com login). */
export async function GET() {
  if (!(await sessao())) return new Response("Entre no sistema para exportar.", { status: 401 });
  const res = await listarSecoes("posicionamento");
  if (!res.ok) return new Response(res.erro, { status: 500 });
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Response(posicionamentoMd(res.data), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="posicionamento-playroom-${dia}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
