"use client";

import { useEffect, useState } from "react";
import { adicionarTarefa, removerTarefa, salvarTarefa } from "@/app/actions";
import { ordenar, prazoCurto } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import {
  ETIQUETAS, STATUS_TAREFA, type Etiqueta, type Pessoa, type StatusTarefa, type Tarefa, type TarefaPatch,
} from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

type Vista = "kanban" | "lista";

// Pílula da etiqueta: fundo, texto e bolinha
const ETIQUETA: Record<Etiqueta | "nenhuma", { fundo: string; ponto: string }> = {
  nenhuma: { fundo: "bg-[#efeceb] text-[#9a8e8c]", ponto: "bg-[#b3a7a5]" },
  nao_iniciado: { fundo: "bg-[#efeceb] text-[#4a4140]", ponto: "bg-[#6f6463]" },
  aguardando_revisao: { fundo: "bg-[#fdeee2] text-[#b4530f]", ponto: "bg-[#d9670f]" },
  concluido: { fundo: "bg-[#e6e3e2] text-ink", ponto: "bg-ink" },
  publicado: { fundo: "bg-red-soft text-red", ponto: "bg-red" },
};
// Cor do avatar pela ordem de cadastro: a primeira pessoa em preto, a segunda em vermelho
const AVATAR = ["bg-ink", "bg-red", "bg-[#6f6463]", "bg-red-deep"];
const NOME_STATUS = Object.fromEntries(STATUS_TAREFA.map((s) => [s.k, s.t])) as Record<StatusTarefa, string>;
const ORDEM: StatusTarefa[] = ["a_fazer", "fazendo", "feito"];
const SELECT = "appearance-none bg-transparent font-bold text-ink outline-none";
const SETA = (
  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
};

