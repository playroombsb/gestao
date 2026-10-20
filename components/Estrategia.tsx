"use client";

import { useState } from "react";
import { adicionarSecao, removerSecao, salvarSecao } from "@/app/actions";
import { useAutosave } from "@/lib/useAutosave";
import type { Secao, SecaoPatch } from "@/lib/types";
import StatusSalvo from "./StatusSalvo";

/** Textarea que cresce com o texto. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function Estrategia({ inicial }: { inicial: Secao[] }) {
  const [secoes, setSecoes] = useState<Secao[]>(inicial);
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<SecaoPatch>(salvarSecao);

  function alterar(id: string, patch: SecaoPatch) {
    setSecoes((xs) => xs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    agendar(id, patch);
  }

  async function nova() {
    const ordem = Math.max(0, ...secoes.map((s) => s.ordem)) + 1;
    const r = await rodar(() => adicionarSecao(ordem));
    if (!r.ok) return;
    setSecoes((xs) => [...xs, r.data]);
    setTimeout(() => document.getElementById(`titulo-${r.data.id}`)?.focus(), 30);
  }

  async function apagar(id: string) {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    esquecer(id);
    setSecoes((xs) => xs.filter((s) => s.id !== id));
    await rodar(() => removerSecao(id));
  }

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-9 px-4 pb-16 pt-6 md:gap-11 md:px-5 md:pt-8">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-6 md:pb-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM · Playroom · Estratégia</p>
        <h1 className="text-balance text-[clamp(36px,7vw,62px)] font-extrabold leading-none tracking-[-0.035em]">
          Quem a casa <span className="text-red">é</span>
        </h1>
        <p className="text-base text-ink/80">
          Arquétipo, posicionamento, cliente ideal e o que mais for decidido. Tudo aqui é editável e salva sozinho.
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-label="Seções da estratégia">
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 text-[13px] text-muted backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <span>{secoes.length} {secoes.length === 1 ? "seção" : "seções"}</span>
          <span className="ml-auto"><StatusSalvo status={status} /></span>
        </div>

        {secoes.length === 0 && (
          <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
            Nenhuma seção ainda. Use &ldquo;Adicionar seção&rdquo;.
          </div>
        )}

        {secoes.map((s, i) => (
          <article key={s.id}
            className="flex flex-col gap-3 border border-line border-l-4 border-l-red bg-paper px-4 py-4 focus-within:outline focus-within:outline-2 focus-within:outline-red md:px-6 md:py-5">
            <div className="flex items-start gap-3">
              <span className="pt-2.5 text-[13px] font-extrabold text-red">{String(i + 1).padStart(2, "0")}</span>
              <input id={`titulo-${s.id}`} className="campo text-[22px] font-bold tracking-tight" value={s.titulo}
                placeholder="Título da seção" aria-label="Título da seção"
                onChange={(e) => alterar(s.id, { titulo: e.target.value })} />
              <button type="button" onClick={() => apagar(s.id)} aria-label={`Remover ${s.titulo || "seção"}`}
                className={`h-11 shrink-0 border-[1.5px] md:h-9 ${armado === s.id
                  ? "border-red bg-red px-2.5 text-[12px] font-bold text-white"
                  : "w-11 border-transparent text-xl text-muted hover:border-red hover:text-red md:w-9"}`}>
                {armado === s.id ? "Remover?" : "×"}
              </button>
            </div>
            <textarea ref={ajustar} rows={3} value={s.conteudo} placeholder="Escreva aqui…"
              aria-label={`Conteúdo de ${s.titulo || "seção"}`}
              className="campo resize-none overflow-hidden whitespace-pre-wrap text-[15px] leading-relaxed"
              onChange={(e) => { ajustar(e.target); alterar(s.id, { conteudo: e.target.value }); }} />
          </article>
        ))}

        <div>
          <button type="button" onClick={nova}
            className="min-h-[48px] w-full border-2 border-red bg-red px-[18px] py-[11px] text-[13px] font-bold tracking-wide text-white hover:brightness-110 sm:min-h-0 sm:w-auto">
            + Adicionar seção
          </button>
        </div>
      </section>
    </main>
  );
}
