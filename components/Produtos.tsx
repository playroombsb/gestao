"use client";

import { useState } from "react";
import { adicionar, remover, salvar } from "@/app/actions";
import { mostrar, parseNum } from "@/lib/calc";
import { useAutosave } from "@/lib/useAutosave";
import type { Produto, ProdutoPatch } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

/** Textarea que cresce com o texto. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Catálogo: nome, descrição e preço de cada produto. O preço é guardado na coluna "ticket". */
export default function Produtos({ inicial }: { inicial: Produto[] }) {
  const [itens, setItens] = useState(inicial);
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<ProdutoPatch>(salvar);

  function alterar(id: string, patch: ProdutoPatch) {
    setItens((xs) => xs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    agendar(id, patch);
  }

  async function novo() {
    const ordem = Math.max(0, ...itens.map((p) => p.ordem)) + 1;
    const r = await rodar(() => adicionar(ordem));
    if (!r.ok) return;
    setItens((xs) => [...xs, r.data]);
    setTimeout(() => document.getElementById(`nome-${r.data.id}`)?.focus(), 30);
  }

  async function apagar(id: string) {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    esquecer(id);
    setItens((xs) => xs.filter((p) => p.id !== id));
    await rodar(() => remover(id));
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · Produtos" titulo={<>O que a casa <span className="text-red">vende</span></>}
        texto="Nome, descrição e preço de cada produto ou serviço. Tudo salva sozinho." />

      <section aria-label="Produtos" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>{itens.length} {itens.length === 1 ? "produto" : "produtos"}</span>
          <StatusSalvo status={status} />
        </div>

        {itens.length === 0 && (
          <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">Nenhum produto ainda.</div>
        )}

        {itens.map((p, i) => (
          <article key={p.id}
            className="grid gap-x-5 gap-y-2 border border-line border-l-4 border-l-red bg-paper p-4 focus-within:outline focus-within:outline-2 focus-within:outline-red md:grid-cols-[32px_minmax(0,1fr)_170px_40px] md:items-start md:p-5">
            <span className="hidden pt-2 text-[13px] font-extrabold text-red md:block">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <input id={`nome-${p.id}`} className="campo text-[18px] font-bold" value={p.nome} placeholder="Nome do produto"
                aria-label="Nome do produto" onChange={(e) => alterar(p.id, { nome: e.target.value })} />
              <textarea ref={ajustar} rows={1} value={p.descricao} placeholder="Descrição"
                aria-label={`Descrição de ${p.nome || "produto"}`}
                className="campo resize-none overflow-hidden text-[14px] leading-relaxed text-ink/80"
                onChange={(e) => { ajustar(e.target); alterar(p.id, { descricao: e.target.value }); }} />
            </div>
            <label className="flex flex-col gap-1">
              <span className="label">Preço (R$)</span>
              <input key={`preco-${p.id}`} inputMode="decimal" defaultValue={mostrar(p.ticket)} placeholder="0"
                className="campo text-right text-[18px] font-extrabold tabular-nums"
                onChange={(e) => alterar(p.id, { ticket: parseNum(e.target.value), ticket_ns: false })} />
            </label>
            <button type="button" onClick={() => apagar(p.id)} aria-label={`Remover ${p.nome || "produto"}`}
              className={`h-10 justify-self-end border-[1.5px] md:mt-1 ${armado === p.id
                ? "border-red bg-red px-2 text-[11px] font-bold text-white"
                : "w-10 border-transparent text-xl text-muted hover:border-red hover:text-red"}`}>
              {armado === p.id ? "Remover?" : "×"}
            </button>
          </article>
        ))}

        <div>
          <button type="button" onClick={novo}
            className="min-h-[48px] w-full border-2 border-red bg-red px-[18px] text-[13px] font-bold tracking-wide text-white hover:brightness-110 sm:min-h-[44px] sm:w-auto">
            + Adicionar produto
          </button>
        </div>
      </section>
    </main>
  );
}