/** Campo que cresce com o texto, para títulos longos não ficarem cortados. */
function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function Tarefas({ inicial, pessoas }: { inicial: Tarefa[]; pessoas: Pessoa[] }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(inicial);
  const [vista, setVista] = useState<Vista>("kanban");
  const [fEtiqueta, setFEtiqueta] = useState<string>("todas");
  const [fPessoa, setFPessoa] = useState<string>("todos");
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [resp, setResp] = useState("");
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<TarefaPatch>(salvarTarefa);

  // Lembra a visualização escolhida neste navegador
  useEffect(() => {
    try { const v = localStorage.getItem("tarefas-vista"); if (v === "lista" || v === "kanban") setVista(v); } catch {}
  }, []);
  function trocarVista(v: Vista) {
    setVista(v);
    try { localStorage.setItem("tarefas-vista", v); } catch {}
  }

  const pessoa = (id: string | null) => pessoas.find((p) => p.id === id) ?? null;
  const corDe = (id: string) => AVATAR[Math.max(0, pessoas.findIndex((p) => p.id === id)) % AVATAR.length];

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
    const r = await rodar(() => adicionarTarefa(titulo, ordem, prazo || null, resp || null));
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

  const visiveis = tarefas.filter((t) =>
    (fEtiqueta === "todas" || (fEtiqueta === "sem" ? !t.etiqueta : t.etiqueta === fEtiqueta))
    && (fPessoa === "todos" || (fPessoa === "sem" ? !t.responsavel_id : t.responsavel_id === fPessoa)));
  const doStatus = (s: StatusTarefa) => {
    const xs = visiveis.filter((t) => t.status === s);
    return s === "feito" ? [...xs].sort((a, b) => b.ordem - a.ordem) : ordenar(xs);
  };
  const feitas = tarefas.filter((t) => t.status === "feito").length;

  // Partes usadas pelo kanban e pela lista. Funções de render, não componentes:
  // um componente criado aqui remontaria os campos a cada letra digitada.

  function titulo(t: Tarefa, grande: boolean) {
    return (
      <textarea ref={ajustar} rows={1} value={t.titulo} aria-label="Tarefa" placeholder="Tarefa sem nome"
        className={`w-full resize-none overflow-hidden rounded bg-transparent font-bold leading-snug tracking-tight outline-none focus:bg-bg ${
          grande ? "text-[18px]" : "text-[15px]"} ${t.status === "feito" ? "text-muted" : "text-ink"}`}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        onChange={(e) => { ajustar(e.target); alterar(t.id, { titulo: e.target.value.replace(/\n/g, " ") }); }} />
    );
  }

  function etiqueta(t: Tarefa) {
    const e = ETIQUETA[t.etiqueta ?? "nenhuma"];
    return (
      <label className={`relative inline-flex min-h-[32px] items-center gap-2 self-start rounded-full py-1 pl-3 pr-3.5 text-[13px] font-semibold ${e.fundo}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${e.ponto}`} />
        {t.etiqueta ? ETIQUETAS.find((x) => x.k === t.etiqueta)!.t : "+ Etiqueta"}
        <select value={t.etiqueta ?? ""} aria-label={`Etiqueta de ${t.titulo}`}
          onChange={(ev) => alterar(t.id, { etiqueta: (ev.target.value || null) as Etiqueta | null }, true)}
          className="absolute inset-0 cursor-pointer opacity-0">
          <option value="">Sem etiqueta</option>
          {ETIQUETAS.map((x) => <option key={x.k} value={x.k}>{x.t}</option>)}
        </select>
      </label>
    );
  }

  function avatar(t: Tarefa) {
    const p = pessoa(t.responsavel_id);
    return (
      <label className="relative shrink-0" title={p ? p.nome : "Escolher responsável"}>
        {p ? (
          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-extrabold text-white ${corDe(p.id)}`}>{iniciais(p.nome)}</span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#c9bfbd] text-[15px] text-[#9a8e8c]">+</span>
        )}
        <select value={t.responsavel_id ?? ""} aria-label={`Responsável por ${t.titulo}`}
          onChange={(e) => alterar(t.id, { responsavel_id: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer opacity-0">
          <option value="">Sem responsável</option>
          {pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </label>
    );
  }

  function prazoDe(t: Tarefa) {
    const r = prazoCurto(t.prazo, t.status === "feito");
    return (
      <label className="relative min-w-0 cursor-pointer">
        <span className={`text-[15px] font-bold ${r.tom === "atrasada" ? "text-red" : r.tom === "sem" ? "text-[#b3a7a5]" : "text-ink"}`}>{r.t}</span>
        <input type="date" value={t.prazo ?? ""} aria-label={`Prazo de ${t.titulo}`}
          onChange={(e) => alterar(t.id, { prazo: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    );
  }

  function remover(t: Tarefa, cls = "") {
    return armado === t.id ? (
      <button type="button" onClick={() => apagar(t.id)} className={`shrink-0 rounded-full bg-red px-3 py-1 text-[12px] font-bold text-white ${cls}`}>Remover?</button>
    ) : (
      <button type="button" onClick={() => apagar(t.id)} aria-label={`Remover ${t.titulo}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b3a7a5] hover:bg-bg hover:text-red ${cls}`}>
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    );
  }

  function cartao(t: Tarefa) {
    const i = ORDEM.indexOf(t.status);
    const antes = ORDEM[i - 1];
    const depois = ORDEM[i + 1];
    return (
      <article key={t.id}
        className="flex flex-col gap-3 rounded-2xl bg-paper p-5 shadow-[0_1px_2px_rgba(13,10,10,0.06),0_1px_8px_rgba(13,10,10,0.04)] focus-within:ring-2 focus-within:ring-red/60">
        <div className="flex items-start justify-between gap-2">
          {etiqueta(t)}
          {remover(t, "-mr-2 -mt-1")}
        </div>
        {titulo(t, true)}
        <div className="flex items-center gap-3">
          {avatar(t)}
          <div className="min-w-0 flex-1">{prazoDe(t)}</div>
          <div className="flex shrink-0 gap-2">
            {antes && (
              <button type="button" onClick={() => mover(t.id, antes)} aria-label={`Mover para ${NOME_STATUS[antes]}`}
                className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-line text-[18px] hover:border-ink">←</button>
            )}
            {depois && (
              <button type="button" onClick={() => mover(t.id, depois)} aria-label={`Mover para ${NOME_STATUS[depois]}`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[18px] text-white hover:bg-red">→</button>
            )}
          </div>
        </div>
      </article>
    );
  }

  function linha(t: Tarefa) {
    const feito = t.status === "feito";
    return (
      <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-paper px-4 py-3 shadow-[0_1px_2px_rgba(13,10,10,0.06)] focus-within:ring-2 focus-within:ring-red/60">
        <button type="button" role="checkbox" aria-checked={feito}
          aria-label={feito ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`}
          onClick={() => mover(t.id, feito ? "a_fazer" : "feito")}
          className="flex h-11 w-11 shrink-0 items-center justify-center">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[12px] font-black ${
            feito ? "border-ink bg-ink text-white" : "border-line hover:border-red"}`}>{feito ? "✓" : ""}</span>
        </button>
        <div className="min-w-0 flex-[1_1_240px]">{titulo(t, false)}</div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <select value={t.status} aria-label={`Status de ${t.titulo}`} onChange={(e) => mover(t.id, e.target.value as StatusTarefa)}
              className="min-h-[32px] appearance-none rounded-full border-[1.5px] border-line bg-paper pl-3 pr-8 text-[13px] font-bold outline-none focus:border-ink">
              {STATUS_TAREFA.map((s) => <option key={s.k} value={s.k}>{s.t}</option>)}
            </select>
            <svg aria-hidden width="10" height="10" viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </label>
          {etiqueta(t)}
          {avatar(t)}
          <div className="min-w-[96px]">{prazoDe(t)}</div>
          {remover(t)}
        </div>
      </li>
    );
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Tarefas" titulo={<>O que falta <span className="text-red">fazer</span></>}
        texto="Escreva e aperte Enter para criar. Use as setas para mover. Tudo salva sozinho."
        acoes={
          <div role="group" aria-label="Visualização" className="flex border-[1.5px] border-ink">
            {(["kanban", "lista"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => trocarVista(v)}
                className={`min-h-[44px] px-5 text-[15px] font-bold ${vista === v ? "bg-ink text-white" : "bg-paper hover:bg-bg"}`}>
                {v === "kanban" ? "Kanban" : "Lista"}
              </button>
            ))}
          </div>
        } />

      <section className="flex flex-col gap-5" aria-label="Tarefas">
        <div className="flex items-center gap-4 text-[15px] text-muted">
          <span className="shrink-0">{feitas} de {tarefas.length} feitas</span>
          <div className="h-1.5 w-full max-w-[260px] rounded-full bg-line">
            <div className="anima h-full rounded-full bg-red" style={{ width: `${tarefas.length ? (feitas / tarefas.length) * 100 : 0}%` }} />
          </div>
          <span className="ml-auto"><StatusSalvo status={status} /></span>
        </div>

        <form onSubmit={nova} className="flex flex-col gap-3 sm:flex-row">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova tarefa" aria-label="Nova tarefa"
            className="min-h-[56px] flex-1 rounded-lg border-[1.5px] border-line bg-paper px-5 text-[17px] outline-none placeholder:text-[#9a8e8c] focus:border-ink" />
          <label className="relative">
            <select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsável da nova tarefa"
              className={`min-h-[56px] w-full appearance-none rounded-lg border-[1.5px] border-line bg-paper pl-5 pr-11 text-[16px] outline-none focus:border-ink sm:w-auto`}>
              <option value="">Sem responsável</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {SETA}
          </label>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo da nova tarefa"
            className="min-h-[56px] rounded-lg border-[1.5px] border-line bg-paper px-5 text-[16px] outline-none focus:border-ink" />
          <button type="submit" className="min-h-[56px] rounded-lg bg-red px-7 text-[17px] font-bold text-white hover:brightness-110">
            + Adicionar
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          <label className="relative flex min-h-[52px] min-w-[240px] items-center gap-4 rounded-full border-[1.5px] border-line bg-paper pl-6 pr-12 text-[15px] focus-within:border-ink">
            <span className="text-muted">Etiqueta</span>
            <select value={fEtiqueta} onChange={(e) => setFEtiqueta(e.target.value)} aria-label="Filtrar por etiqueta" className={`${SELECT} flex-1 text-[16px]`}>
              <option value="todas">Todas</option>
              {ETIQUETAS.map((e) => <option key={e.k} value={e.k}>{e.t}</option>)}
              <option value="sem">Sem etiqueta</option>
            </select>
            {SETA}
          </label>
          <label className="relative flex min-h-[52px] min-w-[240px] items-center gap-4 rounded-full border-[1.5px] border-line bg-paper pl-6 pr-12 text-[15px] focus-within:border-ink">
            <span className="text-muted">Responsável</span>
            <select value={fPessoa} onChange={(e) => setFPessoa(e.target.value)} aria-label="Filtrar por responsável" className={`${SELECT} flex-1 text-[16px]`}>
              <option value="todos">Todos</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              <option value="sem">Sem responsável</option>
            </select>
            {SETA}
          </label>
        </div>

        {vista === "kanban" ? (
          <div className="grid items-start gap-5 md:grid-cols-3">
            {ORDEM.map((s) => {
              const xs = doStatus(s);
              return (
                <section key={s} aria-label={NOME_STATUS[s]} className="flex flex-col gap-3 rounded-3xl border border-line-soft bg-[#efebe9] p-3">
                  <div className="flex items-center justify-between px-3 pt-2">
                    <h2 className="text-[17px] font-bold">{NOME_STATUS[s]}</h2>
                    <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[14px] font-bold text-white ${s === "feito" ? "bg-red" : "bg-ink"}`}>
                      {xs.length}
                    </span>
                  </div>
                  {xs.map(cartao)}
                  {xs.length === 0 && <p className="rounded-2xl border-[1.5px] border-dashed border-line p-5 text-center text-[14px] text-muted">Nada aqui</p>}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {ORDEM.map((s) => {
              const xs = doStatus(s);
              return (
                <section key={s} aria-labelledby={`t-${s}`} className="flex flex-col gap-2">
                  <h2 id={`t-${s}`} className="flex items-center gap-3 text-[20px] font-bold tracking-tight">
                    {NOME_STATUS[s]}
                    <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-bold text-white ${s === "feito" ? "bg-red" : "bg-ink"}`}>{xs.length}</span>
                  </h2>
                  {xs.length === 0
                    ? <p className="rounded-2xl border-[1.5px] border-dashed border-line p-4 text-sm text-muted">Nada aqui.</p>
                    : <ul className="flex flex-col gap-2">{xs.map(linha)}</ul>}
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
