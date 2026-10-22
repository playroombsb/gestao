"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  atualizarConversas, criarContatoDaConversa, enviarMensagem, listarMensagens, vincularContato,
} from "@/app/actions-whatsapp";
import type { Conversa, Mensagem, Pessoa } from "@/lib/types";
import { telefoneBonito } from "@/lib/whatsapp";

type EstadoWhats = "conectado" | "conectando" | "desconectado" | "sem_instancia" | "indisponivel";
type ContatoCurto = { id: string; apelido: string };

const ATUALIZA_MS = 4000;
const FUSO = "America/Sao_Paulo";

const diaDe = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: FUSO });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

function rotuloDia(dia: string) {
  const hoje = diaDe(new Date().toISOString());
  const ontem = diaDe(new Date(Date.now() - 86_400_000).toISOString());
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

function quandoCurto(iso: string | null) {
  if (!iso) return "";
  const dia = diaDe(iso);
  const r = rotuloDia(dia);
  return r === "Hoje" ? hora(iso) : r === "Ontem" ? "Ontem" : r.slice(0, 5);
}

const nomeDe = (c: Conversa) => c.nome || telefoneBonito(c.telefone) || "Sem nome";
const iniciais = (t: string) => t.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

const STATUS_TXT: Record<Mensagem["status"], string> = {
  "": "", pendente: "enviando", enviada: "enviada", entregue: "entregue", lida: "lida", erro: "não enviada",
};

function juntar(atuais: Mensagem[], novas: Mensagem[]) {
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const m of novas) porId.set(m.id, m);
  return Array.from(porId.values()).sort((a, b) => a.em.localeCompare(b.em));
}

