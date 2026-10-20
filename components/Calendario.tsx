"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adicionarEvento, removerEvento, salvarEvento } from "@/app/actions-gestao";
import { COR_AGENDA, TIPOS_AGENDA, horaBR, type TipoAgenda } from "@/lib/agenda";
import { brl } from "@/lib/calc";
import { deInput, diaBR, nomeMes, paraInput, somaMes } from "@/lib/crm";
import { hoje } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import type { Contato, Evento, EventoPatch, TipoEvento } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

type Item = { id: string; tipo: TipoAgenda; titulo: string; inicio: string; crm?: Contato; evento?: Evento };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];


function nomeDia(dia: string) {
  const t = new Date(dia + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Calendario({ mes, dias, eventos: inicial, contatos }: {
  mes: string; dias: string[]; eventos: Evento[]; contatos: Contato[];
}) {
  const [eventos, setEventos] = useState(inicial);
  const [ocultos, setOcultos] = useState<Set<TipoAgenda>>(new Set());
  const [dia, setDia] = useState(hoje().startsWith(mes) ? hoje() : `${mes}-01`);
  const [aberto, setAberto] = useState<string | null>(null);
  const [armado, setArmado] = useState(false);
  const { status, rodar, agendar, esquecer } = useAutosave<EventoPatch>(salvarEvento);

  const itens = useMemo(() => {
    const xs: Item[] = [
      ...contatos.map((c) => ({ id: c.id, tipo: c.tipo as TipoAgenda, titulo: c.apelido || "sem apelido", inicio: c.data_hora!, crm: c })),
      ...eventos.map((e) => ({ id: e.id, tipo: e.tipo as TipoAgenda, titulo: e.titulo || "sem título", inicio: e.inicio, evento: e })),
    ].filter((i) => !ocultos.has(i.tipo));
    const porDia: Record<string, Item[]> = {};
    for (const i of xs.sort((a, b) => a.inicio.localeCompare(b.inicio))) (porDia[diaBR(i.inicio)] ??= []).push(i);
    return porDia;
  }, [contatos, eventos, ocultos]);

  const atual = eventos.find((e) => e.id === aberto) ?? null;

  /** Fecha a ficha. Compromisso sem título não serve para nada: é descartado. */
  function fecharFicha() {
    const e = eventos.find((x) => x.id === aberto);
    setAberto(null);
    if (e && !e.titulo.trim()) {
      esquecer(e.id);
      setEventos((xs) => xs.filter((x) => x.id !== e.id));
      void rodar(() => removerEvento(e.id));
    }
  }

  useEffect(() => {
    if (aberto) setTimeout(() => document.getElementById("evento-titulo")?.focus(), 30);
  }, [aberto]);

  // Registra de novo a cada mudança para o Esc ver o título atual
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && fecharFicha();
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  });

  function alternar(t: TipoAgenda) {
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
    const cls = `flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-[3px] text-left text-[12px] font-semibold leading-tight ${COR_AGENDA[i.tipo].cor} ${
      i.crm?.etapa === "proposta" ? "opacity-60" : ""}`;
    const texto = <><span className="shrink-0 tabular-nums opacity-80">{horaBR(i.inicio)}</span><span className="truncate">{i.titulo}</span></>;
    if (compacto) return <span key={i.id} aria-hidden className={`h-2 w-2 rounded-full ${COR_AGENDA[i.tipo].ponto}`} />;
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
          <nav aria-label="Mês" className="flex items-center rounded-full border-[1.5px] border-ink bg-paper">
            <Link href={`/calendario?mes=${somaMes(mes, -1)}`} aria-label="Mês anterior" className="flex h-[38px] w-10 items-center justify-center rounded-full text-lg font-bold hover:bg-bg toque:h-11 toque:w-11">‹</Link>
            <span className="min-w-[140px] px-1 text-center text-[14px] font-bold">{nomeMes(mes)}</span>
            <Link href={`/calendario?mes=${somaMes(mes, 1)}`} aria-label="Próximo mês" className="flex h-[38px] w-10 items-center justify-center rounded-full text-lg font-bold hover:bg-bg toque:h-11 toque:w-11">›</Link>
          </nav>
          <button type="button" className="btn-1" onClick={() => novo()}>+ Novo compromisso</button>
        </>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Mostrar no calendário" className="flex flex-wrap gap-1.5">
          {TIPOS_AGENDA.map((t) => {
            const on = !ocultos.has(t.k);
            return (
              <button key={t.k} type="button" aria-pressed={on} onClick={() => alternar(t.k)}
                className={`pilula !bg-paper ${on ? "!border-ink !text-ink" : "!border-line-soft !text-apagado line-through"}`}>
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${t.ponto}`} />{t.t}
              </button>
            );
          })}
        </div>
        <span className="flex items-center gap-3 text-[13px] text-muted">
          Proposta aparece clarinha (a confirmar)
          <StatusSalvo status={status} />
        </span>
      </div>

      <section aria-label={`Calendário de ${nomeMes(mes)}`} className="overflow-hidden rounded-2xl border border-line-soft bg-paper shadow-[0_1px_2px_rgba(13,10,10,0.05)]">
        <div className="grid grid-cols-7 border-b border-line">
          {SEMANA.map((s) => <span key={s} className={`rotulo px-2 py-2 text-center md:text-left`}>{s}</span>)}
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
                  className={`flex h-8 w-8 items-center justify-center self-center rounded-full text-[13px] font-bold md:self-start toque:h-11 toque:w-11 ${
                    d === hoje() ? "bg-red text-white" : fora ? "text-apagado" : ""}`}>
                  {Number(d.slice(8))}
                </button>
                <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
                  {xs.slice(0, 3).map((i) => chip(i, false))}
                  {xs.length > 3 && <span className="px-1 text-[12px] font-bold text-muted">+{xs.length - 3}</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-0.5 md:hidden">{xs.slice(0, 4).map((i) => chip(i, true))}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="t-dia" className="cartao flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-dia" className="titulo-secao">{nomeDia(dia)}</h2>
          <button type="button" onClick={() => novo(dia)} className="btn-3 -mr-3">+ Adicionar neste dia</button>
        </div>
        {doDia.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">Nada neste dia.</p>
        ) : (
          <ul className="flex flex-col">
            {doDia.map((i) => {
              const conteudo = (
                <>
                  <span className="w-14 shrink-0 text-[14px] font-bold tabular-nums">{horaBR(i.inicio)}</span>
                  <span className={`shrink-0 selo ${COR_AGENDA[i.tipo].cor}`}>
                    {COR_AGENDA[i.tipo].um}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold">
                    {i.titulo}
                    {i.crm?.etapa === "proposta" && <span className="ml-2 text-[12px] font-semibold text-muted">· a confirmar</span>}
                    {i.evento?.local && <span className="ml-2 text-[12px] font-normal text-muted">· {i.evento.local}</span>}
                  </span>
                  {i.crm?.valor != null && <span className="text-[14px] font-bold tabular-nums">{brl(i.crm.valor)}</span>}
                </>
              );
              const cls = "-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 text-left hover:bg-bg";
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
        <div className="fixed inset-0 z-30 flex justify-end bg-ink/40" onClick={fecharFicha}>
          <section role="dialog" aria-modal="true" aria-labelledby="t-evento" onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto bg-paper p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 id="t-evento" className="titulo-secao">Compromisso</h2>
              <div className="flex items-center gap-3">
                <StatusSalvo status={status} />
                <button type="button" onClick={fecharFicha} aria-label="Fechar" className="btn-icone text-xl">×</button>
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Título</span>
              <input id="evento-titulo" className={`caixa font-semibold`} value={atual.titulo} placeholder="ex: Workshop de spanking"
                onChange={(e) => alterar(atual.id, { titulo: e.target.value })} />
            </label>
            <div role="group" aria-label="Tipo" className="flex flex-wrap gap-1.5">
              {TIPOS_AGENDA.filter((t) => t.k !== "sessao" && t.k !== "aluguel").map((t) => (
                <button key={t.k} type="button" aria-pressed={atual.tipo === t.k}
                  onClick={() => alterar(atual.id, { tipo: t.k as TipoEvento }, true)}
                  className="pilula">
                  {t.um}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="rotulo">Início</span>
                <input type="datetime-local" required className="caixa" value={paraInput(atual.inicio)}
                  onChange={(e) => { const v = deInput(e.target.value); if (v) alterar(atual.id, { inicio: v }, true); }} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Fim</span>
                <input type="datetime-local" className="caixa" value={paraInput(atual.fim)}
                  onChange={(e) => alterar(atual.id, { fim: deInput(e.target.value) }, true)} />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Local</span>
              <input className="caixa" value={atual.local} placeholder="Playroom, online…"
                onChange={(e) => alterar(atual.id, { local: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Observações</span>
              <textarea rows={4} value={atual.observacoes} placeholder="vagas, valor, equipe, o que levar"
                onChange={(e) => alterar(atual.id, { observacoes: e.target.value })}
                className="caixa resize-y py-2.5" />
            </label>
            <div className="mt-auto flex justify-end">
              <button type="button" onClick={() => apagar(atual.id)}
                className={armado ? "btn-perigo" : "btn-3 hover:!text-red"}>
                {armado ? "Remover mesmo?" : "Remover compromisso"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
