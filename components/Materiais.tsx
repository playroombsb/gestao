"use client";

import { useMemo, useRef, useState } from "react";
import { criarMaterial, removerMaterial, salvarMaterial } from "@/app/actions-materiais";
import { ajustar } from "@/lib/ajustar";
import { useAutosave } from "@/lib/useAutosave";
import { TIPOS_MATERIAL, type Material, type MaterialPatch, type TipoMaterial } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

const COM_ARQUIVO: TipoMaterial[] = ["pdf", "modelo", "outro"];
const COM_TEXTO: TipoMaterial[] = ["conteudo", "prompt"];
const NOME_TIPO = Object.fromEntries(TIPOS_MATERIAL.map((t) => [t.k, t.t])) as Record<TipoMaterial, string>;
const COR_TIPO: Record<TipoMaterial, string> = {
  pdf: "bg-red text-white",
  conteudo: "bg-ink text-white",
  prompt: "bg-[#fdeee2] text-[#a34a0c]",
  modelo: "bg-red-soft text-red-deep",
  link: "bg-[#e6e3e2] text-ink",
  outro: "bg-[#efeceb] text-muted",
};

const tamanho = (b: number | null) =>
  b == null ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

export default function Materiais({ inicial }: { inicial: Material[] }) {
  const [itens, setItens] = useState(inicial);
  const [secao, setSecao] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(inicial.length === 0);
  const [tipo, setTipo] = useState<TipoMaterial>("pdf");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [armado, setArmado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<MaterialPatch>(salvarMaterial);

  const secoes = useMemo(() => [...new Set(itens.map((m) => m.secao))].sort((a, b) => a.localeCompare(b, "pt-BR")), [itens]);
  const q = busca.trim().toLowerCase();
  const visiveis = itens.filter((m) => (secao === "todas" || m.secao === secao)
    && (!q || `${m.titulo} ${m.descricao} ${m.conteudo}`.toLowerCase().includes(q)));
  const grupos = secoes.map((s) => [s, visiveis.filter((m) => m.secao === s)] as const).filter(([, xs]) => xs.length);

  function alterar(id: string, patch: MaterialPatch) {
    setItens((xs) => xs.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    agendar(id, patch);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    const r = await rodar(() => criarMaterial(fd));
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setItens((xs) => [...xs, r.data]);
    form.current?.reset();
    setNovo(false);
    setSecao(r.data.secao);
  }

  async function apagar(m: Material) {
    if (armado !== m.id) {
      setArmado(m.id);
      setTimeout(() => setArmado((a) => (a === m.id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    esquecer(m.id);
    setItens((xs) => xs.filter((x) => x.id !== m.id));
    await rodar(() => removerMaterial(m.id));
  }

  async function copiar(m: Material) {
    try { await navigator.clipboard.writeText(m.conteudo); setCopiado(m.id); }
    catch { setCopiado(null); }
    setTimeout(() => setCopiado((c) => (c === m.id ? null : c)), 2000);
  }

  function cartao(m: Material) {
    return (
      <article key={m.id} className="cartao flex flex-col gap-3 !p-5 focus-within:ring-2 focus-within:ring-red/50">
        <div className="flex items-start justify-between gap-2">
          <span className={`selo ${COR_TIPO[m.tipo]}`}>{NOME_TIPO[m.tipo]}</span>
          <button type="button" onClick={() => apagar(m)} aria-label={`Remover ${m.titulo}`}
            className={armado === m.id ? "rounded-full bg-red px-3 py-1 text-[12px] font-bold text-white" : "btn-icone -mr-2 -mt-1.5 text-lg"}>
            {armado === m.id ? "Remover?" : "×"}
          </button>
        </div>
        <input className="campo font-bold md:!text-[16px]" value={m.titulo} aria-label={`Título de ${m.titulo}`}
          onChange={(e) => alterar(m.id, { titulo: e.target.value })} />
        <textarea ref={ajustar} rows={1} value={m.descricao} placeholder="Descrição" aria-label={`Descrição de ${m.titulo}`}
          className="campo resize-none overflow-hidden leading-relaxed text-ink/80"
          onChange={(e) => { ajustar(e.target); alterar(m.id, { descricao: e.target.value }); }} />
        {COM_TEXTO.includes(m.tipo) && (
          <details className="group rounded-xl bg-bg px-3 py-2">
            <summary className="flex min-h-[36px] cursor-pointer items-center text-[13px] font-bold toque:min-h-[44px]">Ver e editar o texto</summary>
            <textarea ref={ajustar} rows={4} value={m.conteudo} aria-label={`Texto de ${m.titulo}`}
              className="campo mt-1 resize-none overflow-hidden whitespace-pre-wrap font-mono leading-relaxed md:!text-[13px]"
              onChange={(e) => { ajustar(e.target); alterar(m.id, { conteudo: e.target.value }); }} />
          </details>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {m.arquivo_nome && (
            <a href={`/api/materiais/${m.id}`} className="btn-1">Baixar {NOME_TIPO[m.tipo] === "PDF" ? "PDF" : "arquivo"} · {tamanho(m.arquivo_tamanho)}</a>
          )}
          {COM_TEXTO.includes(m.tipo) && m.conteudo && (
            <button type="button" onClick={() => copiar(m)} className="btn-2">{copiado === m.id ? "Copiado" : "Copiar texto"}</button>
          )}
          {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="btn-2">Abrir link</a>}
        </div>
      </article>
    );
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Materiais de apoio" titulo={<>Para estudar e <span className="text-red">usar</span></>}
        texto="PDFs, conteúdos, prompts e modelos, separados por seção. Só quem tem login baixa."
        acoes={<>
          <StatusSalvo status={status} />
          <button type="button" className={novo ? "btn-2" : "btn-1"} onClick={() => setNovo((n) => !n)} aria-expanded={novo}>
            {novo ? "Fechar" : "+ Novo material"}
          </button>
        </>} />

      {novo && (
        <form ref={form} onSubmit={enviar} aria-labelledby="t-novo" className="cartao flex flex-col gap-4">
          <h2 id="t-novo" className="titulo-secao">Novo material</h2>
          <div role="group" aria-label="Tipo" className="flex flex-wrap gap-2">
            {TIPOS_MATERIAL.map((t) => (
              <button key={t.k} type="button" aria-pressed={tipo === t.k} onClick={() => setTipo(t.k)} className="pilula">{t.t}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="rotulo">Seção</span>
              <input name="secao" list="secoes" required className="caixa" placeholder="ex: Estudos - BDSM" />
              <datalist id="secoes">{secoes.map((s) => <option key={s} value={s} />)}</datalist>
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Título</span>
              <input name="titulo" required className="caixa" placeholder="ex: Jogos Mentais" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Descrição</span>
            <textarea name="descricao" rows={2} className="caixa resize-y py-2.5" placeholder="Para que serve, quando usar" />
          </label>
          {COM_ARQUIVO.includes(tipo) && (
            <label className="flex flex-col gap-1">
              <span className="rotulo">Arquivo{tipo === "pdf" ? " PDF" : ""} (até 50 MB)</span>
              <input name="arquivo" type="file" required={tipo === "pdf"} accept={tipo === "pdf" ? "application/pdf" : undefined}
                className="caixa py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[13px] file:font-bold file:text-white" />
            </label>
          )}
          {COM_TEXTO.includes(tipo) && (
            <label className="flex flex-col gap-1">
              <span className="rotulo">{tipo === "prompt" ? "Prompt" : "Texto"}</span>
              <textarea name="conteudo" rows={6} required className="caixa resize-y py-2.5 font-mono md:!text-[13px]" />
            </label>
          )}
          {(tipo === "link" || tipo === "modelo") && (
            <label className="flex flex-col gap-1">
              <span className="rotulo">Link{tipo === "modelo" ? " (opcional, ex: Canva, Google Docs)" : ""}</span>
              <input name="link" type="url" required={tipo === "link"} className="caixa" placeholder="https://" />
            </label>
          )}
          {erro && <p role="alert" className="text-[14px] font-semibold text-red">{erro}</p>}
          <div><button type="submit" disabled={enviando} className="btn-1">{enviando ? "Enviando…" : "Salvar material"}</button></div>
        </form>
      )}

      {itens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filtrar por seção" className="flex flex-wrap gap-2">
            {["todas", ...secoes].map((s) => (
              <button key={s} type="button" aria-pressed={secao === s} onClick={() => setSecao(s)} className="pilula">
                {s === "todas" ? "Todas" : s}
              </button>
            ))}
          </div>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar"
            aria-label="Buscar materiais" className="caixa basis-full sm:ml-auto sm:w-56 sm:basis-auto" />
        </div>
      )}

      {itens.length === 0 && !novo && (
        <p className="rounded-2xl border-[1.5px] border-dashed border-line p-6 text-[14px] text-muted">Nenhum material ainda. Use &ldquo;Novo material&rdquo;.</p>
      )}
      {itens.length > 0 && grupos.length === 0 && (
        <p className="rounded-2xl border-[1.5px] border-dashed border-line p-6 text-[14px] text-muted">Nada encontrado.</p>
      )}

      {grupos.map(([s, xs]) => (
        <section key={s} aria-labelledby={`sec-${s}`} className="flex flex-col gap-3">
          <h2 id={`sec-${s}`} className="titulo-secao">{s}</h2>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{xs.map(cartao)}</div>
        </section>
      ))}
    </main>
  );
}