export default function Conversas({ inicial, abertaInicial, mensagensIniciais, maisAntigasInicial, contatos: contatosIniciais, pessoas, estado, numero }: {
  inicial: Conversa[];
  abertaInicial: string | null;
  mensagensIniciais: Mensagem[];
  maisAntigasInicial: boolean;
  contatos: ContatoCurto[];
  pessoas: Pessoa[];
  estado: EstadoWhats;
  numero?: string;
}) {
  const router = useRouter();
  const [conversas, setConversas] = useState(inicial);
  const [contatos, setContatos] = useState(contatosIniciais);
  const [aberta, setAberta] = useState<string | null>(abertaInicial);
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [maisAntigas, setMaisAntigas] = useState(maisAntigasInicial);
  const [busca, setBusca] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [reveladas, setReveladas] = useState<Set<string>>(new Set());
  const rolagem = useRef<HTMLDivElement>(null);
  const noFim = useRef(true);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const totalNaoLidas = useRef(inicial.filter((c) => c.nao_lidas > 0).length);

  const atual = conversas.find((c) => c.jid === aberta) ?? null;
  const conectado = estado === "conectado";
  const nomePessoa = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome.split(" ")[0]])), [pessoas]);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return conversas;
    const digitos = b.replace(/\D/g, "");
    return conversas.filter((c) => c.nome.toLowerCase().includes(b) || (digitos && c.telefone.includes(digitos)) || c.ultima_previa.toLowerCase().includes(b));
  }, [conversas, busca]);

  // O número de conversas não lidas no menu vem do servidor: atualiza quando muda
  const conferirMenu = useCallback((cs: Conversa[]) => {
    const n = cs.filter((c) => c.nao_lidas > 0).length;
    if (n !== totalNaoLidas.current) {
      totalNaoLidas.current = n;
      router.refresh();
    }
  }, [router]);

  // Atualização periódica enquanto a aba está visível
  useEffect(() => {
    let parado = false;
    async function rodar() {
      if (document.visibilityState !== "visible") return;
      const r = await atualizarConversas(aberta);
      if (parado) return;
      if (!r.ok) return setAviso(r.erro);
      setAviso("");
      setConversas(r.data.conversas);
      if (aberta) setMensagens((ms) => juntar(ms, r.data.mensagens.filter((m) => m.jid === aberta)));
      conferirMenu(r.data.conversas);
    }
    const t = setInterval(rodar, ATUALIZA_MS);
    document.addEventListener("visibilitychange", rodar);
    return () => { parado = true; clearInterval(t); document.removeEventListener("visibilitychange", rodar); };
  }, [aberta, conferirMenu]);

  // Desce para a última mensagem ao abrir e quando chega mensagem nova (se já estava no fim)
  useLayoutEffect(() => {
    const el = rolagem.current;
    if (el && noFim.current) el.scrollTop = el.scrollHeight;
  }, [mensagens, aberta]);

  async function abrir(jid: string) {
    if (jid === aberta) return;
    setAberta(jid);
    setMensagens([]);
    setErro("");
    setTexto("");
    noFim.current = true;
    window.history.replaceState(null, "", `/conversas?c=${encodeURIComponent(jid)}`);
    setCarregando(true);
    const [r, a] = await Promise.all([listarMensagens(jid), atualizarConversas(jid)]);
    setCarregando(false);
    if (r.ok) { setMensagens(r.data.mensagens); setMaisAntigas(r.data.maisAntigas); }
    else setErro(r.erro);
    if (a.ok) { setConversas(a.data.conversas); conferirMenu(a.data.conversas); }
  }

  function fechar() {
    setAberta(null);
    window.history.replaceState(null, "", "/conversas");
  }

  async function carregarAnteriores() {
    if (!aberta || !mensagens[0]) return;
    const el = rolagem.current;
    const antesAltura = el?.scrollHeight ?? 0;
    noFim.current = false;
    const r = await listarMensagens(aberta, mensagens[0].em);
    if (!r.ok) return setErro(r.erro);
    setMensagens((ms) => juntar(r.data.mensagens, ms));
    setMaisAntigas(r.data.maisAntigas);
    // Mantém na tela a mensagem que estava no topo
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - antesAltura; });
  }

  async function enviar() {
    if (!aberta || !texto.trim() || enviando) return;
    setEnviando(true);
    setErro("");
    const r = await enviarMensagem(aberta, texto);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setTexto("");
    noFim.current = true;
    setMensagens((ms) => juntar(ms, [r.data]));
    setConversas((cs) => {
      const c = cs.find((x) => x.jid === aberta);
      if (!c) return cs;
      const nova = { ...c, ultima_em: r.data.em, ultima_previa: r.data.texto, ultima_de_mim: true, nao_lidas: 0 };
      return [nova, ...cs.filter((x) => x.jid !== aberta)];
    });
    caixa.current?.focus();
  }

  function teclas(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // No computador, Enter envia e Shift+Enter pula linha. No celular, Enter pula linha e o botão envia.
    const toque = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !toque && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  }

  async function criarNoCrm() {
    if (!atual) return;
    const r = await criarContatoDaConversa(atual.jid);
    if (!r.ok) return setErro(r.erro);
    const apelido = atual.nome.trim().split(/\s+/)[0] || "WhatsApp";
    setContatos((xs) => (xs.some((x) => x.id === r.data.contato_id) ? xs : [{ id: r.data.contato_id, apelido }, ...xs]));
    setConversas((cs) => cs.map((c) => (c.jid === atual.jid ? { ...c, contato_id: r.data.contato_id } : c)));
  }

  async function ligar(contato_id: string) {
    if (!atual || !contato_id) return;
    const r = await vincularContato(atual.jid, contato_id);
    if (!r.ok) return setErro(r.erro);
    setConversas((cs) => cs.map((c) => (c.jid === atual.jid ? { ...c, contato_id } : c)));
  }

  async function desligar() {
    if (!atual) return;
    const r = await vincularContato(atual.jid, null);
    if (!r.ok) return setErro(r.erro);
    setConversas((cs) => cs.map((c) => (c.jid === atual.jid ? { ...c, contato_id: null } : c)));
  }

  const revelar = (id: string) => setReveladas((s) => new Set(s).add(id));

  function midia(m: Mensagem) {
    const src = `/api/whatsapp/midia/${encodeURIComponent(m.id)}`;
    if (m.tipo === "audio") return <audio controls preload="none" src={src} className="h-10 w-[240px] max-w-full" aria-label="Áudio" />;
    if (m.tipo === "documento") {
      return (
        <a href={src} className={`inline-flex items-center gap-2 font-medium underline underline-offset-2 ${m.de_mim ? "text-white" : "text-ink"}`}>
          📄 {m.midia_nome || "Documento"}
        </a>
      );
    }
    if (m.tipo === "imagem" || m.tipo === "figurinha" || m.tipo === "video") {
      const rotulo = m.tipo === "video" ? "🎬 Vídeo" : m.tipo === "figurinha" ? "Figurinha" : "📷 Foto";
      if (!reveladas.has(m.id)) {
        return (
          <button type="button" onClick={() => revelar(m.id)}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-[13px] font-semibold ${m.de_mim ? "bg-white/15 hover:bg-white/25" : "bg-bg hover:bg-line-soft"}`}>
            {rotulo} · Ver
          </button>
        );
      }
      return m.tipo === "video"
        ? <video controls preload="metadata" src={src} className="max-h-[360px] w-full max-w-[320px] rounded-lg bg-ink" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={src} alt={m.texto || rotulo} className={`${m.tipo === "figurinha" ? "w-32" : "max-h-[360px] w-full max-w-[320px]"} rounded-lg object-contain`} />;
    }
    if (m.tipo === "localizacao") return <span className="font-medium">📍 Localização</span>;
    if (m.tipo === "contato") return <span className="font-medium">👤 Contato</span>;
    if (m.tipo === "outro" && !m.texto) return <span className="italic opacity-80">Mensagem que o sistema ainda não mostra. Veja no celular.</span>;
    return null;
  }

  function textoComLinks(t: string, deMim: boolean) {
    return t.split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
      /^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className={`break-all underline underline-offset-2 ${deMim ? "text-white" : "text-red"}`}>{p}</a>
        : <span key={i}>{p}</span>,
    );
  }

  const faixaEstado = !conectado && (
    <p role="status" className="rounded-lg bg-red-soft px-3.5 py-2.5 text-[13px] text-red-deep">
      {estado === "indisponivel" ? "A Evolution não respondeu agora. " : "O WhatsApp do Playroom não está conectado. "}
      Dá para ler o que já chegou, mas não dá para enviar. <Link href="/admin/integracoes" className="font-semibold underline">Conectar em Integrações</Link>
    </p>
  );

  return (
    <main className="mx-auto flex h-[calc(100dvh-60px)] max-w-[1280px] flex-col gap-4 px-4 pb-4 pt-4 md:h-screen md:gap-5 md:px-8 md:pb-6 md:pt-8">
      <header className={`${aberta ? "hidden md:flex" : "flex"} flex-wrap items-end justify-between gap-3 border-b-2 border-red pb-4`}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red">Conversas</p>
          <h1 className="text-balance text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Quem está <span className="text-red">chamando</span>
          </h1>
        </div>
        <span className={`selo ${conectado ? "bg-ink text-white" : "bg-red text-white"}`}>
          {conectado ? `WhatsApp conectado${numero ? ` · ${telefoneBonito(numero)}` : ""}` : "WhatsApp desconectado"}
        </span>
      </header>

      {!aberta && faixaEstado}
      {aviso && <p role="status" className="text-[13px] text-muted">{aviso}</p>}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-line-soft bg-paper shadow-[0_1px_2px_rgba(13,10,10,0.05)]">
        {/* Lista */}
        <section aria-label="Lista de conversas" className={`${aberta ? "hidden md:flex" : "flex"} min-h-0 w-full flex-col border-line-soft md:w-[340px] md:shrink-0 md:border-r`}>
          <div className="border-b border-line-soft p-3">
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, número ou mensagem"
              aria-label="Buscar conversa" className="caixa" />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {conversas.length === 0 && (
              <li className="flex flex-col gap-1.5 p-5 text-[14px] text-muted">
                <strong className="text-ink">Nenhuma conversa ainda.</strong>
                {conectado ? "Assim que alguém mandar mensagem para o WhatsApp do Playroom, ela aparece aqui." : "Conecte o WhatsApp em Admin › Integrações para as conversas começarem a chegar."}
              </li>
            )}
            {conversas.length > 0 && lista.length === 0 && <li className="p-5 text-[14px] text-muted">Nada encontrado.</li>}
            {lista.map((c) => {
              const on = c.jid === aberta;
              const nome = nomeDe(c);
              return (
                <li key={c.jid}>
                  <button type="button" onClick={() => abrir(c.jid)} aria-current={on ? "true" : undefined}
                    className={`flex w-full items-center gap-3 border-b border-line-soft px-3.5 py-3 text-left transition-colors ${on ? "bg-bg" : "hover:bg-bg/60"}`}>
                    <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${c.nao_lidas ? "bg-red text-white" : "bg-ink text-white"}`}>
                      {iniciais(nome)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <strong className={`truncate text-[15px] ${c.nao_lidas ? "font-semibold" : "font-medium"}`}>{nome}</strong>
                        <span className={`shrink-0 text-[12px] ${c.nao_lidas ? "font-semibold text-red" : "text-apagado"}`}>{quandoCurto(c.ultima_em)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] ${c.nao_lidas ? "text-ink" : "text-muted"}`}>
                          {c.ultima_de_mim && "Você: "}{c.ultima_previa || " "}
                        </span>
                        {c.nao_lidas > 0 && (
                          <span aria-label={`${c.nao_lidas} não lidas`} className="min-w-[22px] shrink-0 rounded-full bg-red px-1.5 py-0.5 text-center text-[12px] font-semibold text-white">
                            {c.nao_lidas}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Conversa aberta */}
        <section aria-label={atual ? `Conversa com ${nomeDe(atual)}` : "Conversa"} className={`${aberta ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col bg-bg/50`}>
          {!atual ? (
            <div className="m-auto max-w-xs p-6 text-center text-[14px] text-muted">Escolha uma conversa na lista para ler e responder.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft bg-paper px-3 py-2.5 md:px-5">
                <button type="button" onClick={fechar} className="btn-3 -ml-1 px-2 md:hidden" aria-label="Voltar para a lista">←</button>
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{iniciais(nomeDe(atual))}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-[15px]">{nomeDe(atual)}</strong>
                  {atual.nome && atual.telefone && <span className="whitespace-nowrap text-[12px] text-muted">{telefoneBonito(atual.telefone)}</span>}
                </div>
                {/* No celular, as ações do CRM descem para a linha de baixo para o nome caber */}
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                  {atual.contato_id ? (
                    <>
                      <Link href={`/crm?c=${atual.contato_id}`} className="btn-2 min-h-[36px] px-3 text-[13px]">
                        CRM: {contatos.find((x) => x.id === atual.contato_id)?.apelido || "abrir"}
                      </Link>
                      <button type="button" onClick={desligar} className="btn-3 min-h-[36px] text-[13px]">Desligar</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={criarNoCrm} className="btn-2 min-h-[36px] px-3 text-[13px]">Criar no CRM</button>
                      {contatos.length > 0 && (
                        <select aria-label="Ligar a um contato do CRM" value="" onChange={(e) => ligar(e.target.value)}
                          className="caixa min-h-[36px] w-auto max-w-[200px] py-0 text-[13px] md:text-[13px]">
                          <option value="">ou ligar a contato…</option>
                          {contatos.map((x) => <option key={x.id} value={x.id}>{x.apelido || "sem apelido"}</option>)}
                        </select>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div ref={rolagem} onScroll={(e) => {
                const el = e.currentTarget;
                noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4 md:px-6" aria-live="polite">
                {maisAntigas && (
                  <button type="button" onClick={carregarAnteriores} className="pilula mx-auto mb-2">Carregar mensagens anteriores</button>
                )}
                {carregando && <p className="m-auto text-[13px] text-muted">Carregando…</p>}
                {!carregando && mensagens.length === 0 && <p className="m-auto text-[13px] text-muted">Nenhuma mensagem guardada nesta conversa.</p>}
                {mensagens.map((m, i) => {
                  const dia = diaDe(m.em);
                  const novoDia = i === 0 || diaDe(mensagens[i - 1].em) !== dia;
                  const quem = m.de_mim && m.enviada_por ? nomePessoa.get(m.enviada_por) : null;
                  return (
                    <div key={m.id} className="flex flex-col">
                      {novoDia && (
                        <span className="mx-auto my-2 rounded-full bg-paper px-3 py-1 text-[12px] font-semibold text-muted shadow-[0_1px_2px_rgba(13,10,10,0.06)]">{rotuloDia(dia)}</span>
                      )}
                      <div className={`flex max-w-[85%] flex-col gap-1.5 rounded-2xl px-3.5 py-2 text-[15px] leading-snug md:max-w-[70%] ${
                        m.de_mim ? "self-end rounded-br-md bg-ink text-white" : "self-start rounded-bl-md border border-line-soft bg-paper"}`}>
                        {midia(m)}
                        {m.texto && <p className="whitespace-pre-wrap break-words">{textoComLinks(m.texto, m.de_mim)}</p>}
                        <span className={`flex items-center justify-end gap-1.5 text-[11px] ${m.de_mim ? "text-side-text" : "text-apagado"}`}>
                          {quem && <span>{quem} ·</span>}
                          {hora(m.em)}
                          {m.de_mim && m.status && (
                            <span className={m.status === "lida" ? "font-semibold text-red-vivo" : m.status === "erro" ? "font-semibold text-red-vivo" : ""}>
                              · {STATUS_TXT[m.status]}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); void enviar(); }}
                className="flex flex-col gap-2 border-t border-line-soft bg-paper px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-5">
                {!conectado && faixaEstado}
                {erro && <p role="alert" className="text-[13px] font-medium text-red">{erro}</p>}
                <div className="flex items-end gap-2">
                  <textarea ref={caixa} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={teclas}
                    rows={Math.min(6, Math.max(1, texto.split("\n").length))} maxLength={4000}
                    placeholder={conectado ? "Escreva a mensagem" : "WhatsApp desconectado"} disabled={!conectado}
                    aria-label="Mensagem" className="caixa resize-none py-2.5 leading-snug" />
                  <button type="submit" disabled={!conectado || enviando || !texto.trim()} className="btn-1">
                    {enviando ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
