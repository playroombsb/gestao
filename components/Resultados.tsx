import { QUADRANTES, brl, lucro, naoSei, quadrante, type Resumo } from "@/lib/calc";
import Matriz from "./Matriz";

/** A levantar, visão do mês, ranking e matriz. Usado no preenchimento e no painel de leitura. */
export default function Resultados({ calc }: { calc: Resumo }) {
  return (
    <>
      {/* Lacunas */}
      <section className="flex flex-col gap-4" aria-labelledby="t-gap">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-gap" className="text-[22px] font-bold tracking-tight">A levantar</h2>
          <p className="text-[13px] text-muted">Tudo que foi marcado como &ldquo;não sei&rdquo;. Vira lista de tarefas antes de decidir.</p>
        </div>
        <ul className="flex flex-col gap-0.5">
          {calc.lacunas.length ? calc.lacunas.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-4 border-l-[3px] border-red bg-red-soft px-3.5 py-3">
              <b>{p.nome}</b><span className="text-muted">{naoSei(p).join(", ")}</span>
            </li>
          )) : (
            <li className="border-l-[3px] border-line px-3.5 py-3 text-muted">Nada marcado como &ldquo;não sei&rdquo; até agora.</li>
          )}
        </ul>
      </section>

      {/* Totais */}
      <section className="flex flex-col gap-4" aria-labelledby="t-tot">
        <h2 id="t-tot" className="text-[22px] font-bold tracking-tight">Visão do mês</h2>
        <div className="grid grid-cols-2 gap-0.5 bg-line md:grid-cols-4">
          {[
            ["Faturamento", brl(calc.rec), false],
            ["Lucro", brl(calc.luc), true],
            ["Margem ponderada", (calc.rec ? Math.round((calc.luc / calc.rec) * 100) : 0) + "%", false],
            ["Vendas no mês", Math.round(calc.vol).toLocaleString("pt-BR"), false],
          ].map(([l, v, hl]) => (
            <div key={l as string} className={`flex min-w-0 flex-col gap-1.5 px-3 py-4 sm:px-4 sm:py-[18px] ${hl ? "bg-red text-white" : "bg-paper"}`}>
              <small className={`text-[10.5px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.14em] ${hl ? "text-white/85" : "text-muted"}`}>{l}</small>
              <b className="text-[clamp(17px,5.2vw,26px)] font-extrabold tracking-tight tabular-nums">{v}</b>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-muted">Considera só os produtos com os três números preenchidos.</p>
      </section>

      {/* Ranking */}
      <section className="flex flex-col gap-4" aria-labelledby="t-rank">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-rank" className="text-[22px] font-bold tracking-tight">Ranking por lucro mensal</h2>
          <p className="text-[13px] text-muted">Lucro = ticket × margem × vendas no mês</p>
        </div>
        <div className="flex flex-col gap-3">
          {calc.ranking.length ? calc.ranking.map((p, i) => {
            const l = lucro(p);
            const q = quadrante(p, calc.mm, calc.mv);
            const pill = { carro: "border-red bg-red text-white", premium: "border-red text-red", caixa: "border-ink text-ink", repensar: "border-muted text-muted" }[q];
            return (
              <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1.5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,3fr)_auto]">
                <div className="truncate font-semibold">
                  {p.nome}
                  <span className={`ml-2 inline-block border-[1.5px] px-1.5 py-px align-[1px] text-[10px] font-bold uppercase tracking-wider ${pill}`}>{QUADRANTES[q]}</span>
                </div>
                <div className="order-3 col-span-2 h-4 bg-line md:order-none md:col-span-1">
                  <div className={`anima h-full ${l < 0 ? "bg-muted" : i === 0 ? "bg-red" : "bg-ink"}`} style={{ width: `${(Math.abs(l) / calc.max) * 100}%` }} />
                </div>
                <div className="min-w-[12ch] text-right text-[13px] font-semibold tabular-nums">
                  {brl(l)} · {calc.luc > 0 ? Math.round((l / calc.luc) * 100) : 0}%
                </div>
              </div>
            );
          }) : (
            <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
              O ranking aparece aqui assim que o primeiro produto tiver ticket, margem e vendas preenchidos.
            </div>
          )}
        </div>
      </section>

      {/* Matriz */}
      <section className="flex flex-col gap-4" aria-labelledby="t-mx">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-mx" className="text-[22px] font-bold tracking-tight">Matriz margem × giro</h2>
          <p className="text-[13px] text-muted">Cortes na mediana dos produtos. Tamanho do ponto = lucro mensal.</p>
        </div>
        <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="md:hidden"><Matriz itens={calc.feitos} mm={calc.mm} mv={calc.mv} compacto /></div>
          <div className="hidden md:block"><Matriz itens={calc.feitos} mm={calc.mm} mv={calc.mv} /></div>
          <div className="flex flex-col gap-4">
            {[
              ["border-red", "Carro-chefe", "Margem alta e giro alto. Proteger, divulgar, nunca deixar faltar."],
              ["border-red-deep", "Nicho premium", "Margem alta, pouco giro. Empurrar com pacote, upsell ou evento dedicado."],
              ["border-ink", "Gerador de caixa", "Giro alto, margem baixa. Traz gente e fluxo; testar reajuste de preço ou custo."],
              ["border-muted", "Repensar", "Margem e giro baixos. Reformular, juntar com outro produto ou cortar."],
            ].map(([b, t, d]) => (
              <div key={t} className={`border-l-[3px] pl-3 ${b}`}>
                <h3 className="text-sm font-bold">{t}</h3>
                <p className="text-[13px] text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
