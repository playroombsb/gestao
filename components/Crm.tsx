"use client";

import { useEffect, useMemo, useState } from "react";
import { adicionarContato, removerContato, salvarContato } from "@/app/actions-gestao";
import { brl, mostrar, parseNum } from "@/lib/calc";
import { dataHora, deInput, paraInput, resumoCrm } from "@/lib/crm";
import { useAutosave } from "@/lib/useAutosave";
import { ETAPAS, ETAPAS_EVENTO, INGRESSOS, etapasDo, nomeIngressos, type Contato, type ContatoPatch, type Etapa, type Evento } from "@/lib/types";
import CrmAbas from "./CrmAbas";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";
import Tipo from "./Tipo";
import { SITE_BAILE } from "@/lib/baile";

const colunasDe = (lista: readonly { k: Etapa; t: string }[]) => lista.filter((e) => e.k !== "perdido");
const ORIGENS = ["Instagram", "WhatsApp", "Site", "Indicação", "Evento", "Kinkgram / Fetlife", "Grupo Telegram ou WhatsApp", "Formulário", "Capital Sex", "Outro"];

type Filtro = "todos" | "sessao" | "aluguel" | "evento";

/**
  Link público do formulário (site da festa, nunca o endereço do sistema). A próxima festa usa o endereço
  curto, o mesmo da página; outro evento ou workshop leva ?evento=<id>.
*/
function linkPublico(id: string, eventos: Evento[]) {
  const proxFesta = eventos.find((e) => e.tipo === "evento" && Date.parse(e.inicio) + 86_400_000 >= Date.now());
  return id === proxFesta?.id ? `${SITE_BAILE}/aplicacao` : `${SITE_BAILE}/aplicacao?evento=${id}`;
}

/** Próximo evento a acontecer; sem nenhum à frente, o mais recente. */
function eventoPadrao(eventos: Evento[]) {
  const agora = Date.now() - 12 * 3_600_000;
  return (eventos.find((e) => Date.parse(e.inicio) >= agora) ?? eventos[eventos.length - 1])?.id ?? "";
}

