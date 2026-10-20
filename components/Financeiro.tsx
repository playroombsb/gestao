"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adicionarLancamento, removerLancamento } from "@/app/actions-gestao";
import { brl, parseNum } from "@/lib/calc";
import { hoje } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import type { Lancamento } from "@/lib/types";
import Cabecalho, { BOTAO, PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

const CUSTOS = ["Aluguel do imóvel", "Contas", "Faxina", "Materiais", "Marketing", "Ferramentas", "Impostos", "Equipe", "Outros"];
const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";
const CAMPO = "w-full min-w-0 border-0 border-b-[1.5px] border-line-soft bg-transparent px-0.5 py-1.5 text-[15px] outline-none focus:border-red";

function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function proximoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** Recorrente aparece no mês com o mesmo dia da data original. */
const diaNoMes = (l: Lancamento, mes: string) => (l.recorrente && !l.data.startsWith(mes) ? `${mes}-${l.data.slice(8)}` : l.data);

function Barras({ titulo, itens, cor }: { titulo: string; itens: [string, number][]; cor: string }) {
  const max = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <section aria-label={titulo} className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 border border-line bg-paper p-5 md:p-6">
      <h2 className="text-[20px] font-bold tracking-tight">{titulo}</h2>
      {itens.length === 0 && <p className="text-sm text-muted">Nada lançado neste mês.</p>}
      {itens.map(([nome, v]) => (
        <div key={nome} className="flex items-center gap-2.5 text-[13px]">
          <span className="w-[120px] shrink-0 truncate" title={nome}>{nome}</span>
          <div className="h-2.5 flex-1 bg-bg"><div className={`h-2.5 ${cor}`} style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="w-[86px] shrink-0 text-right font-bold tabular-nums">{brl(v)}</span>
        </div>
      ))}
    </section>
  );
}

