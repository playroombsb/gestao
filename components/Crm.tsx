"use client";

import { useEffect, useMemo, useState } from "react";
import { adicionarContato, removerContato, salvarContato } from "@/app/actions-gestao";
import { brl, mostrar, parseNum } from "@/lib/calc";
import { dataHora, deInput, paraInput, resumoCrm } from "@/lib/crm";
import { useAutosave } from "@/lib/useAutosave";
import { ETAPAS, type Contato, type ContatoPatch, type Etapa } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";
import Tipo from "./Tipo";

const COLUNAS = ETAPAS.filter((e) => e.k !== "perdido");
const ORIGENS = ["Instagram", "WhatsApp", "Site", "Indicação", "Evento", "Outro"];

type Filtro = "todos" | "sessao" | "aluguel";

export default function Crm({ inicial, abrir }: { inicial: Contato[]; abrir?: string }) {
  const [contatos, setContatos] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(abrir && inicial.some((c) => c.id === abrir) ? abrir : null);
  const [verPerdidos, setVerPerdidos] = useState(false);
  // Coluna visível abaixo de 1280px; abrindo um contato pelo link, começa na etapa dele
  const [etapaVisivel, setEtapaVisivel] = useState<Etapa>(() => {
    const e = inicial.find((c) => c.id === abrir)?.etapa;
    return e && e !== "perdido" ? e : "novo";
  });
  const [armado, setArmado] = useState(false);
  const { status, rodar, agendar, esquecer } = useAutosave<ContatoPatch>(salvarContato);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => (filtro === "todos" || c.tipo === filtro)
      && (!q || c.apelido.toLowerCase().includes(q) || c.contato.toLowerCase().includes(q)));
  }, [contatos, filtro, busca]);
  const calc = useMemo(() => resumoCrm(visiveis), [visiveis]);
  const atual = contatos.find((c) => c.id === aberto) ?? null;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", fechar);
    setTimeout(() => document.getElementById("ficha-apelido")?.focus(), 30);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  function alterar(id: string, patch: ContatoPatch, imediato = false) {
    setContatos((xs) => xs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    agendar(id, patch, imediato);
  }

  async function novo() {
    const r = await rodar(() => adicionarContato());
    if (!r.ok) return;
    setContatos((xs) => [r.data, ...xs]);
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
    setContatos((xs) => xs.filter((c) => c.id !== id));
    await rodar(() => removerContato(id));
  }

  function cartao(c: Contato) {
    const detalhe = c.etapa === "novo" || c.etapa === "conversa"
      ? `${c.origem}${c.data_hora ? ` · quer ${dataHora(c.data_hora)}` : ""}`
      : `${dataHora(c.data_hora)}${c.valor != null ? ` · ${brl(c.valor)}` : ""}`;
    return (
      <button key={c.id} type="button" onClick={() => setAberto(c.id)}
        className={`flex w-full flex-col gap-1.5 rounded-2xl bg-paper p-3.5 text-left shadow-[0_1px_2px_rgba(13,10,10,0.06),0_1px_8px_rgba(13,10,10,0.04)] transition-shadow hover:shadow-[0_2px_10px_rgba(13,10,10,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red ${
          aberto === c.id ? "outline outline-2 outline-red" : ""}`}>
        <span className="flex items-start justify-between gap-2">
          <strong className="min-w-0 text-[15px] font-medium">{c.apelido || "sem apelido"}</strong>
          <Tipo tipo={c.tipo} />
        </span>
        <span className="text-[13px] text-muted">{detalhe}</span>
        {c.etapa === "agendado" && c.sinal !== "sem" && (
          <span className={`text-[12px] font-semibold ${c.sinal === "pago" ? "text-ink" : "text-red"}`}>
            {c.sinal === "pago" ? "Sinal pago" : "Sinal pendente"}
          </span>
        )}
      </button>
    );
  }

  const perdidos = visiveis.filter((c) => c.etapa === "perdido");
  const proxima = (e: Etapa) => COLUNAS[COLUNAS.findIndex((x) => x.k === e) + 1]?.k;

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · CRM" titulo={<>Sessões e <span className="text-red">aluguéis</span></>}
        acoes={<>
          <StatusSalvo status={status} />
          <button type="button" onClick={novo} className="btn-1">+ Novo contato</button>
        </>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por tipo" className="segmento">
          {([["todos", "Todos"], ["sessao", "Sessões"], ["aluguel", "Aluguéis"]] as const).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar apelido ou contato"
          aria-label="Buscar apelido ou contato" className="caixa basis-full sm:w-64 sm:basis-auto" />
      </div>

      <div className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft">
        {[
          ["Em negociação", brl(calc.negociacao)],
          ["Agendado no mês", brl(calc.agendadoMes)],
          ["Realizado no mês", brl(calc.realizadoMes)],
          ["Conversão", calc.conversao == null ? "—" : `${Math.round(calc.conversao * 100)}%`],
        ].map(([t, v], i) => (
          <div key={t} className="flex flex-[1_1_160px] flex-col gap-1 bg-paper px-5 py-4">
            <span className="rotulo">{t}</span>
            <span className={`text-[24px] font-bold tabular-nums ${i === 2 ? "text-red" : ""}`}>{v}</span>
          </div>
        ))}
      </div>

      <section aria-label="Pipeline" className="flex flex-col gap-3">
        {/* Abaixo de 1280px: uma etapa por vez */}
        <div role="group" aria-label="Etapa" className="-mx-4 overflow-x-auto px-4 xl:hidden">
          <div className="segmento">
            {COLUNAS.map(({ k, t }) => (
              <button key={k} type="button" aria-pressed={etapaVisivel === k} onClick={() => setEtapaVisivel(k)} className="whitespace-nowrap">
                {t} <span className="opacity-70">{visiveis.filter((c) => c.etapa === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid items-start gap-3 xl:grid-cols-5">
          {COLUNAS.map(({ k, t }) => {
            const itens = visiveis.filter((c) => c.etapa === k)
              .sort((a, b) => (a.data_hora ?? "9").localeCompare(b.data_hora ?? "9"));
            return (
              <div key={k} className={`${etapaVisivel === k ? "flex" : "hidden"} flex-col gap-2 rounded-3xl border border-line-soft bg-[#efebe9] p-2 xl:flex`}>
                <div className="hidden items-center justify-between px-2 pt-1 xl:flex">
                  <span className="text-[14px] font-semibold">{t}</span>
                  <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold text-white ${k === "realizado" ? "bg-red" : "bg-ink"}`}>{itens.length}</span>
                </div>
                {itens.map(cartao)}
                {itens.length === 0 && <div className="rounded-2xl border-[1.5px] border-dashed border-line p-4 text-center text-[13px] text-muted">Nada aqui</div>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setVerPerdidos((v) => !v)} aria-expanded={verPerdidos}
          className="btn-3 -ml-3 self-start">
          {verPerdidos ? "Esconder perdidos" : `Ver perdidos (${perdidos.length})`}
        </button>
        {verPerdidos && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {perdidos.length ? perdidos.map(cartao) : <p className="text-[13px] text-muted">Nenhum perdido.</p>}
          </div>
        )}
      </div>

      {atual && (
        <div className="fixed inset-0 z-30 flex justify-end bg-ink/40" onClick={() => setAberto(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="t-ficha" onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto bg-paper p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 id="t-ficha" className="titulo-secao">Ficha do contato</h2>
              <div className="flex items-center gap-3">
                <StatusSalvo status={status} />
                <button type="button" onClick={() => setAberto(null)} aria-label="Fechar ficha"
                  className="btn-icone text-xl">×</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <span className="rotulo">Apelido</span>
                <input id="ficha-apelido" className={`caixa font-medium`} value={atual.apelido}
                  onChange={(e) => alterar(atual.id, { apelido: e.target.value })} />
              </label>
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <span className="rotulo">Contato</span>
                <input className="caixa" value={atual.contato} placeholder="WhatsApp ou @"
                  onChange={(e) => alterar(atual.id, { contato: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Tipo</span>
                <select className="caixa" value={atual.tipo} onChange={(e) => alterar(atual.id, { tipo: e.target.value as Contato["tipo"] }, true)}>
                  <option value="sessao">Sessão</option>
                  <option value="aluguel">Aluguel do espaço</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Etapa</span>
                <select className="caixa" value={atual.etapa} onChange={(e) => alterar(atual.id, { etapa: e.target.value as Etapa }, true)}>
                  {ETAPAS.map((e) => <option key={e.k} value={e.k}>{e.t}</option>)}
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <span className="rotulo">Data e horário</span>
                <input type="datetime-local" className="caixa" value={paraInput(atual.data_hora)}
                  onChange={(e) => alterar(atual.id, { data_hora: deInput(e.target.value) }, true)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Duração</span>
                <input className="caixa" value={atual.duracao} placeholder="2 h"
                  onChange={(e) => alterar(atual.id, { duracao: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Valor (R$)</span>
                <input key={`valor-${atual.id}`} inputMode="decimal" className={`caixa font-medium`} defaultValue={mostrar(atual.valor)}
                  placeholder="0" onChange={(e) => alterar(atual.id, { valor: parseNum(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Sinal</span>
                <select className="caixa" value={atual.sinal} onChange={(e) => alterar(atual.id, { sinal: e.target.value as Contato["sinal"] }, true)}>
                  <option value="sem">Sem sinal</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Origem</span>
                <select className="caixa" value={atual.origem} onChange={(e) => alterar(atual.id, { origem: e.target.value }, true)}>
                  {[...new Set([...ORIGENS, atual.origem])].map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              {atual.etapa === "perdido" && (
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="rotulo">Motivo da perda</span>
                  <input className="caixa" value={atual.motivo_perda}
                    onChange={(e) => alterar(atual.id, { motivo_perda: e.target.value })} />
                </label>
              )}
            </div>

            <label className="flex flex-col gap-1">
              <span className="rotulo">Observações</span>
              <textarea rows={4} value={atual.observacoes} placeholder="combinados, preferências, limites acordados"
                onChange={(e) => alterar(atual.id, { observacoes: e.target.value })}
                className="caixa resize-y py-2.5" />
            </label>

            <p className="rounded-lg bg-bg px-3 py-2.5 text-[13px] text-muted">
              Dados sensíveis: guarde só apelido e um contato. Ao marcar Realizado, o valor entra sozinho como receita no Financeiro.
            </p>

            <div className="mt-auto flex flex-wrap gap-2.5">
              {proxima(atual.etapa) && (
                <button type="button" className="btn-1" onClick={() => alterar(atual.id, { etapa: proxima(atual.etapa)! }, true)}>
                  Avançar para {COLUNAS.find((x) => x.k === proxima(atual.etapa))!.t}
                </button>
              )}
              {atual.etapa !== "perdido" && (
                <button type="button" className="btn-2" onClick={() => alterar(atual.id, { etapa: "perdido" }, true)}>Marcar como perdido</button>
              )}
              <button type="button" onClick={() => apagar(atual.id)}
                className={armado ? "btn-perigo" : "btn-3 hover:!text-red"}>
                {armado ? "Remover mesmo?" : "Remover"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
