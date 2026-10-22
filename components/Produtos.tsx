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
          <div className="rounded-2xl border-[1.5px] border-dashed border-line p-6 text-[14px] text-muted">Nenhum produto ainda.</div>
        )}

        {itens.map((p, i) => (
          <article key={p.id}
            className="cartao grid gap-x-5 gap-y-2 !p-4 focus-within:ring-2 focus-within:ring-red/50 md:!p-5 md:grid-cols-[32px_minmax(0,1fr)_170px_40px] md:items-start">
            <span className="hidden pt-2 text-[13px] font-bold text-red md:block">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <input id={`nome-${p.id}`} className="campo font-medium md:!text-[16px]" value={p.nome} placeholder="Nome do produto"
                aria-label="Nome do produto" onChange={(e) => alterar(p.id, { nome: e.target.value })} />
              <textarea ref={ajustar} rows={1} value={p.descricao} placeholder="Descrição"
                aria-label={`Descrição de ${p.nome || "produto"}`}
                className="campo resize-none overflow-hidden leading-relaxed text-ink/80"
                onChange={(e) => { ajustar(e.target); alterar(p.id, { descricao: e.target.value }); }} />
            </div>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Preço (R$)</span>
              <input key={`preco-${p.id}`} inputMode="decimal" defaultValue={mostrar(p.ticket)} placeholder="0"
                className="campo text-right font-semibold tabular-nums md:!text-[16px]"
                onChange={(e) => alterar(p.id, { ticket: parseNum(e.target.value), ticket_ns: false })} />
            </label>
            <button type="button" onClick={() => apagar(p.id)} aria-label={`Remover ${p.nome || "produto"}`}
              className={armado === p.id ? "rounded-full bg-red px-3 py-1 text-[12px] font-semibold text-white" : "btn-icone text-lg"}>
              {armado === p.id ? "Remover?" : "×"}
            </button>
          </article>
        ))}

        <div>
          <button type="button" onClick={novo}
            className="btn-1 w-full sm:w-auto">
            + Adicionar produto
          </button>
        </div>
      </section>
    </main>
  );
}
