"use client";

import { useEffect, useState } from "react";
import { adicionarTarefa, removerTarefa, salvarTarefa } from "@/app/actions";
import { ajustar } from "@/lib/ajustar";
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
  nenhuma: { fundo: "bg-[#efeceb] text-apagado", ponto: "bg-apagado" },
  nao_iniciado: { fundo: "bg-[#efeceb] text-[#4a4140]", ponto: "bg-[#6f6463]" },
  aguardando_revisao: { fundo: "bg-[#fdeee2] text-[#a34a0c]", ponto: "bg-[#d9670f]" },
  concluido: { fundo: "bg-[#e6e3e2] text-ink", ponto: "bg-ink" },
  publicado: { fundo: "bg-red-soft text-red", ponto: "bg-red" },
};
// Cor do avatar pela ordem de cadastro: a primeira pessoa em preto, a segunda em vermelho
const AVATAR = ["bg-ink", "bg-red", "bg-[#6f6463]", "bg-red-deep"];
const NOME_STATUS = Object.fromEntries(STATUS_TAREFA.map((s) => [s.k, s.t])) as Record<StatusTarefa, string>;
const ORDEM: StatusTarefa[] = ["a_fazer", "fazendo", "feito"];
const SOMBRA = "shadow-[0_1px_2px_rgba(13,10,10,0.06),0_1px_8px_rgba(13,10,10,0.04)]";
const SETA = (
  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
};

