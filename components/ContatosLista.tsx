"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { etapasDo, nomeIngressos, type Contato } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import CrmAbas from "./CrmAbas";
import Tipo from "./Tipo";

type Filtro = "todos" | "sessao" | "aluguel" | "evento";

/** Mesma pessoa em várias linhas do CRM (uma sessão, dois eventos...) vira um contato só: pelo telefone, senão pelo e-mail. */
function chave(c: Contato) {
  const d = c.contato.replace(/\D/g, "");
  if (d.length >= 8) return `t:${d.slice(-11)}`;
  if (c.email.trim()) return `e:${c.email.trim().toLowerCase()}`;
  return `i:${c.id}`;
}

type Pessoa = { chave: string; nome: string; contato: string; email: string; pronome: string; origem: string; ultimo: string; itens: Contato[] };

function agrupar(cs: Contato[]): Pessoa[] {
  const mapa = new Map<string, Contato[]>();
  for (const c of cs) mapa.set(chave(c), [...(mapa.get(chave(c)) ?? []), c]);
  return Array.from(mapa, ([k, itens]) => {
    const ord = [...itens].sort((a, b) => b.created_at.localeCompare(a.created_at)); // mais recente primeiro
    const primeiro = (f: (c: Contato) => string) => ord.map(f).find((x) => x.trim()) ?? "";
    return {
      chave: k, itens: ord, ultimo: ord[0].created_at,
      nome: primeiro((c) => c.apelido), contato: primeiro((c) => c.contato), email: primeiro((c) => c.email),
      pronome: primeiro((c) => c.pronome), origem: ord[ord.length - 1].origem,
    };
  }).sort((a, b) => b.ultimo.localeCompare(a.ultimo));
}

const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });

export default function ContatosLista({ contatos, eventos }: { contatos: Contato[]; eventos: Record<string, string> }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const pessoas = useMemo(() => agrupar(contatos), [contatos]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return pessoas.filter((p) => (filtro === "todos" || p.itens.some((c) => c.tipo === filtro))
      && (!q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
        || (qd.length >= 3 && p.contato.replace(/\D/g, "").includes(qd)) || p.contato.toLowerCase().includes(q)));
  }, [pessoas, filtro, busca]);

  const rotuloItem = (c: Contato) => {
    const etapa = etapasDo(c.tipo).find((e) => e.k === c.etapa)?.t ?? c.etapa;
    const onde = c.tipo === "evento" ? (c.evento_id ? eventos[c.evento_id] ?? "Evento" : "Evento sem data") : "";
    return [onde, etapa, c.tipo === "evento" ? nomeIngressos(c.ingressos) : ""].filter(Boolean).join(" · ");
  };

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · CRM" titulo={<>Todos os <span className="text-red">contatos</span></>}
        texto="Cada pessoa aparece uma vez, juntando sessões, aluguéis e eventos pelo telefone ou e-mail." />
      <CrmAbas atual="contatos" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por tipo" className="segmento">
          {([["todos", "Todos"], ["sessao", "Sessões"], ["aluguel", "Aluguéis"], ["evento", "Eventos"]] as const).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, telefone ou e-mail"
          aria-label="Buscar nome, telefone ou e-mail" className="caixa basis-full sm:w-72 sm:basis-auto" />
      </div>

      <p className="text-[13px] text-muted">{visiveis.length} {visiveis.length === 1 ? "contato" : "contatos"}</p>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-line p-6 text-center text-[13px] text-muted">
          {pessoas.length ? "Nenhum contato com esse filtro." : "Nenhum contato ainda. Eles entram pelo pipeline, pelas aplicações e pelos formulários de evento."}
        </p>
      ) : (
        <>
          {/* Computador: lista em tabela */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line-soft bg-paper md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-soft text-muted">
                  {["Nome", "Telefone", "E-mail", "Origem", "Desde", "No CRM"].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.chave} className="border-b border-line-soft align-top last:border-0 hover:bg-[#faf8f7]">
                    <td className="px-4 py-3">
                      <span className="block text-[14px] font-medium">{p.nome || "sem nome"}</span>
                      {p.pronome && <span className="block text-[12px] text-muted">{p.pronome}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{p.contato || <span className="text-muted">sem telefone</span>}</td>
                    <td className="max-w-[220px] break-words px-4 py-3">{p.email || <span className="text-muted">sem e-mail</span>}</td>
                    <td className="px-4 py-3">{p.origem || <span className="text-muted">sem origem</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{dia(p.itens[p.itens.length - 1].created_at)}</td>
                    <td className="px-4 py-3">
                      <ul className="flex flex-col items-start gap-1">
                        {p.itens.map((c) => (
                          <li key={c.id}>
                            <Link href={`/crm?c=${c.id}`} className="flex items-center gap-2 rounded-full border-[1.5px] border-line bg-paper py-0.5 pl-1 pr-3 text-[12px] font-medium hover:border-ink">
                              <Tipo tipo={c.tipo} />
                              {rotuloItem(c)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: um cartão por pessoa */}
          <ul className="flex flex-col gap-2 md:hidden">
            {visiveis.map((p) => (
              <li key={p.chave} className="cartao flex flex-col gap-3 !p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{p.nome || "sem nome"}{p.pronome && <span className="ml-2 text-[13px] font-normal text-muted">{p.pronome}</span>}</span>
                  <span className="break-words text-[13px] text-muted">
                    {[p.contato, p.email].filter(Boolean).join(" · ") || "sem contato"}
                  </span>
                  <span className="text-[12px] text-muted">Origem: {p.origem || "sem origem"} · desde {dia(p.itens[p.itens.length - 1].created_at)}</span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {p.itens.map((c) => (
                    <li key={c.id}>
                      <Link href={`/crm?c=${c.id}`} className="flex min-h-[36px] items-center gap-2 rounded-full border-[1.5px] border-line bg-paper py-1 pl-1 pr-3 text-[12px] font-medium hover:border-ink">
                        <Tipo tipo={c.tipo} />
                        {rotuloItem(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
