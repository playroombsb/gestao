"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { adicionar, remover, salvar } from "@/app/actions";
import {
  CAMPOS, QUADRANTES, brl, lucro, mediana, mostrar, naoSei, parseNum, preenchido, quadrante, respondido,
} from "@/lib/calc";
import type { Campo, Produto, ProdutoPatch } from "@/lib/types";
import Matriz from "./Matriz";

type Status = { t: string; tom?: "ok" | "erro" };

export default function Painel({ chave, inicial }: { chave: string; inicial: Produto[] }) {
  const [itens, setItens] = useState<Produto[]>(inicial);
  const [status, setStatus] = useState<Status>({ t: "Tudo salvo", tom: "ok" });
  const [armado, setArmado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const pendentes = useRef<Record<string, { timer: ReturnType<typeof setTimeout>; patch: ProdutoPatch }>>({});

  const gravar = useCallback(async (id: string, patch: ProdutoPatch) => {
    setStatus({ t: "Salvando…" });
    const r = await salvar(chave, id, patch);
    setStatus(r.ok ? { t: "Salvo", tom: "ok" } : { t: r.erro, tom: "erro" });
  }, [chave]);

  const alterar = useCallback((id: string, patch: ProdutoPatch, imediato = false) => {
    setItens((xs) => xs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const atual = pendentes.current[id];
    if (atual) clearTimeout(atual.timer);
    const acumulado = { ...(atual?.patch ?? {}), ...patch };
    if (imediato) {
      delete pendentes.current[id];
      void gravar(id, acumulado);
      return;
    }
    setStatus({ t: "Editando…" });
    pendentes.current[id] = {
      patch: acumulado,
      timer: setTimeout(() => {
        delete pendentes.current[id];
        void gravar(id, acumulado);
      }, 700),
    };
  }, [gravar]);

  async function novo() {
    const ordem = Math.max(0, ...itens.map((p) => p.ordem)) + 1;
    setStatus({ t: "Salvando…" });
    const r = await adicionar(chave, ordem);
    if (!r.ok) return setStatus({ t: r.erro, tom: "erro" });
    setItens((xs) => [...xs, r.data]);
    setStatus({ t: "Salvo", tom: "ok" });
    setTimeout(() => document.getElementById(`nome-${r.data.id}`)?.focus(), 30);
  }

  async function apagar(id: string) {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    setItens((xs) => xs.filter((p) => p.id !== id));
    const r = await remover(chave, id);
    setStatus(r.ok ? { t: "Salvo", tom: "ok" } : { t: r.erro, tom: "erro" });
  }

  const calc = useMemo(() => {
    const feitos = itens.filter((p) => p.nome.trim() && preenchido(p));
    let rec = 0, luc = 0, vol = 0;
    for (const p of feitos) { rec += p.ticket! * p.vendas!; luc += lucro(p); vol += p.vendas!; }
    const mm = mediana(feitos.map((p) => p.margem!));
    const mv = mediana(feitos.map((p) => p.vendas!));
    const ranking = [...feitos].sort((a, b) => lucro(b) - lucro(a));
    const max = Math.max(1, ...ranking.map((p) => Math.abs(lucro(p))));
    const resp = itens.filter(respondido).length;
    const lacunas = itens.filter((p) => p.nome.trim() && naoSei(p).length);
    return { feitos, rec, luc, vol, mm, mv, ranking, max, resp, lacunas };
  }, [itens]);

  async function copiar() {
    const f = (p: Produto, k: Campo, fmt: (n: number) => string) =>
      p[`${k}_ns`] ? "não sei" : p[k] != null ? fmt(p[k]!) : "vazio";
    const txt = "Studio - SM · mix de produtos\n\n" + [...itens].filter((p) => p.nome.trim())
      .sort((a, b) => lucro(b) - lucro(a))
      .map((p) => `${p.nome}: ticket ${f(p, "ticket", brl)}, margem ${f(p, "margem", (n) => n + "%")}, vendas/mês ${f(p, "vendas", String)}` +
        (preenchido(p) ? `, lucro ${brl(lucro(p))}/mês` : ""))
      .join("\n");
    try { await navigator.clipboard.writeText(txt); setCopiado("Resumo copiado"); }
    catch { setCopiado("Não foi possível copiar"); }
    setTimeout(() => setCopiado(null), 2200);
  }

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-11 px-5 pb-16 pt-8">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM · Playroom · Brasília</p>
        <h1 className="text-balance text-[clamp(36px,7vw,62px)] font-extrabold leading-none tracking-[-0.035em]">
          O que <span className="text-red">paga</span> a casa
        </h1>
        <p className="max-w-[62ch] text-base text-ink/80">
          Para cada produto ou serviço, preencha três números: o ticket médio, a margem de lucro e quantas vendas
          acontecem por mês (ou quantas você estima). Se não souber algum, clique em &ldquo;Não sei&rdquo;. O resto a
          página calcula sozinha, e tudo fica salvo.
        </p>
      </header>

      {/* Preenchimento */}
      <section className="flex flex-col gap-4" aria-labelledby="t-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-in" className="text-[22px] font-bold tracking-tight">Preencha os números</h2>
          <span aria-live="polite" className={`text-xs font-semibold uppercase tracking-wider ${
            status.tom === "erro" ? "text-red" : status.tom === "ok" ? "text-ink" : "text-muted"}`}>{status.t}</span>
        </div>
        <div className="flex items-center gap-3 text-[13px] text-muted">
          <span>{calc.resp} de {itens.length} respondidos</span>
          <div className="h-1 max-w-[240px] flex-1 bg-line">
            <div className="anima h-full bg-red" style={{ width: `${itens.length ? (calc.resp / itens.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div aria-hidden className="hidden grid-cols-[28px_minmax(0,2.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_34px] gap-3 px-3.5 md:grid">
          <span /><span className="label">Produto / serviço</span>
          {CAMPOS.map((c) => <span key={c.k} className="label text-right">{c.label}</span>)}
          <span className="label text-right">Lucro / mês</span><span />
        </div>

        <div className="flex flex-col gap-1.5">
          {itens.length === 0 && (
            <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
              Nenhum produto ainda. Use &ldquo;Adicionar produto&rdquo;.
            </div>
          )}
          {itens.map((p, i) => {
            const ok = respondido(p);
            return (
              <div key={p.id}
                className={`relative grid grid-cols-2 items-center gap-3 border border-line border-l-4 bg-paper py-3 pl-3.5 pr-[52px] focus-within:outline focus-within:outline-2 focus-within:outline-red md:grid-cols-[28px_minmax(0,2.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_34px] md:pr-3.5 ${
                  ok ? "border-l-red" : "border-l-line-soft"}`}>
                <span className={`absolute left-3.5 top-3 text-[13px] font-extrabold md:static ${ok ? "text-red" : "text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-2 flex min-w-0 flex-col pl-6 md:col-span-1 md:pl-0">
                  <span className="label md:hidden">Produto / serviço</span>
                  <input id={`nome-${p.id}`} className="campo font-bold" value={p.nome} placeholder="Nome do produto"
                    aria-label="Nome do produto" onChange={(e) => alterar(p.id, { nome: e.target.value })} />
                  {p.descricao && <span className="mt-1 text-[12.5px] text-muted">{p.descricao}</span>}
                </div>
                {CAMPOS.map(({ k, label }) => {
                  const ns = p[`${k}_ns`];
                  return (
                    <div key={k} className="flex min-w-0 flex-col">
                      <span className="label md:hidden">{label}</span>
                      <input key={`${p.id}-${k}-${ns}`} id={`${k}-${p.id}`} inputMode="decimal"
                        className={`campo text-right font-semibold tabular-nums ${ns ? "italic font-bold text-red" : ""}`}
                        defaultValue={ns ? "Não sei" : mostrar(p[k])} readOnly={ns} placeholder="0"
                        aria-label={`${label} de ${p.nome}`}
                        onChange={(e) => alterar(p.id, { [k]: parseNum(e.target.value) } as ProdutoPatch)} />
                      <button type="button" aria-pressed={ns}
                        onClick={() => {
                          alterar(p.id, { [`${k}_ns`]: !ns, ...(ns ? {} : { [k]: null }) } as ProdutoPatch, true);
                          if (ns) setTimeout(() => document.getElementById(`${k}-${p.id}`)?.focus(), 30);
                        }}
                        className={`mt-1.5 self-start border-[1.5px] px-2 py-0.5 text-[11px] font-semibold md:self-end ${
                          ns ? "border-ink bg-ink text-white" : "border-line-soft text-muted hover:border-red hover:text-red focus-visible:border-red focus-visible:text-red focus-visible:outline-none"}`}>
                        {ns ? "Sei sim" : "Não sei"}
                      </button>
                    </div>
                  );
                })}
                <div className="flex min-w-0 flex-col">
                  <span className="label md:hidden">Lucro / mês</span>
                  <span className={`tabular-nums md:text-right ${preenchido(p) ? "font-extrabold" : "font-medium text-[#b3a7a5]"}`}>
                    {preenchido(p) ? brl(lucro(p)) : naoSei(p).length ? "faltam dados" : "falta preencher"}
                  </span>
                </div>
                <button type="button" onClick={() => apagar(p.id)} aria-label={`Remover ${p.nome}`}
                  className={`absolute right-2 top-2 h-8 border-[1.5px] md:static ${armado === p.id
                    ? "border-red bg-red px-1.5 text-[11px] font-bold text-white"
                    : "w-8 border-transparent text-lg text-muted hover:border-red hover:text-red"}`}>
                  {armado === p.id ? "Remover?" : "×"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={novo}
            className="border-2 border-red bg-red px-[18px] py-[11px] text-[13px] font-bold tracking-wide text-white hover:brightness-110">
            + Adicionar produto
          </button>
          <button type="button" onClick={copiar}
            className="border-2 border-ink px-[18px] py-[11px] text-[13px] font-bold tracking-wide hover:bg-ink hover:text-white">
            {copiado ?? "Copiar resumo"}
          </button>
        </div>
      </section>

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
            <div key={l as string} className={`flex flex-col gap-1.5 px-4 py-[18px] ${hl ? "bg-red text-white" : "bg-paper"}`}>
              <small className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${hl ? "text-white/85" : "text-muted"}`}>{l}</small>
              <b className="text-[26px] font-extrabold tracking-tight tabular-nums">{v}</b>
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
          <Matriz itens={calc.feitos} mm={calc.mm} mv={calc.mv} />
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
    </main>
  );
}
