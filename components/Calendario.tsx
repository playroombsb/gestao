"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adicionarEvento, removerEvento, salvarEvento } from "@/app/actions-gestao";
import { brl } from "@/lib/calc";
import { deInput, diaBR, paraInput } from "@/lib/crm";
import { hoje } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import type { Contato, Evento, EventoPatch, TipoEvento } from "@/lib/types";
import Cabecalho, { BOTAO, PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

type Tipo = "sessao" | "aluguel" | TipoEvento;
type Item = { id: string; tipo: Tipo; titulo: string; inicio: string; crm?: Contato; evento?: Evento };

const TIPOS: { k: Tipo; t: string; um: string; cor: string; ponto: string }[] = [
  { k: "sessao", t: "Sessões", um: "Sessão", cor: "bg-ink text-white", ponto: "bg-ink" },
  { k: "aluguel", t: "Aluguéis", um: "Aluguel", cor: "bg-red-soft text-red-deep", ponto: "bg-red-soft border border-red-deep" },
  { k: "workshop", t: "Workshops", um: "Workshop", cor: "bg-red text-white", ponto: "bg-red" },
  { k: "evento", t: "Eventos", um: "Evento", cor: "border-[1.5px] border-ink bg-paper", ponto: "border-[1.5px] border-ink bg-paper" },
  { k: "outro", t: "Outros", um: "Outro", cor: "bg-line text-ink", ponto: "bg-side-label" },
];
const COR = Object.fromEntries(TIPOS.map((t) => [t.k, t])) as Record<Tipo, (typeof TIPOS)[number]>;
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";
const CAMPO = "w-full min-w-0 border-0 border-b-[1.5px] border-line-soft bg-transparent px-0.5 py-1.5 text-[15px] outline-none focus:border-red";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function somaMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
function nomeDia(dia: string) {
  const t = new Date(dia + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Calendario({ mes, dias, eventos: inicial, contatos }: {
  mes: string; dias: string[]; eventos: Evento[]; contatos: Contato[];
}) {
  const [eventos, setEventos] = useState(inicial);
  const [ocultos, setOcultos] = useState<Set<Tipo>>(new Set());
  const [dia, setDia] = useState(hoje().startsWith(mes) ? hoje() : `${mes}-01`);
  const [aberto, setAberto] = useState<string | null>(null);
  const [armado, setArmado] = useState(false);
  const { status, rodar, agendar, esquecer } = useAutosave<EventoPatch>(salvarEvento);

  const itens = useMemo(() => {
    const xs: Item[] = [
      ...contatos.map((c) => ({ id: c.id, tipo: c.tipo as Tipo, titulo: c.apelido || "sem apelido", inicio: c.data_hora!, crm: c })),
      ...eventos.map((e) => ({ id: e.id, tipo: e.tipo as Tipo, titulo: e.titulo || "sem título", inicio: e.inicio, evento: e })),
    ].filter((i) => !ocultos.has(i.tipo));
    const porDia: Record<string, Item[]> = {};
    for (const i of xs.sort((a, b) => a.inicio.localeCompare(b.inicio))) (porDia[diaBR(i.inicio)] ??= []).push(i);
    return porDia;
  }, [contatos, eventos, ocultos]);

  const atual = eventos.find((e) => e.id === aberto) ?? null;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", fechar);
    setTimeout(() => document.getElementById("evento-titulo")?.focus(), 30);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  function alternar(t: Tipo) {
    setOcultos((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }

  function alterar(id: string, patch: EventoPatch, imediato = false) {
    setEventos((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    agendar(id, patch, imediato);
  }

  async function novo(d = dia) {
    const r = await rodar(() => adicionarEvento(new Date(`${d}T19:00:00-03:00`).toISOString()));
    if (!r.ok) return;
    setEventos((xs) => [...xs, r.data]);
    setDia(d);
    setAberto(r.data.id);
  }

  async function apagar(id: string) {
    if (!armado) {
      setArmado(true);
      setTimeout(() => setArmado(false), 3000);
      return;
    }
    setArmado(false);
    esquecer(id);
    setAberto(null);
    setEventos((xs) => xs.filter((e) => e.id !== id));
    await rodar(() => removerEvento(id));
  }

  function chip(i: Item, compacto: boolean) {
    const cls = `flex w-full min-w-0 items-center gap-1 px-1.5 py-[3px] text-left text-[11.5px] font-semibold leading-tight ${COR[i.tipo].cor} ${
      i.crm?.etapa === "proposta" ? "opacity-60" : ""}`;
    const texto = <><span className="shrink-0 tabular-nums opacity-80">{hora(i.inicio)}</span><span className="truncate">{i.titulo}</span></>;
    if (compacto) return <span key={i.id} aria-hidden className={`h-2 w-2 rounded-full ${COR[i.tipo].ponto}`} />;
    return i.crm
      ? <Link key={i.id} href={`/crm?c=${i.id}`} className={cls} onClick={(e) => e.stopPropagation()}>{texto}</Link>
      : <button key={i.id} type="button" className={cls} onClick={(e) => { e.stopPropagation(); setAberto(i.id); }}>{texto}</button>;
  }

  const doDia = itens[dia] ?? [];

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Calendário" titulo={<>A agenda da <span className="text-red">casa</span></>}
        texto="Sessões e aluguéis vêm do CRM. Workshops, eventos e o resto você cria aqui."
        acoes={<>
          <nav aria-label="Mês" className="flex items-center border-[1.5px] border-ink bg-paper">
            <Link href={`/calendario?mes=${somaMes(mes, -1)}`} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center text-lg font-bold hover:bg-bg">‹</Link>
            <span className="min-w-[150px] px-2 text-center text-[14px] font-bold">{nomeMes(mes)}</span>
            <Link href={`/calendario?mes=${somaMes(mes, 1)}`} aria-label="Próximo mês" className="flex h-11 w-11 items-center justify-center text-lg font-bold hover:bg-bg">›</Link>
          </nav>
          <button type="button" className={BOTAO} onClick={() => novo()}>+ Novo evento</button>
        </>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Mostrar no calendário" className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => {
            const on = !ocultos.has(t.k);
            return (
              <button key={t.k} type="button" aria-pressed={on} onClick={() => alternar(t.k)}
                className={`flex min-h-[36px] items-center gap-2 border-[1.5px] px-3 text-[12px] font-bold ${on ? "border-ink bg-paper" : "border-line text-muted line-through"}`}>
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${t.ponto}`} />{t.t}
              </button>
            );
          })}
        </div>
        <span className="flex items-center gap-3 text-[12px] text-muted">
          Proposta aparece clarinha (a confirmar)
          <StatusSalvo status={status} />
        </span>
      </div>

      <section aria-label={`Calendário de ${nomeMes(mes)}`} className="border border-line bg-paper">
        <div className="grid grid-cols-7 border-b border-line">
          {SEMANA.map((s) => <span key={s} className={`${ROTULO} px-2 py-2 text-center md:text-left`}>{s}</span>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const fora = !d.startsWith(mes);
            const xs = itens[d] ?? [];
            const sel = d === dia;
            return (
              <div key={d} onClick={() => setDia(d)}
                className={`flex min-h-[64px] cursor-pointer flex-col gap-1 border-b border-r border-line-soft p-1 md:min-h-[118px] md:p-1.5 ${
                  fora ? "bg-bg/60" : ""} ${sel ? "outline outline-2 -outline-offset-2 outline-red" : "hover:bg-bg"}`}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setDia(d); }} aria-pressed={sel}
                  aria-label={`${nomeDia(d)}${xs.length ? `, ${xs.length} na agenda` : ""}`}
                  className={`flex h-7 w-7 items-center justify-center self-center text-[13px] font-bold md:self-start ${
                    d === hoje() ? "bg-red text-white" : fora ? "text-[#a89c9a]" : ""}`}>
                  {Number(d.slice(8))}
                </button>
                <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
                  {xs.slice(0, 3).map((i) => chip(i, false))}
                  {xs.length > 3 && <span className="px-1 text-[11px] font-bold text-muted">+{xs.length - 3}</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-0.5 md:hidden">{xs.slice(0, 4).map((i) => chip(i, true))}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="t-dia" className="flex flex-col gap-3 border border-line bg-paper p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-dia" className="text-[20px] font-bold tracking-tight">{nomeDia(dia)}</h2>
          <button type="button" onClick={() => novo(dia)} className="min-h-[44px] text-[13px] font-bold hover:text-red">+ Adicionar neste dia</button>
        </div>
        {doDia.length === 0 ? (
          <p className="border-[1.5px] border-dashed border-line p-5 text-sm text-muted">Nada neste dia.</p>
        ) : (
          <ul className="flex flex-col">
            {doDia.map((i) => {
              const conteudo = (
                <>
                  <span className="w-14 shrink-0 text-sm font-bold tabular-nums">{hora(i.inicio)}</span>
                  <span className={`shrink-0 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${COR[i.tipo].cor}`}>
                    {COR[i.tipo].um}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    {i.titulo}
                    {i.crm?.etapa === "proposta" && <span className="ml-2 text-[11px] font-semibold text-muted">· a confirmar</span>}
                    {i.evento?.local && <span className="ml-2 text-[12px] font-normal text-muted">· {i.evento.local}</span>}
                  </span>
                  {i.crm?.valor != null && <span className="text-sm font-bold tabular-nums">{brl(i.crm.valor)}</span>}
                </>
              );
              const cls = "flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft py-3 text-left last:border-0 hover:bg-bg";
              return (
                <li key={i.id}>
                  {i.crm
                    ? <Link href={`/crm?c=${i.id}`} className={cls}>{conteudo}</Link>
                    : <button type="button" onClick={() => setAberto(i.id)} className={cls}>{conteudo}</button>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {atual && (
        <div className="fixed inset-0 z-30 flex justify-end bg-ink/40" onClick={() => setAberto(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="t-evento" onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto bg-paper p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 id="t-evento" className="text-[22px] font-extrabold tracking-tight">Evento</h2>
              <div className="flex items-center gap-3">
                <StatusSalvo status={status} />
                <button type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="h-11 w-11 text-2xl text-muted hover:text-red">×</button>
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className={ROTULO}>Título</span>
              <input id="evento-titulo" className={`${CAMPO} font-semibold`} value={atual.titulo} placeholder="ex: Workshop de spanking"
                onChange={(e) => alterar(atual.id, { titulo: e.target.value })} />
            </label>
            <div role="group" aria-label="Tipo" className="flex flex-wrap gap-1.5">
              {TIPOS.filter((t) => t.k !== "sessao" && t.k !== "aluguel").map((t) => (
                <button key={t.k} type="button" aria-pressed={atual.tipo === t.k}
                  onClick={() => alterar(atual.id, { tipo: t.k as TipoEvento }, true)}
                  className={`min-h-[40px] border-[1.5px] px-3.5 text-[13px] font-bold ${atual.tipo === t.k ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                  {t.um}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className={ROTULO}>Início</span>
                <input type="datetime-local" required className={CAMPO} value={paraInput(atual.inicio)}
                  onChange={(e) => { const v = deInput(e.target.value); if (v) alterar(atual.id, { inicio: v }, true); }} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={ROTULO}>Fim</span>
                <input type="datetime-local" className={CAMPO} value={paraInput(atual.fim)}
                  onChange={(e) => alterar(atual.id, { fim: deInput(e.target.value) }, true)} />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className={ROTULO}>Local</span>
              <input className={CAMPO} value={atual.local} placeholder="Playroom, online…"
                onChange={(e) => alterar(atual.id, { local: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={ROTULO}>Observações</span>
              <textarea rows={4} value={atual.observacoes} placeholder="vagas, valor, equipe, o que levar"
                onChange={(e) => alterar(atual.id, { observacoes: e.target.value })}
                className="resize-y border-[1.5px] border-line p-2.5 text-sm outline-none focus:border-red" />
            </label>
            <div className="mt-auto flex justify-end">
              <button type="button" onClick={() => apagar(atual.id)}
                className={`min-h-[44px] px-3 text-[13px] font-bold ${armado ? "bg-red text-white" : "text-muted hover:text-red"}`}>
                {armado ? "Remover mesmo?" : "Remover evento"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
