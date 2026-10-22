"use client";

import { useState } from "react";
import { adicionarSecao, removerSecao, salvarSecao } from "@/app/actions";
import { useAutosave } from "@/lib/useAutosave";
import type { Pagina, Secao, SecaoPatch } from "@/lib/types";
import StatusSalvo from "./StatusSalvo";

/** Textarea que cresce com o texto. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Lista de seções de texto editáveis de uma página (posicionamento ou linha editorial). */
export default function Secoes({ pagina, inicial }: { pagina: Pagina; inicial: Secao[] }) {
  const [secoes, setSecoes] = useState<Secao[]>(inicial);
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<SecaoPatch>(salvarSecao);

  function alterar(id: string, patch: SecaoPatch) {
    setSecoes((xs) => xs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    agendar(id, patch);
  }

  async function nova() {
    const ordem = Math.max(0, ...secoes.map((s) => s.ordem)) + 1;
    const r = await rodar(() => adicionarSecao(pagina, ordem));
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
    <section className="flex flex-col gap-4" aria-label="Seções editáveis">
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 text-[13px] text-muted backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <span>Tudo aqui é editável e salva sozinho.</span>
        <span className="ml-auto"><StatusSalvo status={status} /></span>
      </div>

      {secoes.length === 0 && (
        <div className="rounded-2xl border-[1.5px] border-dashed border-line p-6 text-[14px] text-muted">
          Nenhuma seção ainda. Use &ldquo;Adicionar seção&rdquo;.
        </div>
      )}

      {secoes.map((s, i) => (
        <article key={s.id}
          className="cartao flex flex-col gap-2 focus-within:ring-2 focus-within:ring-red/50">
          <div className="flex items-start gap-3">
            <span className="pt-2 text-[13px] font-bold text-red">{String(i + 1).padStart(2, "0")}</span>
            <input id={`titulo-${s.id}`} className="campo font-semibold md:!text-[18px]" value={s.titulo}
              placeholder="Título da seção" aria-label="Título da seção"
              onChange={(e) => alterar(s.id, { titulo: e.target.value })} />
            <button type="button" onClick={() => apagar(s.id)} aria-label={`Remover ${s.titulo || "seção"}`}
              className={armado === s.id ? "rounded-full bg-red px-3 py-1 text-[12px] font-semibold text-white" : "btn-icone text-lg"}>
              {armado === s.id ? "Remover?" : "×"}
            </button>
          </div>
          <textarea ref={ajustar} rows={2} value={s.conteudo} placeholder="Escreva aqui…"
            aria-label={`Conteúdo de ${s.titulo || "seção"}`}
            className="campo resize-none overflow-hidden whitespace-pre-wrap leading-relaxed"
            onChange={(e) => { ajustar(e.target); alterar(s.id, { conteudo: e.target.value }); }} />
        </article>
      ))}

      <div>
        <button type="button" onClick={nova}
          className="btn-2 w-full sm:w-auto">
          + Adicionar seção
        </button>
      </div>
    </section>
  );
}
