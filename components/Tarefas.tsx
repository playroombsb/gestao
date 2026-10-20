"use client";

import { useState } from "react";
import { adicionarTarefa, removerTarefa, salvarTarefa } from "@/app/actions";
import { TOM_PRAZO, ordenar, rotuloPrazo } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import type { Tarefa, TarefaPatch } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

/** Campo que cresce com o texto, para títulos longos não ficarem cortados. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function Tarefas({ inicial }: { inicial: Tarefa[] }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(inicial);
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<TarefaPatch>(salvarTarefa);

  function alterar(id: string, patch: TarefaPatch, imediato = false) {
    setTarefas((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    agendar(id, patch, imediato);
  }

  async function nova(e: React.FormEvent) {
    e.preventDefault();
    const titulo = texto.trim();
    if (!titulo) return;
    const ordem = Math.max(0, ...tarefas.map((t) => t.ordem)) + 1;
    const r = await rodar(() => adicionarTarefa(titulo, ordem, prazo || null));
    if (!r.ok) return;
    setTarefas((xs) => [...xs, r.data]);
    setTexto("");
    setPrazo("");
  }

  async function apagar(id: string) {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    esquecer(id);
    setTarefas((xs) => xs.filter((t) => t.id !== id));
    await rodar(() => removerTarefa(id));
  }

  const abertas = ordenar(tarefas.filter((t) => !t.feita));
  const feitas = tarefas.filter((t) => t.feita);

  // Rótulo do prazo; clicar abre o seletor de data por cima dele.
  function campoPrazo(t: Tarefa) {
    const r = rotuloPrazo(t.prazo);
    return (
      <label className="relative flex shrink-0 cursor-pointer items-center text-[12px]">
        <span className={TOM_PRAZO[r.tom]}>{r.t}</span>
        <input type="date" value={t.prazo ?? ""} aria-label={`Prazo de ${t.titulo}`}
          onChange={(e) => alterar(t.id, { prazo: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    );
  }

  // Função de render, não componente: um componente criado aqui remontaria o input a cada letra.
  function linha(t: Tarefa) {
    return (
      <li key={t.id} className={`flex items-center gap-3 border border-line border-l-4 bg-paper px-3 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-red ${
        t.feita ? "border-l-line-soft" : "border-l-red"}`}>
        <button type="button" role="checkbox" aria-checked={t.feita}
          aria-label={t.feita ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`}
          onClick={() => alterar(t.id, { feita: !t.feita }, true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center md:h-9 md:w-9">
          <span className={`flex h-5 w-5 items-center justify-center border-2 text-[13px] font-black ${
            t.feita ? "border-ink bg-ink text-white" : "border-line hover:border-red"}`}>
            {t.feita ? "✓" : ""}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <textarea ref={ajustar} rows={1} value={t.titulo} aria-label="Tarefa" placeholder="Tarefa sem nome"
            className={`campo resize-none overflow-hidden border-transparent leading-snug ${t.feita ? "text-muted line-through" : "font-semibold"}`}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            onChange={(e) => { ajustar(e.target); alterar(t.id, { titulo: e.target.value.replace(/\n/g, " ") }); }} />
          {!t.feita && campoPrazo(t)}
        </div>
        <button type="button" onClick={() => apagar(t.id)} aria-label={`Remover ${t.titulo}`}
          className={`h-11 shrink-0 border-[1.5px] md:h-8 ${armado === t.id
            ? "border-red bg-red px-2.5 text-[12px] font-bold text-white md:px-1.5 md:text-[11px]"
            : "w-11 border-transparent text-xl text-muted hover:border-red hover:text-red md:w-8 md:text-lg"}`}>
          {armado === t.id ? "Remover?" : "×"}
        </button>
      </li>
    );
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Tarefas" titulo={<>O que falta <span className="text-red">fazer</span></>}
        texto="Escreva e aperte Enter para criar. Clique no prazo para mudar a data. Tudo salva sozinho." />

      <section className="flex flex-col gap-4" aria-labelledby="t-abertas">
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 text-[13px] text-muted backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <span className="shrink-0">{feitas.length} de {tarefas.length} feitas</span>
          <div className="h-1 max-w-[240px] flex-1 bg-line">
            <div className="anima h-full bg-red" style={{ width: `${tarefas.length ? (feitas.length / tarefas.length) * 100 : 0}%` }} />
          </div>
          <span className="ml-auto"><StatusSalvo status={status} /></span>
        </div>

        <form onSubmit={nova} className="flex flex-col gap-2.5 sm:flex-row">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova tarefa"
            aria-label="Nova tarefa"
            className="min-h-[48px] flex-1 border-[1.5px] border-line bg-paper px-3.5 font-semibold outline-none placeholder:font-normal placeholder:text-[#b3a7a5] focus:border-red" />
          <label className="flex min-h-[48px] items-center gap-2 border-[1.5px] border-line bg-paper px-3 text-[13px] text-muted focus-within:border-red">
            Prazo
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
              className="bg-transparent font-semibold text-ink outline-none" />
          </label>
          <button type="submit"
            className="min-h-[48px] border-2 border-red bg-red px-[18px] text-[13px] font-bold tracking-wide text-white hover:brightness-110">
            + Adicionar
          </button>
        </form>

        <h2 id="t-abertas" className="pt-2 text-[22px] font-bold tracking-tight">A fazer</h2>
        {abertas.length === 0 ? (
          <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
            {tarefas.length ? "Nada em aberto." : "Nenhuma tarefa ainda. Escreva a primeira acima."}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">{abertas.map(linha)}</ul>
        )}

        {feitas.length > 0 && (
          <>
            <h2 className="pt-4 text-[22px] font-bold tracking-tight">Feitas</h2>
            <ul className="flex flex-col gap-1.5">{feitas.map(linha)}</ul>
          </>
        )}
      </section>
    </main>
  );
}
