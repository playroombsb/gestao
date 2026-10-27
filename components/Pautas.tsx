"use client";

import { useState } from "react";
import { adicionarPauta, removerPauta, salvarPauta } from "@/app/actions-gestao";
import { useAutosave } from "@/lib/useAutosave";
import type { Pauta, PautaPatch } from "@/lib/types";
import StatusSalvo from "./StatusSalvo";

const FORMATOS = ["Reels", "Carrossel", "Stories", "Foto", "Live", "E-mail", "Blog"];
const FUNIL = ["Topo", "Meio", "Fundo"];
const STATUS = ["Ideia", "Roteiro", "Produção", "Agendado", "Publicado"];

const COR_STATUS: Record<string, string> = {
  Ideia: "border-dashed border-line text-muted",
  Roteiro: "border-ink",
  Produção: "border-ink",
  Agendado: "border-red-soft bg-red-soft text-red-deep",
  Publicado: "border-ink bg-ink text-white",
};


export default function Pautas({ inicial }: { inicial: Pauta[] }) {
  const [pautas, setPautas] = useState(inicial);
  const [filtro, setFiltro] = useState("Todas");
  const [armado, setArmado] = useState<string | null>(null);
  const { status, rodar, agendar, esquecer } = useAutosave<PautaPatch>(salvarPauta);

  function alterar(id: string, patch: PautaPatch, imediato = false) {
    setPautas((xs) => xs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    agendar(id, patch, imediato);
  }

  async function nova() {
    const ordem = Math.max(0, ...pautas.map((p) => p.ordem)) + 1;
    const r = await rodar(() => adicionarPauta(ordem));
    if (!r.ok) return;
    setPautas((xs) => [...xs, r.data]);
    setFiltro("Todas");
    setTimeout(() => document.getElementById(`pauta-${r.data.id}`)?.focus(), 30);
  }

  async function apagar(id: string) {
    if (armado !== id) {
      setArmado(id);
      setTimeout(() => setArmado((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    esquecer(id);
    setPautas((xs) => xs.filter((p) => p.id !== id));
    await rodar(() => removerPauta(id));
  }

  const visiveis = filtro === "Todas" ? pautas : pautas.filter((p) => p.status === filtro);

  return (
    <section aria-labelledby="t-pautas" className="cartao flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="t-pautas" className="titulo-secao">Banco de pautas</h2>
        <div className="flex items-center gap-3">
          <StatusSalvo status={status} />
          <button type="button" onClick={nova}
            className="btn-1">
            + Nova pauta
          </button>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5">
        {["Todas", ...STATUS].map((s) => {
          const n = s === "Todas" ? pautas.length : pautas.filter((p) => p.status === s).length;
          return (
            <button key={s} type="button" aria-pressed={filtro === s} onClick={() => setFiltro(s)}
              className="pilula">
              {s} <span className="font-medium opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-line p-6 text-[14px] text-muted">
          {pautas.length ? "Nenhuma pauta com esse status." : "Nenhuma pauta ainda. Use “Nova pauta”."}
        </div>
      ) : (
        <ul className="flex flex-col">
          {visiveis.map((p) => (
            <li key={p.id} className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line-soft py-3 last:border-0 md:grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))_minmax(0,1.1fr)_36px] md:items-center">
              <input id={`pauta-${p.id}`} className="campo col-span-2 font-medium md:col-span-1" value={p.titulo}
                placeholder="Pauta" aria-label="Pauta" onChange={(e) => alterar(p.id, { titulo: e.target.value })} />
              <input className="campo" value={p.pilar} placeholder="Pilar" aria-label="Pilar"
                onChange={(e) => alterar(p.id, { pilar: e.target.value })} />
              <select className="campo" value={p.formato} aria-label="Formato" onChange={(e) => alterar(p.id, { formato: e.target.value }, true)}>
                {FORMATOS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select className="campo" value={p.funil} aria-label="Etapa do funil" onChange={(e) => alterar(p.id, { funil: e.target.value }, true)}>
                {FUNIL.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select value={p.status} aria-label="Status" onChange={(e) => alterar(p.id, { status: e.target.value }, true)}
                className={`min-h-[32px] w-full rounded-full border-[1.5px] px-2.5 text-base font-medium outline-none focus:outline-2 focus:outline-red md:text-[12px] toque:min-h-[40px] ${COR_STATUS[p.status] ?? "border-line"}`}>
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <input type="date" className="campo" value={p.data ?? ""} aria-label="Data de publicação"
                onChange={(e) => alterar(p.id, { data: e.target.value || null }, true)} />
              <button type="button" onClick={() => apagar(p.id)} aria-label={`Remover ${p.titulo || "pauta"}`}
                className={armado === p.id ? "rounded-full bg-red px-3 py-1 text-[12px] font-semibold text-white" : "btn-icone text-lg"}>
                {armado === p.id ? "Remover?" : "×"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