export default function Crm({ inicial, eventos, abrir }: { inicial: Contato[]; eventos: Evento[]; abrir?: string }) {
  const [contatos, setContatos] = useState(inicial);
  const abertoInicial = inicial.find((c) => c.id === abrir);
  const [filtro, setFiltro] = useState<Filtro>(abertoInicial?.tipo === "evento" ? "evento" : "todos");
  // Evento cujo pipeline está na tela ("" = contatos de evento ainda sem evento escolhido)
  const [eventoSel, setEventoSel] = useState<string>(
    abertoInicial?.tipo === "evento" ? abertoInicial.evento_id ?? "" : eventoPadrao(eventos));
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(abrir && inicial.some((c) => c.id === abrir) ? abrir : null);
  const [verPerdidos, setVerPerdidos] = useState(false);
  // Coluna visível abaixo de 1280px; abrindo um contato pelo link, começa na etapa dele
  const [etapaVisivel, setEtapaVisivel] = useState<Etapa>(() => {
    const e = inicial.find((c) => c.id === abrir)?.etapa;
    return e && e !== "perdido" ? e : "novo";
  });
  const [armado, setArmado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { status, rodar, agendar, esquecer } = useAutosave<ContatoPatch>(salvarContato);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const doFiltro = (c: Contato) => filtro === "evento"
      ? c.tipo === "evento" && (c.evento_id ?? "") === eventoSel
      : filtro === "todos" ? c.tipo !== "evento" : c.tipo === filtro;
    return contatos.filter((c) => doFiltro(c)
      && (!q || c.apelido.toLowerCase().includes(q) || c.contato.toLowerCase().includes(q)));
  }, [contatos, filtro, eventoSel, busca]);
  const calc = useMemo(() => resumoCrm(visiveis), [visiveis]);
  const atual = contatos.find((c) => c.id === aberto) ?? null;
  const ehEvento = filtro === "evento";
  const COLUNAS = colunasDe(ehEvento ? ETAPAS_EVENTO : ETAPAS);
  const semEvento = contatos.some((c) => c.tipo === "evento" && !c.evento_id);
  const nomeEvento = (e: Evento) => `${e.titulo || "Evento sem título"} · ${dataHora(e.inicio)}`;

  const numeros: [string, string][] = ehEvento
    ? (() => {
      const pagos = visiveis.filter((c) => c.etapa === "agendado" || c.etapa === "endereco" || c.etapa === "realizado");
      return [
        ["Aplicações", String(visiveis.filter((c) => c.etapa === "novo" || c.etapa === "conversa").length)],
        ["Link enviado", String(calc.porEtapa("proposta"))],
        ["Ingressos pagos", String(pagos.reduce((s, c) => s + (c.ingressos ?? 1), 0))],
        ["Arrecadado", brl(pagos.reduce((s, c) => s + (c.valor ?? 0), 0))],
      ];
    })()
    : [
      ["Em negociação", brl(calc.negociacao)],
      ["Agendado no mês", brl(calc.agendadoMes)],
      ["Realizado no mês", brl(calc.realizadoMes)],
      ["Conversão", calc.conversao == null ? "—" : `${Math.round(calc.conversao * 100)}%`],
    ];

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

  // Arrastar o cartão entre as colunas (mouse). No celular, a etapa muda pela ficha.
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Etapa | null>(null);
  function soltarEm(k: Etapa) {
    return {
      onDragOver: (e: React.DragEvent) => { if (!arrastando) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (alvo !== k) setAlvo(k); },
      onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo((a) => (a === k ? null : a)); },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const id = arrastando ?? e.dataTransfer.getData("text/plain");
        setArrastando(null); setAlvo(null);
        const c = contatos.find((x) => x.id === id);
        if (c && c.etapa !== k) alterar(c.id, { etapa: k }, true);
      },
    };
  }

  async function novo() {
    const r = await rodar(() => adicionarContato(
      ehEvento ? { tipo: "evento", evento_id: eventoSel || null } : filtro === "aluguel" ? { tipo: "aluguel" } : {}));
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
    const detalhe = c.tipo === "evento"
      ? [nomeIngressos(c.ingressos), c.origem, c.valor != null ? brl(c.valor) : ""].filter(Boolean).join(" · ")
      : c.etapa === "novo" || c.etapa === "conversa"
      ? `${c.origem}${c.data_hora ? ` · quer ${dataHora(c.data_hora)}` : ""}`
      : `${dataHora(c.data_hora)}${c.valor != null ? ` · ${brl(c.valor)}` : ""}`;
    return (
      <button key={c.id} type="button" onClick={() => setAberto(c.id)} draggable
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; setArrastando(c.id); }}
        onDragEnd={() => { setArrastando(null); setAlvo(null); }}
        className={`flex w-full cursor-grab flex-col gap-1.5 rounded-2xl bg-paper p-3.5 text-left active:cursor-grabbing ${arrastando === c.id ? "opacity-40" : ""} shadow-[0_1px_2px_rgba(13,10,10,0.06),0_1px_8px_rgba(13,10,10,0.04)] transition-shadow hover:shadow-[0_2px_10px_rgba(13,10,10,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red ${
          aberto === c.id ? "outline outline-2 outline-red" : ""}`}>
        <span className="flex items-start justify-between gap-2">
          <strong className="min-w-0 text-[15px] font-medium">{c.apelido || "sem apelido"}</strong>
          <Tipo tipo={c.tipo} />
        </span>
        <span className="text-[13px] text-muted">{detalhe}</span>
        {c.tipo !== "evento" && c.etapa === "agendado" && c.sinal !== "sem" && (
          <span className={`text-[12px] font-semibold ${c.sinal === "pago" ? "text-ink" : "text-red"}`}>
            {c.sinal === "pago" ? "Sinal pago" : "Sinal pendente"}
          </span>
        )}
      </button>
    );
  }

  const perdidos = visiveis.filter((c) => c.etapa === "perdido");
  const colunasAtual = atual ? colunasDe(etapasDo(atual.tipo)) : COLUNAS;
  const proxima = (e: Etapa) => colunasAtual[colunasAtual.findIndex((x) => x.k === e) + 1];

  async function copiarLink() {
    if (!eventoSel) return;
    try {
      await navigator.clipboard.writeText(linkPublico(eventoSel, eventos));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sem permissão de área de transferência: o link "Abrir formulário" continua ali */ }
  }

  function mudarTipo(c: Contato, tipo: Contato["tipo"]) {
    if (tipo === "evento") alterar(c.id, { tipo, evento_id: c.evento_id ?? (eventoSel || eventos[0]?.id || null) }, true);
    else alterar(c.id, { tipo, evento_id: null }, true);
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · CRM" titulo={ehEvento ? <>Pipeline de <span className="text-red">eventos</span></> : <>Sessões e <span className="text-red">aluguéis</span></>}
        acoes={<>
          <StatusSalvo status={status} />
          <button type="button" onClick={novo} className="btn-1">+ Novo contato</button>
        </>} />

      <CrmAbas atual="pipeline" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por tipo" className="segmento">
          {([["todos", "Todos"], ["sessao", "Sessões"], ["aluguel", "Aluguéis"], ["evento", "Eventos"]] as const).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        {ehEvento && (
          <label className="flex basis-full items-center gap-2 sm:basis-auto">
            <span className="rotulo">Evento</span>
            <select className="caixa min-w-0 flex-1 sm:w-80 sm:flex-none" value={eventoSel} onChange={(e) => setEventoSel(e.target.value)}>
              {eventos.length === 0 && !semEvento && <option value="">Nenhum evento no calendário</option>}
              {eventos.map((e) => <option key={e.id} value={e.id}>{nomeEvento(e)}</option>)}
              {semEvento && <option value="">Sem evento definido</option>}
            </select>
          </label>
        )}
        {ehEvento && eventoSel && (
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={copiarLink} className="btn-2">{copiado ? "Link copiado" : "Copiar link do formulário"}</button>
            <a href={linkPublico(eventoSel, eventos)} target="_blank" rel="noreferrer" className="btn-3">Abrir formulário</a>
          </div>
        )}
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar apelido ou contato"
          aria-label="Buscar apelido ou contato" className="caixa basis-full sm:w-64 sm:basis-auto" />
      </div>

      <div className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft">
        {numeros.map(([t, v], i) => (
          <div key={t} className="flex flex-[1_1_160px] flex-col gap-1 bg-paper px-5 py-4">
            <span className="rotulo">{t}</span>
            <span className={`text-[24px] font-bold tabular-nums ${i === (ehEvento ? 3 : 2) ? "text-red" : ""}`}>{v}</span>
          </div>
        ))}
      </div>

      <section aria-label="Pipeline" className="flex flex-col gap-3">
        {/* Abaixo de 1280px: uma etapa por vez */}
        <div role="group" aria-label="Etapa" className="-mx-4 overflow-x-auto px-4 xl:hidden">
          <div className="segmento">
            {COLUNAS.map(({ k, t }) => (
              <button key={k} type="button" aria-pressed={etapaVisivel === k} onClick={() => setEtapaVisivel(k)} {...soltarEm(k)}
                className={`whitespace-nowrap ${alvo === k ? "ring-2 ring-red" : ""}`}>
                {t} <span className="opacity-70">{visiveis.filter((c) => c.etapa === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Colunas lado a lado em tela larga; com muitas etapas (evento), rola para o lado */}
        <div className="grid items-start gap-3 xl:-mx-1 xl:grid-cols-[repeat(var(--colunas),minmax(190px,1fr))] xl:overflow-x-auto xl:px-1 xl:pb-2"
          style={{ "--colunas": COLUNAS.length } as React.CSSProperties}>
          {COLUNAS.map(({ k, t }) => {
            const itens = visiveis.filter((c) => c.etapa === k)
              .sort((a, b) => (a.data_hora ?? "9").localeCompare(b.data_hora ?? "9"));
            return (
              <div key={k} {...soltarEm(k)}
                className={`${etapaVisivel === k ? "flex" : "hidden"} min-h-[120px] flex-col gap-2 rounded-3xl border bg-[#efebe9] p-2 transition-colors xl:flex ${
                  alvo === k ? "border-red bg-[#f6e4e6]" : "border-line-soft"}`}>
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
        <button type="button" onClick={() => setVerPerdidos((v) => !v)} aria-expanded={verPerdidos} {...soltarEm("perdido")}
          className={`btn-3 -ml-3 self-start ${alvo === "perdido" ? "ring-2 ring-red" : ""}`}>
          {ehEvento
            ? verPerdidos ? "Esconder quem não foi" : `Ver quem não foi (${perdidos.length})`
            : verPerdidos ? "Esconder perdidos" : `Ver perdidos (${perdidos.length})`}
        </button>
        {verPerdidos && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {perdidos.length ? perdidos.map(cartao) : <p className="text-[13px] text-muted">{ehEvento ? "Ninguém aqui." : "Nenhum perdido."}</p>}
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
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <span className="rotulo">E-mail</span>
                <input type="email" className="caixa" value={atual.email}
                  onChange={(e) => alterar(atual.id, { email: e.target.value })} />
              </label>
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <span className="rotulo">Gênero e pronome</span>
                <input className="caixa" value={atual.pronome} placeholder="Ela/Dela"
                  onChange={(e) => alterar(atual.id, { pronome: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Tipo</span>
                <select className="caixa" value={atual.tipo} onChange={(e) => mudarTipo(atual, e.target.value as Contato["tipo"])}>
                  <option value="sessao">Sessão</option>
                  <option value="aluguel">Aluguel do espaço</option>
                  <option value="evento">Evento</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="rotulo">Etapa</span>
                <select className="caixa" value={atual.etapa} onChange={(e) => alterar(atual.id, { etapa: e.target.value as Etapa }, true)}>
                  {etapasDo(atual.tipo).map((e) => <option key={e.k} value={e.k}>{e.t}</option>)}
                </select>
              </label>
              {atual.tipo === "evento" ? (<>
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="rotulo">Evento</span>
                  <select className="caixa" value={atual.evento_id ?? ""}
                    onChange={(e) => alterar(atual.id, { evento_id: e.target.value || null }, true)}>
                    <option value="">Sem evento definido</option>
                    {eventos.map((e) => <option key={e.id} value={e.id}>{nomeEvento(e)}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="rotulo">Ingressos</span>
                  <select className="caixa" value={atual.ingressos ?? ""}
                    onChange={(e) => alterar(atual.id, { ingressos: e.target.value ? Number(e.target.value) : null }, true)}>
                    <option value="">Não informado</option>
                    {INGRESSOS.map((x) => <option key={x.n} value={x.n}>{x.t}</option>)}
                  </select>
                </label>
              </>) : (<>
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
              </>)}
              <label className="flex flex-col gap-1">
                <span className="rotulo">Valor (R$)</span>
                <input key={`valor-${atual.id}`} inputMode="decimal" className={`caixa font-medium`} defaultValue={mostrar(atual.valor)}
                  placeholder="0" onChange={(e) => alterar(atual.id, { valor: parseNum(e.target.value) })} />
              </label>
              {atual.tipo !== "evento" && (
                <label className="flex flex-col gap-1">
                  <span className="rotulo">Sinal</span>
                  <select className="caixa" value={atual.sinal} onChange={(e) => alterar(atual.id, { sinal: e.target.value as Contato["sinal"] }, true)}>
                    <option value="sem">Sem sinal</option>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="rotulo">Origem</span>
                <select className="caixa" value={atual.origem} onChange={(e) => alterar(atual.id, { origem: e.target.value }, true)}>
                  {[...new Set([...ORIGENS, atual.origem])].map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              {atual.etapa === "perdido" && (
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="rotulo">{atual.tipo === "evento" ? "Por que não foi" : "Motivo da perda"}</span>
                  <input className="caixa" value={atual.motivo_perda}
                    onChange={(e) => alterar(atual.id, { motivo_perda: e.target.value })} />
                </label>
              )}
            </div>

            {atual.respostas.some((r) => r.resposta) && (
              <section aria-labelledby="t-respostas" className="flex flex-col gap-3 rounded-2xl bg-bg p-4">
                <h3 id="t-respostas" className="rotulo">Respostas do formulário</h3>
                <dl className="flex flex-col gap-3">
                  {atual.respostas.filter((r) => r.resposta).map((r, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <dt className="text-[13px] text-muted">{r.pergunta}</dt>
                      <dd className="whitespace-pre-wrap text-[15px]">{r.resposta}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <label className="flex flex-col gap-1">
              <span className="rotulo">Observações</span>
              <textarea rows={4} value={atual.observacoes} placeholder="combinados, preferências, limites acordados"
                onChange={(e) => alterar(atual.id, { observacoes: e.target.value })}
                className="caixa resize-y py-2.5" />
            </label>

            <p className="rounded-lg bg-bg px-3 py-2.5 text-[13px] text-muted">
              Dados sensíveis: guarde só apelido e um contato. {atual.tipo === "evento"
                ? "Ao marcar Compareceu, o valor do ingresso entra sozinho como receita (Eventos) no Financeiro."
                : "Ao marcar Realizado, o valor entra sozinho como receita no Financeiro."}
            </p>

            <div className="mt-auto flex flex-wrap gap-2.5">
              {proxima(atual.etapa) && (
                <button type="button" className="btn-1" onClick={() => alterar(atual.id, { etapa: proxima(atual.etapa)!.k }, true)}>
                  Avançar para {proxima(atual.etapa)!.t}
                </button>
              )}
              {atual.etapa !== "perdido" && (
                <button type="button" className="btn-2" onClick={() => alterar(atual.id, { etapa: "perdido" }, true)}>
                  {atual.tipo === "evento" ? "Marcar como não foi" : "Marcar como perdido"}
                </button>
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