export default function Tarefas({ inicial, pessoas }: { inicial: Tarefa[]; pessoas: Pessoa[] }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(inicial);
  const [vista, setVista] = useState<Vista>("kanban");
  const [coluna, setColuna] = useState<StatusTarefa>("a_fazer"); // coluna visível no celular e no tablet
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
    setColuna("a_fazer");
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

  function titulo(t: Tarefa) {
    return (
      <textarea ref={ajustar} rows={1} value={t.titulo} aria-label="Tarefa" placeholder="Tarefa sem nome"
        className={`w-full resize-none overflow-hidden rounded bg-transparent text-base font-medium leading-snug outline-none focus:bg-bg md:text-[15px] ${
          t.status === "feito" ? "text-muted" : "text-ink"}`}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        onChange={(e) => { ajustar(e.target); alterar(t.id, { titulo: e.target.value.replace(/\n/g, " ") }); }} />
    );
  }

  function etiqueta(t: Tarefa) {
    const e = ETIQUETA[t.etiqueta ?? "nenhuma"];
    return (
      <label className={`relative inline-flex min-h-[28px] items-center gap-1.5 self-start rounded-full px-2.5 text-[12px] font-medium toque:min-h-[32px] ${e.fundo}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${e.ponto}`} />
        {t.etiqueta ? ETIQUETAS.find((x) => x.k === t.etiqueta)!.t : "Etiqueta"}
        <select value={t.etiqueta ?? ""} aria-label={`Etiqueta de ${t.titulo}`}
          onChange={(ev) => alterar(t.id, { etiqueta: (ev.target.value || null) as Etiqueta | null }, true)}
          className="absolute inset-0 cursor-pointer text-base opacity-0">
          <option value="">Sem etiqueta</option>
          {ETIQUETAS.map((x) => <option key={x.k} value={x.k}>{x.t}</option>)}
        </select>
      </label>
    );
  }

  function avatar(t: Tarefa) {
    const p = pessoa(t.responsavel_id);
    return (
      <label className="relative flex h-9 w-9 shrink-0 items-center justify-center toque:h-11 toque:w-11" title={p ? p.nome : "Escolher responsável"}>
        {p ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${corDe(p.id)}`}>{iniciais(p.nome)}</span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#c9bfbd] text-[14px] text-apagado">+</span>
        )}
        <select value={t.responsavel_id ?? ""} aria-label={`Responsável por ${t.titulo}`}
          onChange={(e) => alterar(t.id, { responsavel_id: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer text-base opacity-0">
          <option value="">Sem responsável</option>
          {pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </label>
    );
  }

  function prazoDe(t: Tarefa) {
    const r = prazoCurto(t.prazo, t.status === "feito");
    return (
      <label className="relative flex min-h-[36px] min-w-0 cursor-pointer items-center toque:min-h-[44px]">
        <span className={`text-[13px] font-medium ${r.tom === "atrasada" ? "text-red" : r.tom === "sem" ? "text-apagado" : "text-ink"}`}>{r.t}</span>
        <input type="date" value={t.prazo ?? ""} aria-label={`Prazo de ${t.titulo}`}
          onChange={(e) => alterar(t.id, { prazo: e.target.value || null }, true)}
          className="absolute inset-0 cursor-pointer text-base opacity-0" />
      </label>
    );
  }

  function remover(t: Tarefa, cls = "") {
    return armado === t.id ? (
      <button type="button" onClick={() => apagar(t.id)} className={`shrink-0 rounded-full bg-red px-3 py-1 text-[12px] font-semibold text-white ${cls}`}>Remover?</button>
    ) : (
      <button type="button" onClick={() => apagar(t.id)} aria-label={`Remover ${t.titulo}`} className={`btn-icone ${cls}`}>
        <svg aria-hidden width="12" height="12" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    );
  }

  function setas(t: Tarefa) {
    const i = ORDEM.indexOf(t.status);
    const antes = ORDEM[i - 1];
    const depois = ORDEM[i + 1];
    const base = "flex h-9 w-9 items-center justify-center rounded-full text-[15px] toque:h-11 toque:w-11";
    return (
      <div className="flex shrink-0 gap-1.5">
        {antes && (
          <button type="button" onClick={() => mover(t.id, antes)} aria-label={`Mover para ${NOME_STATUS[antes]}`}
            className={`${base} border-[1.5px] border-line hover:border-ink`}>←</button>
        )}
        {depois && (
          <button type="button" onClick={() => mover(t.id, depois)} aria-label={`Mover para ${NOME_STATUS[depois]}`}
            className={`${base} bg-ink text-white hover:bg-red`}>→</button>
        )}
      </div>
    );
  }

  function cartao(t: Tarefa) {
    return (
      <article key={t.id} className={`flex flex-col gap-2 rounded-2xl bg-paper p-4 ${SOMBRA} focus-within:ring-2 focus-within:ring-red/50`}>
        <div className="flex items-start justify-between gap-2">
          {etiqueta(t)}
          {remover(t, "-mr-2 -mt-1.5")}
        </div>
        {titulo(t)}
        <div className="flex items-center gap-2">
          {avatar(t)}
          <div className="min-w-0 flex-1">{prazoDe(t)}</div>
          {setas(t)}
        </div>
      </article>
    );
  }

  function linha(t: Tarefa) {
    const feito = t.status === "feito";
    return (
      <li key={t.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-paper px-3 py-2 ${SOMBRA} focus-within:ring-2 focus-within:ring-red/50`}>
        <button type="button" role="checkbox" aria-checked={feito}
          aria-label={feito ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`}
          onClick={() => mover(t.id, feito ? "a_fazer" : "feito")}
          className="flex h-9 w-9 shrink-0 items-center justify-center toque:h-11 toque:w-11">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] font-black ${
            feito ? "border-ink bg-ink text-white" : "border-line hover:border-red"}`}>{feito ? "✓" : ""}</span>
        </button>
        <div className="min-w-0 flex-[1_1_240px]">{titulo(t)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <select value={t.status} aria-label={`Status de ${t.titulo}`} onChange={(e) => mover(t.id, e.target.value as StatusTarefa)}
              className="min-h-[28px] appearance-none rounded-full border-[1.5px] border-line bg-paper pl-3 pr-8 text-base font-medium outline-none focus:border-ink md:text-[12px] toque:min-h-[32px]">
              {STATUS_TAREFA.map((s) => <option key={s.k} value={s.k}>{s.t}</option>)}
            </select>
            {SETA}
          </label>
          {etiqueta(t)}
          {avatar(t)}
          <div className="min-w-[90px]">{prazoDe(t)}</div>
          {remover(t)}
        </div>
      </li>
    );
  }

  const contagem = (s: StatusTarefa) => (
    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold text-white ${s === "feito" ? "bg-red" : "bg-ink"}`}>
      {doStatus(s).length}
    </span>
  );

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Tarefas" titulo={<>O que falta <span className="text-red">fazer</span></>}
        texto="Escreva e aperte Enter para criar. Use as setas para mover. Tudo salva sozinho."
        acoes={
          <div role="group" aria-label="Visualização" className="segmento">
            {(["kanban", "lista"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => trocarVista(v)}>
                {v === "kanban" ? "Kanban" : "Lista"}
              </button>
            ))}
          </div>
        } />

      <section className="flex flex-col gap-4" aria-label="Tarefas">
        <div className="flex items-center gap-4 text-[13px] text-muted">
          <span className="shrink-0">{feitas} de {tarefas.length} feitas</span>
          <div className="h-1.5 w-full max-w-[240px] rounded-full bg-line">
            <div className="anima h-full rounded-full bg-red" style={{ width: `${tarefas.length ? (feitas / tarefas.length) * 100 : 0}%` }} />
          </div>
          <span className="ml-auto"><StatusSalvo status={status} /></span>
        </div>

        <form onSubmit={nova} className="flex flex-wrap gap-2.5">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova tarefa" aria-label="Nova tarefa"
            className="caixa flex-[1_1_260px]" />
          <label className="relative flex-[1_1_170px] sm:flex-none">
            <select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsável da nova tarefa" className="caixa appearance-none pr-10 sm:w-auto">
              <option value="">Sem responsável</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {SETA}
          </label>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo da nova tarefa"
            className="caixa flex-[1_1_150px] sm:w-auto sm:flex-none" />
          <button type="submit" className="btn-1 flex-[1_1_120px] sm:flex-none">+ Adicionar</button>
        </form>

        <div className="flex flex-wrap gap-2">
          {[
            { rotulo: "Etiqueta", valor: fEtiqueta, set: setFEtiqueta, aria: "Filtrar por etiqueta",
              opcoes: [["todas", "Todas"], ...ETIQUETAS.map((e) => [e.k, e.t]), ["sem", "Sem etiqueta"]] },
            { rotulo: "Responsável", valor: fPessoa, set: setFPessoa, aria: "Filtrar por responsável",
              opcoes: [["todos", "Todos"], ...pessoas.map((p) => [p.id, p.nome]), ["sem", "Sem responsável"]] },
          ].map((f) => (
            <label key={f.rotulo} className="relative flex min-h-[40px] flex-[1_1_200px] items-center gap-3 rounded-full border-[1.5px] border-line bg-paper pl-4 pr-10 text-[13px] focus-within:border-ink sm:flex-none toque:min-h-[44px]">
              <span className="text-muted">{f.rotulo}</span>
              <select value={f.valor} onChange={(e) => f.set(e.target.value)} aria-label={f.aria}
                className="min-w-0 flex-1 appearance-none self-stretch bg-transparent text-base font-semibold text-ink outline-none md:text-[14px]">
                {f.opcoes.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              {SETA}
            </label>
          ))}
        </div>

        {vista === "kanban" ? (
          <>
            {/* Celular e tablet: uma coluna por vez, escolhida nas abas */}
            <div role="group" aria-label="Coluna" className="segmento self-start lg:hidden">
              {ORDEM.map((s) => (
                <button key={s} type="button" aria-pressed={coluna === s} onClick={() => setColuna(s)}
                  className="flex items-center gap-2">
                  {NOME_STATUS[s]} <span className="opacity-70">{doStatus(s).length}</span>
                </button>
              ))}
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-3">
              {ORDEM.map((s) => {
                const xs = doStatus(s);
                return (
                  <section key={s} aria-label={NOME_STATUS[s]}
                    className={`${coluna === s ? "flex" : "hidden"} flex-col gap-2.5 rounded-3xl border border-line-soft bg-[#efebe9] p-2.5 lg:flex`}>
                    <div className="hidden items-center justify-between px-2.5 pt-1.5 lg:flex">
                      <h2 className="text-[15px] font-semibold">{NOME_STATUS[s]}</h2>
                      {contagem(s)}
                    </div>
                    {xs.map(cartao)}
                    {xs.length === 0 && <p className="rounded-2xl border-[1.5px] border-dashed border-line p-5 text-center text-[13px] text-muted">Nada aqui</p>}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            {ORDEM.map((s) => {
              const xs = doStatus(s);
              return (
                <section key={s} aria-labelledby={`t-${s}`} className="flex flex-col gap-2">
                  <h2 id={`t-${s}`} className="titulo-secao flex items-center gap-2.5">{NOME_STATUS[s]} {contagem(s)}</h2>
                  {xs.length === 0
                    ? <p className="rounded-2xl border-[1.5px] border-dashed border-line p-4 text-[13px] text-muted">Nada aqui.</p>
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
