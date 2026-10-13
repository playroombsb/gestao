import Atualizar from "@/components/Atualizar";
import Resultados from "@/components/Resultados";
import { CAMPOS, brl, lucro, mostrar, preenchido, respondido, resumo } from "@/lib/calc";
import { carregarPainel } from "@/lib/dados";
import { chavePainelValida } from "@/lib/supabase";
import type { Campo, Produto } from "@/lib/types";

export const dynamic = "force-dynamic";

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{titulo}</h1>
      <p className="text-muted">{texto}</p>
    </main>
  );
}

const FMT: Record<Campo, (n: number) => string> = {
  ticket: brl,
  margem: (n) => mostrar(n) + "%",
  vendas: (n) => mostrar(n),
};

function Valor({ p, k }: { p: Produto; k: Campo }) {
  if (p[`${k}_ns`]) return <span className="font-bold italic text-red">Não sei</span>;
  if (p[k] == null) return <span className="text-[#b3a7a5]">em branco</span>;
  return <span className="font-semibold tabular-nums">{FMT[k](p[k]!)}</span>;
}

export default async function Page({ searchParams }: { searchParams: { k?: string } }) {
  if (!chavePainelValida(searchParams.k)) {
    return <Aviso titulo="Este link não abre o painel." texto="Link sem permissão. Peça um link novo." />;
  }
  const dados = await carregarPainel();
  if (!dados) return <Aviso titulo="O painel não carregou." texto="Não foi possível carregar os dados. Tente de novo em instantes." />;

  const itens = dados.produtos.filter((p) => p.nome.trim());
  const calc = resumo(itens);
  const quando = dados.atualizado
    ? new Date(dados.atualizado).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-9 px-4 pb-16 pt-6 md:gap-11 md:px-5 md:pt-8">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-6 md:pb-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM · Playroom · Painel de respostas</p>
        <h1 className="text-balance text-[clamp(32px,7vw,62px)] font-extrabold leading-none tracking-[-0.035em]">
          O que ela <span className="text-red">respondeu</span>
        </h1>
        <p className="text-base text-ink/80">
          Página só de leitura. Mostra o que foi preenchido em cada produto e o que esses números dizem. Atualiza
          sozinha a cada 30 segundos.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Atualizar />
          <span className="text-[13px] text-muted">
            {quando ? `Última alteração dela: ${quando}` : "Ainda sem alterações"}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="t-resp">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-resp" className="text-[22px] font-bold tracking-tight">Respostas por produto</h2>
          <div className="flex min-w-[200px] flex-1 items-center justify-end gap-3 text-[13px] text-muted">
            <span>{calc.resp} de {itens.length} respondidos</span>
            <div className="h-1 max-w-[200px] flex-1 bg-line">
              <div className="h-full bg-red" style={{ width: `${itens.length ? (calc.resp / itens.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div aria-hidden className="hidden grid-cols-[28px_minmax(0,2.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)] gap-3 px-3.5 md:grid">
          <span /><span className="label">Produto / serviço</span>
          {CAMPOS.map((c) => <span key={c.k} className="label text-right">{c.label}</span>)}
          <span className="label text-right">Lucro / mês</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {itens.length === 0 && (
            <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">Nenhum produto cadastrado ainda.</div>
          )}
          {itens.map((p, i) => {
            const ok = respondido(p);
            return (
              <div key={p.id}
                className={`grid grid-cols-3 items-start gap-x-3 gap-y-2.5 border border-line border-l-4 bg-paper px-3.5 py-3 md:grid-cols-[28px_minmax(0,2.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)] md:items-center ${
                  ok ? "border-l-red" : "border-l-line-soft"}`}>
                <span className={`hidden text-[13px] font-extrabold md:block ${ok ? "text-red" : "text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-3 flex min-w-0 items-baseline justify-between gap-3 md:col-span-1">
                  <div className="min-w-0">
                    <span className="font-bold">{p.nome}</span>
                    {p.descricao && <span className="mt-0.5 block text-[12.5px] text-muted">{p.descricao}</span>}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider md:hidden ${ok ? "text-red" : "text-muted"}`}>
                    {ok ? "Respondido" : "Em aberto"}
                  </span>
                </div>
                {CAMPOS.map(({ k, mobile }) => (
                  <div key={k} className="flex min-w-0 flex-col md:items-end">
                    <span className="label whitespace-nowrap md:hidden">{mobile}</span>
                    <Valor p={p} k={k} />
                  </div>
                ))}
                <div className="col-span-3 flex items-baseline justify-between gap-3 border-t border-line-soft pt-2 md:col-span-1 md:block md:border-0 md:pt-0 md:text-right">
                  <span className="label md:hidden">Lucro / mês</span>
                  <span className={`tabular-nums ${preenchido(p) ? "font-extrabold" : "font-medium text-[#b3a7a5]"}`}>
                    {preenchido(p) ? brl(lucro(p)) : "sem cálculo"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Resultados calc={calc} />
    </main>
  );
}