export default function Financeiro({ mes, anterior, inicial, receitaAnterior, produtos }: {
  mes: string; anterior: string; inicial: Lancamento[]; receitaAnterior: number | null; produtos: string[];
}) {
  const [itens, setItens] = useState(inicial);
  const [filtro, setFiltro] = useState<"todos" | "receita" | "custo">("todos");
  const [armado, setArmado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Aqui não há edição com espera; o hook serve só para o "Salvando… / Salvo".
  const { status, rodar } = useAutosave<object>(async () => ({ ok: true }));

  const dataPadrao = hoje().startsWith(mes) ? hoje() : `${mes}-01`;
  const vazio = { tipo: "receita" as "receita" | "custo", data: dataPadrao, descricao: "", categoria: "", valor: "", recorrente: false };
  const [form, setForm] = useState(vazio);

  const calc = useMemo(() => {
    const rec = itens.filter((l) => l.tipo === "receita");
    const cus = itens.filter((l) => l.tipo === "custo");
    const soma = (xs: Lancamento[]) => xs.reduce((s, l) => s + l.valor, 0);
    const agrupar = (xs: Lancamento[]) => Object.entries(xs.reduce<Record<string, number>>((m, l) => {
      const k = l.categoria || "Sem categoria";
      m[k] = (m[k] ?? 0) + l.valor;
      return m;
    }, {})).sort((a, b) => b[1] - a[1]);
    const receitas = soma(rec);
    const custos = soma(cus);
    return {
      receitas, custos, resultado: receitas - custos,
      fixos: soma(cus.filter((l) => l.recorrente)), variaveis: soma(cus.filter((l) => !l.recorrente)),
      porOrigem: agrupar(rec), porCategoria: agrupar(cus),
    };
  }, [itens]);

  const categorias = form.tipo === "receita"
    ? [...new Set(["Sessões", "Aluguéis", ...produtos, ...itens.filter((l) => l.tipo === "receita").map((l) => l.categoria)])]
    : [...new Set([...CUSTOS, ...itens.filter((l) => l.tipo === "custo").map((l) => l.categoria)])];

  async function salvarNovo(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const valor = parseNum(form.valor) ?? 0;
    if (valor <= 0) return setAviso("Informe um valor maior que zero.");
    const r = await rodar(() => adicionarLancamento({ ...form, valor }));
    if (!r.ok) return;
    if (r.data.data.startsWith(mes) || (r.data.recorrente && r.data.data < proximoMes(mes))) setItens((xs) => [r.data, ...xs]);
    else setAviso(`Salvo em ${r.data.data.split("-").reverse().join("/")}, fora deste mês.`);
    setForm({ ...vazio, tipo: form.tipo });
  }

  async function apagar(l: Lancamento) {
    if (armado !== l.id) {
      setArmado(l.id);
      setTimeout(() => setArmado((a) => (a === l.id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    const r = await rodar(() => removerLancamento(l.id));
    if (r.ok) setItens((xs) => xs.filter((x) => x.id !== l.id));
  }

  const variacao = receitaAnterior ? Math.round(((calc.receitas - receitaAnterior) / receitaAnterior) * 100) : null;
  const lista = itens.filter((l) => filtro === "todos" || l.tipo === filtro)
    .sort((a, b) => diaNoMes(b, mes).localeCompare(diaNoMes(a, mes)));

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · Financeiro" titulo={<>Custos e <span className="text-red">receitas</span></>}
        acoes={
          <nav aria-label="Mês" className="flex items-center border-[1.5px] border-ink bg-paper">
            <Link href={`/financeiro?mes=${anterior}`} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center text-lg font-bold hover:bg-bg">‹</Link>
            <span className="min-w-[150px] px-2 text-center text-[14px] font-bold">{nomeMes(mes)}</span>
            <Link href={`/financeiro?mes=${proximoMes(mes)}`} aria-label="Próximo mês" className="flex h-11 w-11 items-center justify-center text-lg font-bold hover:bg-bg">›</Link>
          </nav>
        } />

      <div className="flex flex-wrap gap-px border border-line bg-line">
        <div className="flex flex-[1_1_200px] flex-col gap-1 bg-paper px-5 py-4">
          <span className={ROTULO}>Receitas</span>
          <span className="text-[28px] font-extrabold tabular-nums">{brl(calc.receitas)}</span>
          <span className="text-[12px] text-muted">{variacao == null ? "sem mês anterior para comparar" : `${variacao >= 0 ? "+" : ""}${variacao}% vs mês anterior`}</span>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-1 bg-paper px-5 py-4">
          <span className={ROTULO}>Custos</span>
          <span className="text-[28px] font-extrabold tabular-nums">{brl(calc.custos)}</span>
          <span className="text-[12px] text-muted">fixos {brl(calc.fixos)} · variáveis {brl(calc.variaveis)}</span>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-1 bg-ink px-5 py-4 text-white">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-side-text">Resultado</span>
          <span className="text-[28px] font-extrabold tabular-nums">{brl(calc.resultado)}</span>
          <span className="text-[12px] font-bold text-red-vivo">
            {calc.receitas ? `margem ${Math.round((calc.resultado / calc.receitas) * 100)}%` : "sem receita no mês"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <Barras titulo="Receitas por origem" itens={calc.porOrigem} cor="bg-ink" />
        <Barras titulo="Custos por categoria" itens={calc.porCategoria} cor="bg-red" />
      </div>

      <form onSubmit={salvarNovo} aria-labelledby="t-novo" className="flex flex-col gap-4 border border-line border-t-4 border-t-red bg-paper p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="t-novo" className="text-[20px] font-bold tracking-tight">Novo lançamento</h2>
          <StatusSalvo status={status} />
        </div>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <div role="group" aria-label="Tipo" className="flex border-[1.5px] border-ink">
            {(["receita", "custo"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={form.tipo === t} onClick={() => setForm({ ...form, tipo: t, categoria: "" })}
                className={`min-h-[44px] px-4 text-[13px] font-bold ${form.tipo === t ? "bg-ink text-white" : "hover:bg-bg"}`}>
                {t === "receita" ? "Receita" : "Custo"}
              </button>
            ))}
          </div>
          <label className="flex flex-[0_1_160px] flex-col gap-1">
            <span className={ROTULO}>Data</span>
            <input type="date" required className={CAMPO} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          <label className="flex flex-[2_1_220px] flex-col gap-1">
            <span className={ROTULO}>Descrição</span>
            <input className={CAMPO} value={form.descricao} placeholder={form.tipo === "receita" ? "ex: workshop de spanking" : "ex: conta de luz"}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_180px] flex-col gap-1">
            <span className={ROTULO}>Categoria</span>
            <input list="categorias" className={CAMPO} value={form.categoria} placeholder="escolha ou escreva"
              onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="flex flex-[0_1_140px] flex-col gap-1">
            <span className={ROTULO}>Valor (R$)</span>
            <input inputMode="decimal" required className={`${CAMPO} text-right font-bold`} value={form.valor} placeholder="0"
              onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
              className="h-[18px] w-[18px] accent-ink" />
            Repete todo mês
          </label>
          <button type="submit" className={BOTAO}>Salvar</button>
        </div>
        {aviso && <p role="status" className="text-sm font-semibold text-red">{aviso}</p>}
        <p className="text-[12px] text-muted">Custos que repetem todo mês contam como fixos. Atendimentos realizados no CRM entram aqui sozinhos.</p>
      </form>

      <section aria-labelledby="t-lanc" className="flex flex-col gap-3 border border-line bg-paper p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-lanc" className="text-[20px] font-bold tracking-tight">Lançamentos do mês</h2>
          <div role="group" aria-label="Filtrar" className="flex gap-1.5">
            {([["todos", "Todos"], ["receita", "Receitas"], ["custo", "Custos"]] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}
                className={`min-h-[36px] border-[1.5px] px-3 text-[12px] font-bold ${filtro === k ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>{t}</button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <p className="border-[1.5px] border-dashed border-line p-5 text-sm text-muted">Nenhum lançamento.</p>
        ) : (
          <ul className="flex flex-col">
            {lista.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft py-3 last:border-0">
                <span className="w-12 text-sm tabular-nums text-muted">{diaNoMes(l, mes).slice(8)}/{mes.slice(5)}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold">
                  {l.descricao || l.categoria || "sem descrição"}
                  {l.recorrente && <span className="ml-2 text-[11px] font-semibold text-muted">· todo mês</span>}
                  {l.contato_id && <Link href={`/crm?c=${l.contato_id}`} className="ml-2 text-[11px] font-bold text-muted hover:text-red">· do CRM</Link>}
                </span>
                <span className="hidden w-40 truncate text-sm text-muted sm:block">{l.categoria}</span>
                <span className={`w-28 text-right text-sm font-bold tabular-nums ${l.tipo === "custo" ? "text-red" : ""}`}>
                  {l.tipo === "custo" ? "− " : "+ "}{brl(l.valor)}
                </span>
                {!l.contato_id && (
                  <button type="button" onClick={() => apagar(l)} aria-label={`Remover ${l.descricao || "lançamento"}`}
                    className={`h-9 border-[1.5px] ${armado === l.id ? "border-red bg-red px-2 text-[11px] font-bold text-white"
                      : "w-9 border-transparent text-lg text-muted hover:border-red hover:text-red"}`}>
                    {armado === l.id ? (l.recorrente ? "Remover de todos os meses?" : "Remover?") : "×"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
