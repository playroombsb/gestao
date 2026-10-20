"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { adicionar, remover, salvar } from "@/app/actions";
import { CAMPOS, brl, lucro, mostrar, naoSei, parseNum, preenchido, respondido, resumo } from "@/lib/calc";
import type { Campo, Produto, ProdutoPatch } from "@/lib/types";
import Resultados from "./Resultados";

type Status = { t: string; tom?: "ok" | "erro" };

export default function Painel({ inicial }: { inicial: Produto[] }) {
  const [itens, setItens] = useState<Produto[]>(inicial);
  const [status, setStatus] = useState<Status>({ t: "Tudo salvo", tom: "ok" });
  const [armado, setArmado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const pendentes = useRef<Record<string, { timer: ReturnType<typeof setTimeout>; patch: ProdutoPatch }>>({});

  const gravar = useCallback(async (id: string, patch: ProdutoPatch) => {
    setStatus({ t: "Salvando…" });
    const r = await salvar(id, patch);
    setStatus(r.ok ? { t: "Salvo", tom: "ok" } : { t: r.erro, tom: "erro" });
  }, []);

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
    const r = await adicionar(ordem);
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
    setStatus({ t: "Salvando…" });
    const r = await remover(id);
    setStatus(r.ok ? { t: "Salvo", tom: "ok" } : { t: r.erro, tom: "erro" });
  }

  const calc = useMemo(() => resumo(itens), [itens]);

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
    <main className="mx-auto flex max-w-[1080px] flex-col gap-9 px-4 pb-16 pt-6 md:gap-11 md:px-5 md:pt-8">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-6 md:pb-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM · Playroom · Brasília</p>
        <h1 className="text-balance text-[clamp(36px,7vw,62px)] font-extrabold leading-none tracking-[-0.035em]">
          O que <span className="text-red">paga</span> a casa
        </h1>
        <p className="text-base text-ink/80">
          Para cada produto ou serviço, preencha três números: o ticket médio, a margem de lucro e quantas vendas
          acontecem por mês (ou quantas você estima). Se não souber algum, clique em &ldquo;Não sei&rdquo;. Nada é obrigatório: preencha só o que quiser. O resto a
          página calcula sozinha, e tudo fica salvo.
        </p>
      </header>

      {/* Preenchimento */}
      <section className="flex flex-col gap-4" aria-labelledby="t-in">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-in" className="text-[22px] font-bold tracking-tight">Preencha os números</h2>
        </div>
        {/* No celular fica preso no topo: a pessoa vê o progresso e o "Salvo" enquanto preenche. */}
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 text-[13px] text-muted backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <span className="shrink-0">{calc.resp} de {itens.length} respondidos</span>
          <div className="h-1 max-w-[240px] flex-1 bg-line">
            <div className="anima h-full bg-red" style={{ width: `${itens.length ? (calc.resp / itens.length) * 100 : 0}%` }} />
          </div>
          <span aria-live="polite" className={`ml-auto shrink-0 text-xs font-semibold uppercase tracking-wider ${
            status.tom === "erro" ? "text-red" : status.tom === "ok" ? "text-ink" : "text-muted"}`}>{status.t}</span>
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
                className={`relative grid grid-cols-3 items-start gap-x-2.5 gap-y-3 border border-line border-l-4 bg-paper px-3.5 py-3 focus-within:outline md:items-center md:gap-3 focus-within:outline-2 focus-within:outline-red md:grid-cols-[28px_minmax(0,2.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_34px] ${
                  ok ? "border-l-red" : "border-l-line-soft"}`}>
                <span className={`absolute left-3.5 top-[19px] text-[13px] font-extrabold md:static ${ok ? "text-red" : "text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-3 flex min-w-0 flex-col md:col-span-1">
                  <span className="label flex min-h-[34px] items-center pl-7 md:hidden">Produto / serviço</span>
                  <input id={`nome-${p.id}`} className="campo font-bold" value={p.nome} placeholder="Nome do produto"
                    aria-label="Nome do produto" onChange={(e) => alterar(p.id, { nome: e.target.value })} />
                  {p.descricao && <span className="mt-1 text-[12.5px] text-muted">{p.descricao}</span>}
                </div>
                {CAMPOS.map(({ k, label, mobile }) => {
                  const ns = p[`${k}_ns`];
                  return (
                    <div key={k} className="flex min-w-0 flex-col">
                      <span className="label whitespace-nowrap md:hidden">{mobile}</span>
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
                        className={`mt-2 min-h-[40px] self-stretch border-[1.5px] px-1 text-[13px] font-semibold md:mt-1.5 md:min-h-0 md:self-end md:px-2 md:py-0.5 md:text-[11px] ${
                          ns ? "border-ink bg-ink text-white" : "border-line-soft text-muted hover:border-red hover:text-red focus-visible:border-red focus-visible:text-red focus-visible:outline-none"}`}>
                        {ns ? "Sei sim" : "Não sei"}
                      </button>
                    </div>
                  );
                })}
                <div className="col-span-3 flex min-w-0 items-baseline justify-between gap-3 border-t border-line-soft pt-2.5 md:col-span-1 md:block md:border-0 md:pt-0">
                  <span className="label md:hidden">Lucro / mês</span>
                  <span className={`block tabular-nums md:text-right ${preenchido(p) ? "font-extrabold" : "font-medium text-[#b3a7a5]"}`}>
                    {preenchido(p) ? brl(lucro(p)) : "sem cálculo"}
                  </span>
                </div>
                <button type="button" onClick={() => apagar(p.id)} aria-label={`Remover ${p.nome}`}
                  className={`absolute right-1.5 top-1.5 h-11 border-[1.5px] md:static md:h-8 ${armado === p.id
                    ? "border-red bg-red px-2.5 text-[12px] font-bold text-white md:px-1.5 md:text-[11px]"
                    : "w-11 border-transparent text-xl text-muted hover:border-red hover:text-red md:w-8 md:text-lg"}`}>
                  {armado === p.id ? "Remover?" : "×"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={novo}
            className="min-h-[48px] flex-1 border-2 border-red bg-red px-[18px] py-[11px] text-[13px] font-bold tracking-wide text-white hover:brightness-110 sm:min-h-0 sm:flex-none">
            + Adicionar produto
          </button>
          <button type="button" onClick={copiar}
            className="min-h-[48px] flex-1 border-2 border-ink px-[18px] py-[11px] text-[13px] font-bold tracking-wide hover:bg-ink hover:text-white sm:min-h-0 sm:flex-none">
            {copiado ?? "Copiar resumo"}
          </button>
        </div>
      </section>

      <Resultados calc={calc} />
    </main>
  );
}
