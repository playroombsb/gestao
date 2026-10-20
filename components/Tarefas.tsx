"use client";

import { useEffect, useState } from "react";
import { adicionarTarefa, removerTarefa, salvarTarefa } from "@/app/actions";
import { TOM_PRAZO, ordenar, rotuloPrazo } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import { ETIQUETAS, STATUS_TAREFA, type Etiqueta, type StatusTarefa, type Tarefa, type TarefaPatch } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

type Vista = "kanban" | "lista";

const COR_ETIQUETA: Record<Etiqueta, string> = {
  nao_iniciado: "border-line text-muted",
  aguardando_revisao: "border-red-soft bg-red-soft text-red-deep",
  concluido: "border-ink bg-ink text-white",
  publicado: "border-red bg-red text-white",
};
const COR_COLUNA: Record<StatusTarefa, string> = { a_fazer: "border-line", fazendo: "border-ink", feito: "border-red" };
const NOME_STATUS = Object.fromEntries(STATUS_TAREFA.map((s) => [s.k, s.t])) as Record<StatusTarefa, string>;
const ORDEM: StatusTarefa[] = ["a_fazer", "fazendo", "feito"];

/** Campo que cresce com o texto, para títulos longos não ficarem cortados. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function Tarefas({ inicial }: { inicial: Tarefa[] }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(inicial);
  const [vista, setVista] = useState<Vista>("kanban");
  const [filtro, setFiltro] = useState<Etiqueta | "todas" | "sem">("todas");
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [armado, setArmado] = useState<string | null>(null);
  const [sobre, setSobre] = useState<StatusTarefa | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<TarefaPatch>(salvarTarefa);

  // Lembra a visualização escolhida neste navegador
  useEffect(() => {
    try { const v = localStorage.getItem("tarefas-vista"); if (v === "lista" || v === "kanban") setVista(v); } catch {}
  }, []);
  function trocarVista(v: Vista) {
    setVista(v);
    try { localStorage.setItem("tarefas-vista", v); } catch {}
  }

  function alterar(id: string, patch: TarefaPatch, imediato = false) {
    setTarefas((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    agendar(id, patch, imediato);
  }
  const mover = (id: string, s: StatusTarefa) => alterar(id, { status: s }, true);

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

  const visiveis = tarefas.filter((t) => filtro === "todas" || (filtro === "sem" ? !t.etiqueta : t.etiqueta === filtro));
  const doStatus = (s: StatusTarefa) => {
    const xs = visiveis.filter((t) => t.status === s);
    return s === "feito" ? [...xs].sort((a, b) => b.ordem - a.ordem) : ordenar(xs);
  };
  const feitas = tarefas.filter((t) => t.status === "feito").length;

  // Partes usadas pelo kanban e pela lista. Funções de render, não componentes:
  // um componente criado aqui remontaria os campos a cada letra digitada.

  function titulo(t: Tarefa) {
    return (
      <textarea ref={ajustar} rows={1} value={t.titulo} aria-label="Tarefa" placeholder="Tarefa sem nome"
        className={`campo resize-none overflow-hidden border-transparent leading-snug ${t.status === "feito" ? "text-muted line-through" : "font-semibold"}`}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        onChange={(e) => { ajustar(e.target); alterar(t.id, { titulo: e.target.value.replace(/\n/g, " ") }); }} />
    );
  }

  function campoPrazo(t: Tarefa) {
    const r = rotuloPrazo(t.prazo);
    return (
      <label className="relative flex shrink-0 cursor-pointer items-center text-[12px]">
        <span className={TOM_PRAZO[t.status === "feito" && r.tom === "atrasada" ? "normal" : r.tom]}>{r.t}</span>
        <input type="date" value={t.prazo ?? ""} aria-label={`Prazo de ${t.titulo}`}
          onChange={(e) => alterar(t.id, { prazo: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    );
  }

  function campoEtiqueta(t: Tarefa) {
    return (
      <select value={t.etiqueta ?? ""} aria-label={`Etiqueta de ${t.titulo}`}
        onChange={(e) => alterar(t.id, { etiqueta: (e.target.value || null) as Etiqueta | null }, true)}
        className={`min-h-[30px] max-w-full border-[1.5px] px-1.5 text-[11px] font-bold uppercase tracking-wide outline-none focus:outline-2 focus:outline-red ${
          t.etiqueta ? COR_ETIQUETA[t.etiqueta] : "border-dashed border-line bg-paper text-muted"}`}>
        <option value="">+ etiqueta</option>
        {ETIQUETAS.map((e) => <option key={e.k} value={e.k}>{e.t}</option>)}
      </select>
    );
  }

  function botaoRemover(t: Tarefa) {
    return (
      <button type="button" onClick={() => apagar(t.id)} aria-label={`Remover ${t.titulo}`}
        className={`h-9 shrink-0 border-[1.5px] ${armado === t.id
          ? "border-red bg-red px-2 text-[11px] font-bold text-white"
          : "w-9 border-transparent text-lg text-muted hover:border-red hover:text-red"}`}>
        {armado === t.id ? "Remover?" : "×"}
      </button>
    );
  }

  function cartao(t: Tarefa) {
    const i = ORDEM.indexOf(t.status);
    return (
      <article key={t.id}
        className={`flex flex-col gap-2 border border-line bg-paper p-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-red ${
          t.status === "feito" ? "opacity-75" : ""}`}>
        <div className="flex items-start gap-1">
          <span draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}
            title="Arraste para outra coluna" aria-hidden
            className="mt-1 hidden cursor-grab select-none px-0.5 text-[14px] leading-none text-[#b3a7a5] hover:text-ink md:block">⠿</span>
          {titulo(t)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {campoEtiqueta(t)}
          {campoPrazo(t)}
        </div>
        <div className="flex items-center justify-between gap-1 border-t border-line-soft pt-1.5">
          <div className="flex gap-1">
            {i > 0 && (
              <button type="button" onClick={() => mover(t.id, ORDEM[i - 1])} aria-label={`Mover para ${NOME_STATUS[ORDEM[i - 1]]}`}
                className="min-h-[36px] px-2 text-[12px] font-bold text-muted hover:text-ink">← {NOME_STATUS[ORDEM[i - 1]]}</button>
            )}
            {i < ORDEM.length - 1 && (
              <button type="button" onClick={() => mover(t.id, ORDEM[i + 1])} aria-label={`Mover para ${NOME_STATUS[ORDEM[i + 1]]}`}
                className="min-h-[36px] px-2 text-[12px] font-bold hover:text-red">{NOME_STATUS[ORDEM[i + 1]]} →</button>
            )}
          </div>
          {botaoRemover(t)}
        </div>
      </article>
    );
  }

  function linha(t: Tarefa) {
    const feito = t.status === "feito";
    return (
      <li key={t.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-line border-l-4 bg-paper px-3 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-red ${
        feito ? "border-l-line-soft" : t.status === "fazendo" ? "border-l-ink" : "border-l-red"}`}>
        <button type="button" role="checkbox" aria-checked={feito}
          aria-label={feito ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`}
          onClick={() => mover(t.id, feito ? "a_fazer" : "feito")}
          className="flex h-11 w-11 shrink-0 items-center justify-center md:h-9 md:w-9">
          <span className={`flex h-5 w-5 items-center justify-center border-2 text-[13px] font-black ${
            feito ? "border-ink bg-ink text-white" : "border-line hover:border-red"}`}>{feito ? "✓" : ""}</span>
        </button>
        <div className="min-w-0 flex-[1_1_240px]">{titulo(t)}</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={t.status} aria-label={`Status de ${t.titulo}`} onChange={(e) => mover(t.id, e.target.value as StatusTarefa)}
            className="min-h-[30px] border-[1.5px] border-ink bg-paper px-1.5 text-[12px] font-bold outline-none focus:outline-2 focus:outline-red">
            {STATUS_TAREFA.map((s) => <option key={s.k} value={s.k}>{s.t}</option>)}
          </select>
          {campoEtiqueta(t)}
          {campoPrazo(t)}
          {botaoRemover(t)}
        </div>
      </li>
    );
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Tarefas" titulo={<>O que falta <span className="text-red">fazer</span></>}
        texto="Escreva e aperte Enter para criar. Arraste entre colunas ou use as setas. Tudo salva sozinho."
        acoes={
          <div role="group" aria-label="Visualização" className="flex border-[1.5px] border-ink">
            {(["kanban", "lista"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => trocarVista(v)}
                className={`min-h-[40px] px-4 text-[13px] font-bold ${vista === v ? "bg-ink text-white" : "bg-paper hover:bg-bg"}`}>
                {v === "kanban" ? "Kanban" : "Lista"}
              </button>
            ))}
          </div>
        } />

      <section className="flex flex-col gap-4" aria-label="Tarefas">
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2.5 text-[13px] text-muted backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <span className="shrink-0">{feitas} de {tarefas.length} feitas</span>
          <div className="h-1 max-w-[240px] flex-1 bg-line">
            <div className="anima h-full bg-red" style={{ width: `${tarefas.length ? (feitas / tarefas.length) * 100 : 0}%` }} />
          </div>
          <span className="ml-auto"><StatusSalvo status={status} /></span>
        </div>

        <form onSubmit={nova} className="flex flex-col gap-2.5 sm:flex-row">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova tarefa" aria-label="Nova tarefa"
            className="min-h-[48px] flex-1 border-[1.5px] border-line bg-paper px-3.5 font-semibold outline-none placeholder:font-normal placeholder:text-[#b3a7a5] focus:border-red" />
          <label className="flex min-h-[48px] items-center gap-2 border-[1.5px] border-line bg-paper px-3 text-[13px] text-muted focus-within:border-red">
            Prazo
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="bg-transparent font-semibold text-ink outline-none" />
          </label>
          <button type="submit" className="min-h-[48px] border-2 border-red bg-red px-[18px] text-[13px] font-bold tracking-wide text-white hover:brightness-110">
            + Adicionar
          </button>
        </form>

        <div role="group" aria-label="Filtrar por etiqueta" className="flex flex-wrap gap-1.5">
          {([["todas", "Todas"], ...ETIQUETAS.map((e) => [e.k, e.t]), ["sem", "Sem etiqueta"]] as [typeof filtro, string][]).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}
              className={`min-h-[36px] border-[1.5px] px-3 text-[12px] font-bold ${filtro === k ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-ink"}`}>
              {t}
            </button>
          ))}
        </div>

        {vista === "kanban" ? (
          <div className="grid items-start gap-4 md:grid-cols-3">
            {ORDEM.map((s) => {
              const xs = doStatus(s);
              return (
                <section key={s} aria-label={NOME_STATUS[s]}
                  onDragOver={(e) => { e.preventDefault(); setSobre(s); }}
                  onDragLeave={() => setSobre((x) => (x === s ? null : x))}
                  onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData("text/plain"); if (id) mover(id, s); }}
                  className={`flex min-h-[120px] flex-col gap-2 p-1 transition-colors ${sobre === s ? "bg-red-soft" : ""}`}>
                  <div className={`flex items-baseline justify-between border-t-[3px] ${COR_COLUNA[s]} pt-2`}>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em]">{NOME_STATUS[s]}</h2>
                    <span className="text-[12px] text-muted">{xs.length}</span>
                  </div>
                  {xs.map(cartao)}
                  {xs.length === 0 && <div className="border-[1.5px] border-dashed border-line p-4 text-[12px] text-muted">vazio</div>}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {ORDEM.map((s) => {
              const xs = doStatus(s);
              return (
                <section key={s} aria-labelledby={`t-${s}`} className="flex flex-col gap-1.5">
                  <h2 id={`t-${s}`} className="flex items-baseline gap-2 text-[20px] font-bold tracking-tight">
                    {NOME_STATUS[s]} <span className="text-[13px] font-semibold text-muted">{xs.length}</span>
                  </h2>
                  {xs.length === 0
                    ? <div className="border-[1.5px] border-dashed border-line p-4 text-sm text-muted">Nada aqui.</div>
                    : <ul className="flex flex-col gap-1.5">{xs.map(linha)}</ul>}
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
